"""
EdgeQuanta API Tests
Run: pytest tests/test_api.py -v
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import server
from server import app, SYSTEMS
import time


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    # Manually trigger lifespan initialization since ASGITransport doesn't
    loader = server.ChipConfigLoader()
    server.chip_loader = loader
    server.task_managers.clear()
    server.api_keys.clear()
    server.job_history.clear()
    server.vip_slots.clear()
    for s in SYSTEMS:
        server.task_managers[s] = server.TaskManager(s)
    server.metrics.update({"total": 0, "completed": 0, "failed": 0, "active": 0, "uptime_start": time.time()})
    server.api_keys["eq-demo-key-001"] = {"name": "Demo Key", "tier": "standard", "created": time.time(), "quota": 1000, "used": 0}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ─── Health ───
@pytest.mark.anyio
async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    assert "uptime_seconds" in data
    assert data["version"] == "1.0.0"
    assert set(data["systems"]) == {"superconducting", "ion_trap", "neutral_atom", "photonic"}


# ─── Systems ───
@pytest.mark.anyio
async def test_list_systems(client):
    r = await client.get("/api/systems")
    assert r.status_code == 200
    systems = r.json()["systems"]
    assert len(systems) == 4
    for s in systems:
        assert "id" in s
        assert "chip_id" in s
        assert s["status"] == "online"


@pytest.mark.anyio
async def test_get_chip(client):
    r = await client.get("/api/systems/superconducting/chip")
    assert r.status_code == 200
    data = r.json()
    assert data["chip_id"] == "72"
    assert "work_areas" in data


@pytest.mark.anyio
async def test_get_chip_unknown(client):
    r = await client.get("/api/systems/fake_system/chip")
    assert r.status_code == 404


# ─── Jobs ───
@pytest.mark.anyio
async def test_submit_job(client):
    r = await client.post("/api/jobs", json={
        "system_type": "superconducting",
        "shots": 512,
        "qubits": 3,
        "priority": 1
    })
    assert r.status_code == 200
    data = r.json()
    assert data["task_id"].startswith("eq-")
    assert data["status"] == "queued"


@pytest.mark.anyio
async def test_submit_job_invalid_system(client):
    r = await client.post("/api/jobs", json={
        "system_type": "nonexistent",
        "shots": 100,
        "qubits": 2,
        "priority": 0
    })
    assert r.status_code == 400


@pytest.mark.anyio
async def test_list_jobs(client):
    # Submit a job first
    await client.post("/api/jobs", json={"system_type": "ion_trap", "shots": 100, "qubits": 2, "priority": 0})
    r = await client.get("/api/jobs?limit=10")
    assert r.status_code == 200
    assert len(r.json()["jobs"]) >= 1


@pytest.mark.anyio
async def test_get_job_not_found(client):
    r = await client.get("/api/jobs/nonexistent-id")
    assert r.status_code == 404


# ─── API Keys ───
@pytest.mark.anyio
async def test_list_keys(client):
    r = await client.get("/api/keys")
    assert r.status_code == 200
    keys = r.json()["keys"]
    assert len(keys) >= 1  # demo key seeded at startup


@pytest.mark.anyio
async def test_create_key(client):
    r = await client.post("/api/keys?name=test-key&tier=premium")
    assert r.status_code == 200
    data = r.json()
    assert data["key"].startswith("eq-")
    assert data["name"] == "test-key"
    assert data["tier"] == "premium"


# ─── Reservations ───
@pytest.mark.anyio
async def test_create_reservation(client):
    r = await client.post("/api/reservations", json={
        "system_type": "photonic",
        "duration_minutes": 15,
        "reason": "calibration test"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "confirmed"
    assert data["system_type"] == "photonic"


@pytest.mark.anyio
async def test_list_reservations(client):
    r = await client.get("/api/reservations")
    assert r.status_code == 200
    assert "reservations" in r.json()


# ─── Metrics ───
@pytest.mark.anyio
async def test_metrics(client):
    r = await client.get("/api/metrics")
    assert r.status_code == 200
    data = r.json()
    assert "global" in data
    assert "systems" in data
    assert len(data["systems"]) == 4
    for s in data["systems"]:
        assert 0 < s["fidelity"] <= 1.0
        assert s["status"] == "online"

