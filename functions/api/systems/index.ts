/**
 * GET /api/systems — List available quantum systems
 */
import type { Env } from '../../types';
import { json, SYSTEMS, DEFAULT_CHIPS } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const systems = await Promise.all(
    SYSTEMS.map(async (s) => {
      const chipId = DEFAULT_CHIPS[s];
      // Count queued jobs for this system from D1
      const { results } = await db
        .prepare("SELECT COUNT(*) as count FROM jobs WHERE system_type = ? AND status IN ('queued', 'running')")
        .bind(s)
        .all();
      const queueDepth = (results[0]?.count as number) ?? 0;
      return {
        id: s,
        chip_id: chipId,
        status: 'online',
        work_areas: [],
        queue_depth: queueDepth,
      };
    }),
  );
  return json({ systems });
};

