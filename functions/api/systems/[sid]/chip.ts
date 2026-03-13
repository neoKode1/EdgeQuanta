/**
 * GET /api/systems/:sid/chip — Get chip configuration for a system
 */
import type { Env } from '../../../types';
import { json, errorResponse, DEFAULT_CHIPS, SYSTEMS } from '../../../types';
import type { SystemType } from '../../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sid = context.params.sid as string;
  if (!SYSTEMS.includes(sid as SystemType)) {
    return errorResponse('Unknown system', 404);
  }
  const chipId = DEFAULT_CHIPS[sid as SystemType];
  return json({
    chip_id: chipId,
    work_areas: [],
    config: {},
  });
};

