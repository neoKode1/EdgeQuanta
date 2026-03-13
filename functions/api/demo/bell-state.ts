/**
 * POST /api/demo/bell-state — Run a Bell State (EPR pair) experiment
 */
import type { Env } from '../../types';
import { json, errorResponse } from '../../types';
import { bellStateLocal } from '../../quantum';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const shots = Math.max(1, Math.min(parseInt(url.searchParams.get('shots') ?? '1024'), 100_000));
  const backend = url.searchParams.get('backend') ?? 'local_sim';
  const taskId = `bell-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

  if (backend !== 'local_sim') {
    return errorResponse(
      'Cloud backends not yet available in edge runtime. Use local_sim.',
      501,
    );
  }

  const counts = bellStateLocal(shots);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const fidelity = (counts['00'] + counts['11']) / total;

  return json({
    task_id: taskId,
    experiment: 'bell_state',
    backend,
    provider: 'EdgeQuanta (edge)',
    circuit: [
      { gate: 'H', target: 0, step: 0 },
      { gate: 'CNOT', control: 0, target: 1, step: 1 },
      { gate: 'MEASURE', target: [0, 1], step: 2 },
    ],
    shots,
    counts,
    probabilities: Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 10000) / 10000]),
    ),
    fidelity: Math.round(fidelity * 10000) / 10000,
    status: 'completed',
  });
};

