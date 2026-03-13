/**
 * /api/jobs — Job submission and listing
 * GET  → list recent jobs
 * POST → submit a new quantum job
 */
import type { Env } from '../../types';
import { json, errorResponse, SYSTEMS } from '../../types';
import { generateJobResult } from '../../quantum';

/** GET /api/jobs?limit=50 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
  const db = context.env.DB;

  const { results } = await db
    .prepare('SELECT * FROM jobs ORDER BY submitted_at DESC LIMIT ?')
    .bind(limit)
    .all();

  // Parse JSON fields
  const jobs = (results ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    result: row.result ? JSON.parse(row.result as string) : undefined,
    timing: row.timing ? JSON.parse(row.timing as string) : undefined,
  }));

  return json({ jobs });
};

/** POST /api/jobs */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = (await context.request.json()) as {
    system_type?: string;
    shots?: number;
    qubits?: number;
    priority?: number;
  };

  const systemType = body.system_type ?? 'superconducting';
  const shots = Math.max(1, Math.min(body.shots ?? 1000, 100_000));
  const qubits = Math.max(1, Math.min(body.qubits ?? 5, 30));
  const priority = body.priority ?? 0;

  if (!SYSTEMS.includes(systemType as typeof SYSTEMS[number])) {
    return errorResponse(`Unknown system: ${systemType}`, 400);
  }

  const taskId = `eq-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);
  const db = context.env.DB;

  // Insert job as queued
  await db
    .prepare(
      'INSERT INTO jobs (id, system_type, shots, qubits, priority, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(taskId, systemType, shots, qubits, priority, 'queued', now)
    .run();

  // Simulate processing (in Workers we can't do background work easily,
  // so we process inline with small delays via scheduler or just complete immediately)
  const result = generateJobResult(systemType, qubits, shots);
  const completedAt = Math.floor(Date.now() / 1000);
  const timing = JSON.stringify({
    queue_ms: Math.floor(Math.random() * 200) + 50,
    compile_ms: Math.floor(Math.random() * 300) + 100,
    execute_ms: Math.floor(Math.random() * 1000) + 200,
    total_ms: Math.floor(Math.random() * 1500) + 500,
  });

  await db
    .prepare(
      'UPDATE jobs SET status = ?, result = ?, fidelity = ?, completed_at = ?, timing = ? WHERE id = ?',
    )
    .bind(
      'completed',
      JSON.stringify(result),
      result.fidelity as number,
      completedAt,
      timing,
      taskId,
    )
    .run();

  return json({
    task_id: taskId,
    system_type: systemType,
    shots,
    qubits,
    status: 'completed',
    submitted_at: now,
    completed_at: completedAt,
    result,
  });
};

