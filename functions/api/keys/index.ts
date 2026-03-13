/**
 * /api/keys — API key management
 * GET  → list keys
 * POST → create a new key
 */
import type { Env } from '../../types';
import { json } from '../../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  const { results } = await db
    .prepare('SELECT * FROM api_keys WHERE is_active = 1 ORDER BY created_at DESC')
    .all();
  return json({ keys: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const name = url.searchParams.get('name') ?? 'New Key';
  const tier = url.searchParams.get('tier') ?? 'standard';
  const key = `eq-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = Math.floor(Date.now() / 1000);
  const db = context.env.DB;

  await db
    .prepare(
      'INSERT INTO api_keys (key, name, tier, quota, used, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(key, name, tier, 1000, 0, 1, now)
    .run();

  return json({ key, name, tier, quota: 1000, used: 0, created_at: now });
};

