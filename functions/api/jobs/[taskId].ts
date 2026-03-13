/**
 * GET /api/jobs/:taskId — Get a single job by ID
 */
import type { Env } from '../../types';
import { json, errorResponse } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const taskId = context.params.taskId as string;
  const db = context.env.DB;

  const row = await db
    .prepare('SELECT * FROM jobs WHERE id = ?')
    .bind(taskId)
    .first();

  if (!row) {
    return errorResponse('Job not found', 404);
  }

  return json({
    ...row,
    result: row.result ? JSON.parse(row.result as string) : undefined,
    timing: row.timing ? JSON.parse(row.timing as string) : undefined,
  });
};

