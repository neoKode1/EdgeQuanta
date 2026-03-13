/**
 * POST /api/chat — Agentic chat with SSE streaming
 *
 * Streams Anthropic Claude responses token-by-token via SSE.
 * Implements tool-use loop (web_search, web_fetch, run_quantum).
 */
import type { Env } from '../types';
import { errorResponse, CHAT_MODEL, MAX_TOOL_ROUNDS } from '../types';
import { bellStateLocal } from '../quantum';

const CHAT_SYSTEM = `You are EDGE QUANTA, the AI assistant for a Quantum as a Service platform that connects labs worldwide to real quantum hardware via the Origin Quantum Cloud (up to 180-qubit superconducting chips).

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
Currently supported experiment: Bell State (EPR pair) — H gate + CNOT to create |Φ+⟩ = (|00⟩ + |11⟩)/√2.`;

const CHAT_TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for real-time information about quantum computing, research papers, algorithms, or any topic.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'number', description: 'Number of results (1-8)', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'web_fetch',
    description: 'Fetch and read a web page. Returns content as markdown text.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        max_chars: { type: 'number', description: 'Max characters (default 20000)', default: 20000 },
      },
      required: ['url'],
    },
  },
  {
    name: 'run_quantum',
    description: 'Run a quantum experiment on EdgeQuanta. Currently supports Bell State (EPR pair) on any available backend.',
    input_schema: {
      type: 'object',
      properties: {
        experiment: { type: 'string', enum: ['bell_state'], description: 'Experiment type' },
        shots: { type: 'number', description: 'Number of measurement shots (1-100000)', default: 1024 },
        backend: { type: 'string', description: 'Backend name: local_sim', default: 'local_sim' },
      },
      required: ['experiment'],
    },
  },
];

const PREVIEW_TOOLS = new Set(['web_fetch', 'web_search', 'run_quantum']);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse('ANTHROPIC_API_KEY not configured', 500);
  }

  const body = (await context.request.json()) as {
    task: string;
    history?: Array<{ role: string; content: string }>;
  };

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const write = (data: string) => writer.write(encoder.encode(`data: ${data}\n\n`));

  // Run the streaming loop in the background
  context.waitUntil(
    (async () => {
      try {
        await streamChat(apiKey, body.task, body.history ?? [], write);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        await write(JSON.stringify({ type: 'error', content: msg }));
      } finally {
        await write(JSON.stringify({ type: 'done' }));
        await writer.close();
      }
    })(),
  );

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

// === Tool execution ===

async function executeTool(name: string, inp: Record<string, unknown>): Promise<string> {
  if (name === 'web_search') {
    const query = (inp.query as string) ?? '';
    const count = Math.min(Number(inp.count ?? 5), 8);
    try {
      const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const text = await resp.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];
      // Simple regex extraction from DDG HTML
      const blockRegex = /class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>.*?class="result__snippet"[^>]*>(.*?)<\/span>/gs;
      let match;
      while ((match = blockRegex.exec(text)) !== null && results.length < count) {
        let [, url, title, snippet] = match;
        title = title.replace(/<[^>]+>/g, '').trim();
        snippet = snippet.replace(/<[^>]+>/g, '').trim();
        if (url.includes('uddg=')) {
          url = decodeURIComponent(url.split('uddg=').pop()?.split('&')[0] ?? url);
        }
        results.push({ title, url, snippet });
      }
      return JSON.stringify({ query, results });
    } catch (e) {
      return JSON.stringify({ error: `Search failed: ${e}`, query });
    }
  }

  if (name === 'web_fetch') {
    const url = (inp.url as string) ?? '';
    const maxChars = Number(inp.max_chars ?? 20000);
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      let text = await resp.text();
      text = text.slice(0, maxChars);
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();
      return JSON.stringify({ url, content: text.slice(0, maxChars) });
    } catch (e) {
      return JSON.stringify({ error: `Fetch failed: ${e}`, url });
    }
  }

  if (name === 'run_quantum') {
    const shots = Math.max(1, Math.min(Number(inp.shots ?? 1024), 100_000));
    const backend = (inp.backend as string) ?? 'local_sim';
    if (backend !== 'local_sim') {
      return JSON.stringify({ error: 'Cloud backends not available in edge runtime', backend });
    }
    const counts = bellStateLocal(shots);
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const fidelity = (counts['00'] + counts['11']) / total;
    return JSON.stringify({
      experiment: 'bell_state', backend, provider: 'EdgeQuanta (edge)',
      shots, counts,
      probabilities: Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 10000) / 10000]),
      ),
      fidelity: Math.round(fidelity * 10000) / 10000,
      status: 'completed',
    });
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// === Streaming chat loop ===

async function streamChat(
  apiKey: string,
  task: string,
  history: Array<{ role: string; content: string }>,
  write: (data: string) => Promise<void>,
) {
  const messages: Array<Record<string, unknown>> = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: task },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        system: CHAT_SYSTEM,
        messages,
        max_tokens: 4096,
        tools: CHAT_TOOLS,
        stream: true,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      await write(JSON.stringify({ type: 'error', content: `API error ${resp.status}: ${errBody}` }));
      return;
    }

    // Parse Anthropic SSE stream
    const contentBlocks: Array<Record<string, unknown>> = [];
    let stopReason: string | null = null;
    let sseBuffer = '';

    const reader = resp.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });

      while (sseBuffer.includes('\n')) {
        const nlIdx = sseBuffer.indexOf('\n');
        const line = sseBuffer.slice(0, nlIdx).trim();
        sseBuffer = sseBuffer.slice(nlIdx + 1);

        if (!line || !line.startsWith('data: ')) continue;
        const dataStr = line.slice(6);
        if (dataStr === '[DONE]') continue;

        let ev: Record<string, unknown>;
        try { ev = JSON.parse(dataStr); } catch { continue; }
        const evType = ev.type as string;

        if (evType === 'content_block_start') {
          const block = ev.content_block as Record<string, unknown>;
          const idx = (ev.index as number) ?? contentBlocks.length;
          while (contentBlocks.length <= idx) contentBlocks.push({});
          contentBlocks[idx] = { ...block };
          if (block?.type === 'tool_use') contentBlocks[idx].input_json = '';
        } else if (evType === 'content_block_delta') {
          const delta = ev.delta as Record<string, unknown>;
          const idx = ev.index as number;
          if (delta?.type === 'text_delta') {
            const chunk = delta.text as string;
            if (chunk) {
              await write(JSON.stringify({ type: 'text', content: chunk }));
              contentBlocks[idx].text = ((contentBlocks[idx].text as string) ?? '') + chunk;
            }
          } else if (delta?.type === 'input_json_delta') {
            const chunk = delta.partial_json as string;
            if (idx < contentBlocks.length) {
              contentBlocks[idx].input_json = ((contentBlocks[idx].input_json as string) ?? '') + (chunk ?? '');
            }
          }
        } else if (evType === 'content_block_stop') {
          const idx = ev.index as number;
          if (idx < contentBlocks.length && contentBlocks[idx].type === 'tool_use') {
            const raw = contentBlocks[idx].input_json as string;
            try { contentBlocks[idx].input = raw ? JSON.parse(raw) : {}; } catch { contentBlocks[idx].input = {}; }
            delete contentBlocks[idx].input_json;
          }
        } else if (evType === 'message_delta') {
          stopReason = (ev.delta as Record<string, unknown>)?.stop_reason as string | null;
        }
      }
    }

    // Check for tool uses
    const toolUses = contentBlocks.filter((b) => b.type === 'tool_use');
    if (!toolUses.length || stopReason === 'end_turn') break;

    // Add assistant message, execute tools
    messages.push({ role: 'assistant', content: contentBlocks });
    const toolResults: Array<Record<string, unknown>> = [];

    for (const tool of toolUses) {
      const toolName = tool.name as string;
      const toolInput = (tool.input ?? {}) as Record<string, unknown>;
      await write(JSON.stringify({ type: 'tool_start', tool_name: toolName, tool_input: toolInput }));

      const result = await executeTool(toolName, toolInput);
      const truncated = result.slice(0, 20000) + (result.length > 20000 ? '... [truncated]' : '');
      await write(JSON.stringify({ type: 'tool_result', tool_name: toolName, content: truncated.slice(0, 500) }));

      // Send preview for supported tools
      if (PREVIEW_TOOLS.has(toolName)) {
        const previewMap: Record<string, [string, string]> = {
          web_fetch: ['web_page', String((toolInput.url as string) ?? 'Page')],
          web_search: ['search_results', `Search: ${(toolInput.query as string) ?? ''}`],
          run_quantum: ['quantum_result', `Quantum: ${(toolInput.experiment as string) ?? ''}`],
        };
        const [ptype, ptitle] = previewMap[toolName] ?? ['web_page', toolName];
        await write(JSON.stringify({
          type: 'preview', tool_name: toolName,
          preview_content: result.slice(0, 100_000),
          preview_type: ptype, preview_title: ptitle,
        }));
      }

      toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: truncated });
    }

    messages.push({ role: 'user', content: toolResults });
  }
}
