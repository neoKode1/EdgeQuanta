/**
 * GET /api/metrics — System metrics for observability dashboard
 */
import type { Env } from '../types';
import { json, SYSTEMS, DEFAULT_CHIPS } from '../types';
import { generateSystemMetrics } from '../quantum';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;

  // Pull global job stats from D1
  const [totalRow, completedRow, failedRow, activeRow] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM jobs').first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'failed'").first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status IN ('queued','running','compiling')").first<{ c: number }>(),
  ]);

  const globalMetrics = {
    total: totalRow?.c ?? 0,
    completed: completedRow?.c ?? 0,
    failed: failedRow?.c ?? 0,
    active: activeRow?.c ?? 0,
  };

  const systemMetrics = SYSTEMS.map((s) =>
    generateSystemMetrics(s, DEFAULT_CHIPS[s]),
  );

  return json({
    global: globalMetrics,
    systems: systemMetrics,
    timestamp: Date.now() / 1000,
  });
};

