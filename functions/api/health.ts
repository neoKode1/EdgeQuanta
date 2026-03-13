/**
 * GET /api/health — Platform health check
 */
import type { Env } from '../types';
import { json, SYSTEMS } from '../types';

const START_TIME = Date.now();

export const onRequestGet: PagesFunction<Env> = async () => {
  return json({
    status: 'online',
    uptime_seconds: Math.round((Date.now() - START_TIME) / 1000),
    systems: SYSTEMS,
    version: '1.0.0',
    runtime: 'cloudflare-workers',
  });
};

