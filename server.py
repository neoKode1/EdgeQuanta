"""
EdgeQuanta API Bridge Server
Run:  uvicorn server:app --reload --port 8080
"""
from dotenv import load_dotenv
load_dotenv()

import asyncio, json, time, uuid, os, sys, random, logging, re
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

logger = logging.getLogger("edgequanta")

# === Origin Quantum Cloud ===
_qcloud_service = None
_qcloud_backends_cache: Optional[dict] = None
_qcloud_cache_ts: float = 0

def _get_qcloud_service():
    """Lazy-init QCloudService with API key from .env."""
    global _qcloud_service
    if _qcloud_service is not None:
        return _qcloud_service
    api_key = os.getenv("ORIGIN_QUANTUM_API_KEY")
    if not api_key:
        return None
    try:
        from pyqpanda3.qcloud import QCloudService
        _qcloud_service = QCloudService(api_key=api_key)
        logger.info("QCloudService initialized successfully")
        return _qcloud_service
    except Exception as e:
        logger.warning(f"QCloudService init failed: {e}")
        return None

def _get_backends(force_refresh: bool = False) -> dict:
    """Return cached backend availability dict, refresh every 60s."""
    global _qcloud_backends_cache, _qcloud_cache_ts
    now = time.time()
    if not force_refresh and _qcloud_backends_cache and (now - _qcloud_cache_ts) < 60:
        return _qcloud_backends_cache
    svc = _get_qcloud_service()
    if not svc:
        return {}
    try:
        _qcloud_backends_cache = svc.backends()
        _qcloud_cache_ts = now
        return _qcloud_backends_cache
    except Exception as e:
        logger.warning(f"Failed to fetch backends: {e}")
        return _qcloud_backends_cache or {}

DIST_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")

SIM_DIR = os.path.join(os.path.dirname(__file__), "QPilotos-V4.0", "python_simulator")
sys.path.insert(0, SIM_DIR)
from config import QuantumSystemType, TaskStatus, ErrorCode, ServerConfig
from task_manager import TaskManager
from result_generator import generate_random_results_multiple
from chip_config_loader import ChipConfigLoader

task_managers: Dict[str, TaskManager] = {}
chip_loader: Optional[ChipConfigLoader] = None
ws_clients: List[WebSocket] = []
SYSTEMS = ["superconducting", "ion_trap", "neutral_atom", "photonic"]
DEFAULT_CHIPS = {"superconducting": "72", "ion_trap": "IonTrap", "neutral_atom": "HanYuan_01", "photonic": "PQPUMESH8"}
metrics = {"total": 0, "completed": 0, "failed": 0, "active": 0, "uptime_start": 0}
vip_slots: Dict[str, dict] = {}
api_keys: Dict[str, dict] = {}
job_history: List[dict] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global chip_loader
    chip_loader = ChipConfigLoader()
    for s in SYSTEMS:
        task_managers[s] = TaskManager(s)
    metrics["uptime_start"] = time.time()
    api_keys["eq-demo-key-001"] = {"name": "Demo Key", "tier": "standard", "created": time.time(), "quota": 1000, "used": 0}
    yield

app = FastAPI(title="EdgeQuanta API", version="1.0.0", lifespan=lifespan, docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

class JobSubmission(BaseModel):
    system_type: str = "superconducting"
    shots: int = 1000
    qubits: int = 5
    priority: int = 0

class ReservationReq(BaseModel):
    system_type: str = "superconducting"
    duration_minutes: int = 30
    reason: str = ""

async def _broadcast(event: dict):
    dead = []
    for ws in ws_clients:
        try: await ws.send_json(event)
        except Exception: dead.append(ws)
    for ws in dead: ws_clients.remove(ws)

@app.get("/api/health")
async def health():
    return {"status": "online", "uptime_seconds": round(time.time() - metrics["uptime_start"], 1), "systems": SYSTEMS, "version": "1.0.0", "metrics": metrics}

@app.get("/api/systems")
async def list_systems():
    out = []
    for s in SYSTEMS:
        chip_id = DEFAULT_CHIPS[s]
        cfg, labels = chip_loader.get_chip_config(chip_id) if chip_loader else ({}, [])
        out.append({"id": s, "chip_id": chip_id, "status": "online", "work_areas": labels, "queue_depth": len(task_managers[s].tasks)})
    return {"systems": out}

@app.get("/api/systems/{sid}/chip")
async def get_chip(sid: str):
    if sid not in DEFAULT_CHIPS: raise HTTPException(404, "Unknown system")
    chip_id = DEFAULT_CHIPS[sid]
    cfg, labels = chip_loader.get_chip_config(chip_id) if chip_loader else ({}, [])
    return {"chip_id": chip_id, "work_areas": labels, "config": cfg}


@app.post("/api/jobs")
async def submit_job(body: JobSubmission):
    if body.system_type not in SYSTEMS:
        raise HTTPException(400, f"Unknown system: {body.system_type}")
    task_id = f"eq-{uuid.uuid4().hex[:12]}"
    tm = task_managers[body.system_type]
    msg = {"configure": {"Shot": body.shots, "MeasureQubitNum": [body.qubits]}, "priority": body.priority}
    tm.add_task(task_id, "web-client", msg)
    metrics["total"] += 1
    metrics["active"] += 1
    rec = {"task_id": task_id, "system_type": body.system_type, "shots": body.shots,
           "qubits": body.qubits, "status": "queued", "submitted_at": time.time()}
    job_history.insert(0, rec)
    if len(job_history) > 200: job_history.pop()
    await _broadcast({"type": "job_submitted", "job": rec})
    asyncio.create_task(_run_job(task_id, body.system_type, rec))
    return rec

@app.get("/api/jobs")
async def list_jobs(limit: int = 50):
    return {"jobs": job_history[:limit]}

@app.get("/api/jobs/{task_id}")
async def get_job(task_id: str):
    for j in job_history:
        if j["task_id"] == task_id: return j
    raise HTTPException(404, "Job not found")

async def _run_job(task_id: str, system_type: str, rec: dict):
    tm = task_managers[system_type]
    try:
        for st in [TaskStatus.COMPILING, TaskStatus.COMPILED, TaskStatus.RUNNING]:
            await asyncio.sleep(random.uniform(0.4, 1.0))
            tm.update_task_status(task_id, st)
            rec["status"] = st.name.lower()
            await _broadcast({"type": "job_update", "task_id": task_id, "status": rec["status"]})
        await asyncio.sleep(random.uniform(0.5, 1.5))
        result = tm.process_task(task_id)
        rec["status"] = "completed"
        rec["result"] = result
        metrics["completed"] += 1
    except Exception as e:
        rec["status"] = "failed"
        rec["error"] = str(e)
        metrics["failed"] += 1
    finally:
        metrics["active"] = max(0, metrics["active"] - 1)
    rec["timing"] = tm.get_timing_info(task_id)
    await _broadcast({"type": "job_complete", "task_id": task_id, "record": rec})

@app.post("/api/reservations")
async def create_reservation(body: ReservationReq):
    if body.system_type not in SYSTEMS:
        raise HTTPException(400, "Unknown system")
    slot_id = f"res-{uuid.uuid4().hex[:8]}"
    slot = {"id": slot_id, "system_type": body.system_type,
            "duration_minutes": body.duration_minutes, "reason": body.reason,
            "status": "confirmed", "created_at": time.time(),
            "starts_at": time.time() + 60, "ends_at": time.time() + 60 + body.duration_minutes * 60}
    vip_slots[slot_id] = slot
    await _broadcast({"type": "reservation_created", "slot": slot})
    return slot

@app.get("/api/reservations")
async def list_reservations():
    return {"reservations": list(vip_slots.values())}

@app.get("/api/keys")
async def list_keys():
    return {"keys": [{"key": k, **v} for k, v in api_keys.items()]}

@app.post("/api/keys")
async def create_key(name: str = "New Key", tier: str = "standard"):
    key = f"eq-{uuid.uuid4().hex[:16]}"
    api_keys[key] = {"name": name, "tier": tier, "created": time.time(), "quota": 1000, "used": 0}
    return {"key": key, **api_keys[key]}

@app.get("/api/metrics")
async def get_metrics():
    sys_metrics = []
    for s in SYSTEMS:
        tm = task_managers[s]
        chip_id = DEFAULT_CHIPS[s]
        cfg, labels = chip_loader.get_chip_config(chip_id) if chip_loader else ({}, [])
        sys_metrics.append({"system": s, "chip_id": chip_id, "status": "online",
            "queue_depth": len(tm.tasks), "work_areas": len(labels),
            "fidelity": round(random.uniform(0.92, 0.998), 4),
            "calibration_age_min": round(random.uniform(2, 120), 1),
            "last_heartbeat": time.time() - random.uniform(0, 5)})
    return {"global": metrics, "systems": sys_metrics, "timestamp": time.time()}

# === Origin Quantum Cloud Backends ===
BACKEND_META = {
    "full_amplitude": {"type": "simulator", "max_qubits": 33},
    "single_amplitude": {"type": "simulator", "max_qubits": 200},
    "partial_amplitude": {"type": "simulator", "max_qubits": 64},
    "72": {"type": "chip", "max_qubits": 72},
    "WK_C102-2": {"type": "chip", "max_qubits": 102},
    "WK_C102_400": {"type": "chip", "max_qubits": 102},
    "WK_C180": {"type": "chip", "max_qubits": 180},
    "HanYuan_01": {"type": "chip", "max_qubits": 0},
    "PQPUMESH8": {"type": "chip", "max_qubits": 8},
}

@app.get("/api/backends")
async def list_backends():
    """List available Origin Quantum backends (chips + simulators)."""
    availability = _get_backends()
    has_cloud = bool(availability)
    backends = []
    # Always include local simulator
    backends.append({
        "name": "local_sim", "type": "simulator", "max_qubits": 30,
        "available": True, "provider": "EdgeQuanta (local)",
    })
    if has_cloud:
        for name, available in availability.items():
            meta = BACKEND_META.get(name, {"type": "unknown", "max_qubits": 0})
            backends.append({
                "name": name, "type": meta["type"],
                "max_qubits": meta["max_qubits"],
                "available": available, "provider": "Origin Quantum Cloud",
            })
    return {"backends": backends, "cloud_connected": has_cloud}

# === Bell State Demo ===
def _bell_state_local(shots: int) -> Dict:
    """Run Bell State simulation locally with realistic noise."""
    counts: Dict[str, int] = {"00": 0, "01": 0, "10": 0, "11": 0}
    for _ in range(shots):
        r = random.random()
        if r < 0.48:
            counts["00"] += 1
        elif r < 0.96:
            counts["11"] += 1
        elif r < 0.98:
            counts["01"] += 1
        else:
            counts["10"] += 1
    return counts

async def _bell_state_cloud(shots: int, backend_name: str) -> Dict:
    """Run Bell State on Origin Quantum Cloud (chip or HPC simulator)."""
    svc = _get_qcloud_service()
    if not svc:
        raise HTTPException(503, "Origin Quantum Cloud not configured — set ORIGIN_QUANTUM_API_KEY in .env")
    try:
        from pyqpanda3.core import H, CNOT, measure, QProg
        from pyqpanda3.qcloud import QCloudOptions, JobStatus

        prog = QProg()
        prog << H(0) << CNOT(0, 1) << measure(0, 0) << measure(1, 1)

        backend = svc.backend(backend_name)
        options = QCloudOptions()
        job = backend.run(prog, shots, options)

        # Poll asynchronously (non-blocking)
        import time as _time
        for _ in range(120):  # max ~10 min
            status = job.status()
            if status == JobStatus.FINISHED:
                break
            await asyncio.sleep(5)
        else:
            raise HTTPException(504, "Cloud job timed out after 10 minutes")

        probs_list = job.result().get_probs_list()
        # Convert probabilities to counts
        probs = probs_list[0] if probs_list else {}
        counts: Dict[str, int] = {}
        for state_key, prob in probs.items():
            # Normalize key format (remove '0x' prefix if present, pad to 2 bits)
            if state_key.startswith("0x"):
                bits = bin(int(state_key, 16))[2:].zfill(2)
            else:
                bits = state_key.zfill(2)
            counts[bits] = round(prob * shots)
        # Ensure all 4 basis states present
        for bs in ["00", "01", "10", "11"]:
            counts.setdefault(bs, 0)
        return counts
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cloud bell state failed: {e}")
        raise HTTPException(502, f"Cloud execution error: {e}")

@app.post("/api/demo/bell-state")
async def bell_state_demo(shots: int = 1024, backend: str = "local_sim"):
    """Run a Bell State (EPR pair) experiment.
    backend='local_sim' for local noise model, or any Origin Quantum backend name."""
    shots = max(1, min(shots, 100_000))
    task_id = f"bell-{uuid.uuid4().hex[:8]}"

    if backend == "local_sim":
        counts = _bell_state_local(shots)
        provider = "EdgeQuanta (local)"
    else:
        counts = await _bell_state_cloud(shots, backend)
        provider = f"Origin Quantum Cloud ({backend})"

    total = sum(counts.values()) or 1
    fidelity = (counts.get("00", 0) + counts.get("11", 0)) / total
    return {
        "task_id": task_id,
        "experiment": "bell_state",
        "backend": backend,
        "provider": provider,
        "circuit": [
            {"gate": "H", "target": 0, "step": 0},
            {"gate": "CNOT", "control": 0, "target": 1, "step": 1},
            {"gate": "MEASURE", "target": [0, 1], "step": 2},
        ],
        "shots": shots,
        "counts": counts,
        "probabilities": {k: round(v / total, 4) for k, v in counts.items()},
        "fidelity": round(fidelity, 4),
        "status": "completed",
    }

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    ws_clients.append(ws)
    try:
        await ws.send_json({"type": "connected", "systems": SYSTEMS})
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong", "ts": time.time()})
    except WebSocketDisconnect:
        pass
    finally:
        if ws in ws_clients: ws_clients.remove(ws)

# === Agentic Chat Endpoint ===

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CHAT_MODEL = "claude-sonnet-4-20250514"
MAX_TOOL_ROUNDS = 8

CHAT_SYSTEM = """You are EDGE QUANTA, the AI assistant for a Quantum as a Service platform that connects labs worldwide to real quantum hardware via the Origin Quantum Cloud (up to 180-qubit superconducting chips).

You help researchers and engineers:
1. Brainstorm and plan quantum experiments
2. Search the web for the latest quantum computing research
3. Execute quantum circuits on real hardware or simulators
4. Analyze results and propose next steps

You have tools to search the internet, fetch web pages, and run quantum circuits on the backend.

## AGENT LOOP
For every task:
1. Analyze — Understand the request. Identify what you know and what you need to find.
2. Plan — State your 2-4 step plan before executing tools.
3. Execute — Run tools in order. Each result informs the next call.
4. Synthesize — Connect findings. Look for patterns and insights.
5. Report — Deliver a structured answer with citations, then stop.

## OUTPUT FORMAT
- Lead with a 2-3 sentence summary, never start with a markdown header.
- Use ## headers for sections. Cite sources inline: [Source — URL].
- Use tables for comparisons. Be concise and technical.
- Never hedge unnecessarily. State findings directly.

## QUANTUM CONTEXT
Available backends: local_sim (30 qubits), full_amplitude simulator (33 qubits), single_amplitude simulator (200 qubits), partial_amplitude simulator (64 qubits), and real chips: 72-qubit, WK_C102 (102 qubits), WK_C180 (180 qubits).
Currently supported experiment: Bell State (EPR pair) — H gate + CNOT to create |Φ+⟩ = (|00⟩ + |11⟩)/√2.
"""

CHAT_TOOLS = [
    {
        "name": "web_search",
        "description": "Search the web for real-time information about quantum computing, research papers, algorithms, or any topic.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "count": {"type": "number", "description": "Number of results (1-8)", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "web_fetch",
        "description": "Fetch and read a web page. Returns content as markdown text.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "URL to fetch"},
                "max_chars": {"type": "number", "description": "Max characters (default 20000)", "default": 20000},
            },
            "required": ["url"],
        },
    },
    {
        "name": "run_quantum",
        "description": "Run a quantum experiment on EdgeQuanta. Currently supports Bell State (EPR pair) on any available backend.",
        "input_schema": {
            "type": "object",
            "properties": {
                "experiment": {"type": "string", "enum": ["bell_state"], "description": "Experiment type"},
                "shots": {"type": "number", "description": "Number of measurement shots (1-100000)", "default": 1024},
                "backend": {"type": "string", "description": "Backend name: local_sim, full_amplitude, single_amplitude, partial_amplitude, 72, WK_C102-2, WK_C180", "default": "local_sim"},
            },
            "required": ["experiment"],
        },
    },
]

PREVIEW_TOOLS = {"web_fetch", "web_search", "run_quantum"}


async def _execute_sprint_tool(name: str, inp: dict) -> str:
    """Execute a sprint planner tool and return JSON result."""
    if name == "web_search":
        query = inp.get("query", "")
        count = min(int(inp.get("count", 5)), 8)
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": "Mozilla/5.0"},
                    follow_redirects=True,
                )
                results = []
                # Parse simple results from DDG HTML
                text = resp.text
                # Extract result blocks
                import re as _re
                blocks = _re.findall(r'class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?class="result__snippet"[^>]*>(.*?)</span>', text, _re.DOTALL)
                for url, title, snippet in blocks[:count]:
                    title = _re.sub(r'<[^>]+>', '', title).strip()
                    snippet = _re.sub(r'<[^>]+>', '', snippet).strip()
                    # Decode DDG redirect URLs
                    if "uddg=" in url:
                        from urllib.parse import unquote
                        url = unquote(url.split("uddg=")[-1].split("&")[0])
                    results.append({"title": title, "url": url, "snippet": snippet})
                return json.dumps({"query": query, "results": results})
        except Exception as e:
            return json.dumps({"error": f"Search failed: {e}", "query": query})

    elif name == "web_fetch":
        url = inp.get("url", "")
        max_chars = int(inp.get("max_chars", 20000))
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                text = resp.text[:max_chars]
                # Strip HTML tags for a rough text extraction
                text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
                text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL)
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                return json.dumps({"url": url, "content": text[:max_chars]})
        except Exception as e:
            return json.dumps({"error": f"Fetch failed: {e}", "url": url})

    elif name == "run_quantum":
        experiment = inp.get("experiment", "bell_state")
        shots = max(1, min(int(inp.get("shots", 1024)), 100_000))
        backend = inp.get("backend", "local_sim")
        if experiment == "bell_state":
            if backend == "local_sim":
                counts = _bell_state_local(shots)
                provider = "EdgeQuanta (local)"
            else:
                try:
                    counts = await _bell_state_cloud(shots, backend)
                    provider = f"Origin Quantum Cloud ({backend})"
                except Exception as e:
                    return json.dumps({"error": str(e), "backend": backend})
            total = sum(counts.values()) or 1
            fidelity = (counts.get("00", 0) + counts.get("11", 0)) / total
            return json.dumps({
                "experiment": "bell_state", "backend": backend, "provider": provider,
                "shots": shots, "counts": counts,
                "probabilities": {k: round(v / total, 4) for k, v in counts.items()},
                "fidelity": round(fidelity, 4), "status": "completed",
            })
        return json.dumps({"error": f"Unknown experiment: {experiment}"})

    return json.dumps({"error": f"Unknown tool: {name}"})


class ChatRequest(BaseModel):
    task: str
    history: List[dict] = []


@app.post("/api/chat")
async def agentic_chat(body: ChatRequest):
    """Agentic chat — streams SSE events with tool use."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured in .env")

    async def stream():
        messages: List[dict] = list(body.history) + [{"role": "user", "content": body.task}]
        rounds = 0

        while rounds < MAX_TOOL_ROUNDS:
            rounds += 1
            async with httpx.AsyncClient(timeout=120) as client:
                # Use Anthropic streaming API for token-by-token delivery
                async with client.stream(
                    "POST",
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": CHAT_MODEL,
                        "system": CHAT_SYSTEM,
                        "messages": messages,
                        "max_tokens": 4096,
                        "tools": CHAT_TOOLS,
                        "stream": True,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        yield f"data: {json.dumps({'type': 'error', 'content': f'API error {resp.status_code}: {body.decode()}'})}\n\n"
                        return

                    # Parse the Anthropic SSE stream
                    content_blocks: list = []  # Reconstructed content blocks
                    current_block_idx = -1
                    stop_reason = None
                    sse_buffer = ""

                    async for raw_chunk in resp.aiter_text():
                        sse_buffer += raw_chunk
                        while "\n" in sse_buffer:
                            line, sse_buffer = sse_buffer.split("\n", 1)
                            line = line.strip()
                            if not line or not line.startswith("data: "):
                                continue
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                continue
                            try:
                                ev = json.loads(data_str)
                            except json.JSONDecodeError:
                                continue

                            ev_type = ev.get("type", "")

                            if ev_type == "content_block_start":
                                block = ev.get("content_block", {})
                                current_block_idx = ev.get("index", len(content_blocks))
                                # Pad list if needed
                                while len(content_blocks) <= current_block_idx:
                                    content_blocks.append({})
                                content_blocks[current_block_idx] = block
                                # If it's a text block, we'll stream deltas
                                # If tool_use, initialize input accumulator
                                if block.get("type") == "tool_use":
                                    content_blocks[current_block_idx]["input_json"] = ""

                            elif ev_type == "content_block_delta":
                                delta = ev.get("delta", {})
                                idx = ev.get("index", current_block_idx)
                                if delta.get("type") == "text_delta":
                                    text_chunk = delta.get("text", "")
                                    if text_chunk:
                                        # Stream each text token to the frontend immediately
                                        yield f"data: {json.dumps({'type': 'text', 'content': text_chunk})}\n\n"
                                        # Accumulate for message history
                                        if idx < len(content_blocks):
                                            content_blocks[idx]["text"] = content_blocks[idx].get("text", "") + text_chunk
                                elif delta.get("type") == "input_json_delta":
                                    json_chunk = delta.get("partial_json", "")
                                    if idx < len(content_blocks):
                                        content_blocks[idx]["input_json"] = content_blocks[idx].get("input_json", "") + json_chunk

                            elif ev_type == "content_block_stop":
                                idx = ev.get("index", current_block_idx)
                                if idx < len(content_blocks) and content_blocks[idx].get("type") == "tool_use":
                                    # Parse accumulated JSON input
                                    raw_json = content_blocks[idx].pop("input_json", "")
                                    try:
                                        content_blocks[idx]["input"] = json.loads(raw_json) if raw_json else {}
                                    except json.JSONDecodeError:
                                        content_blocks[idx]["input"] = {}

                            elif ev_type == "message_delta":
                                stop_reason = ev.get("delta", {}).get("stop_reason")

                # Check for tool uses
                tool_uses = [b for b in content_blocks if b.get("type") == "tool_use"]

                if not tool_uses or stop_reason == "end_turn":
                    break

                # Add assistant message
                messages.append({"role": "assistant", "content": content_blocks})

                # Execute tools
                tool_results = []
                for tool in tool_uses:
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool_name': tool['name'], 'tool_input': tool.get('input', {})})}\n\n"

                    tool_result = await _execute_sprint_tool(tool["name"], tool.get("input", {}))
                    truncated = tool_result[:20000] + ("... [truncated]" if len(tool_result) > 20000 else "")

                    yield f"data: {json.dumps({'type': 'tool_result', 'tool_name': tool['name'], 'content': truncated[:500]})}\n\n"

                    # Send preview for supported tools
                    if tool["name"] in PREVIEW_TOOLS:
                        preview_map = {
                            "web_fetch": ("web_page", str(tool.get("input", {}).get("url", "Page"))),
                            "web_search": ("search_results", f"Search: {tool.get('input', {}).get('query', '')}"),
                            "run_quantum": ("quantum_result", f"Quantum: {tool.get('input', {}).get('experiment', '')}"),
                        }
                        ptype, ptitle = preview_map.get(tool["name"], ("web_page", tool["name"]))
                        preview_payload = tool_result[:100_000]
                        yield f"data: {json.dumps({'type': 'preview', 'tool_name': tool['name'], 'preview_content': preview_payload, 'preview_type': ptype, 'preview_title': ptitle})}\n\n"

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool["id"],
                        "content": truncated,
                    })

                messages.append({"role": "user", "content": tool_results})

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


# --- SPA static file serving ---
# Serve built assets (JS, CSS, etc.) from frontend/dist/assets
app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    """Serve index.html for all non-API routes (SPA client-side routing)."""
    file_path = os.path.join(DIST_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(DIST_DIR, "index.html"))
