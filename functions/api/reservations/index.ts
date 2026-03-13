/**
 * /api/reservations — System reservation management
 * GET  → list reservations
 * POST → create a reservation
 *
 * Note: Reservations are stored in-memory for now (not in D1 schema yet).
 * We use a simple in-memory store since this is a demo feature.
 * For production, add a reservations table to D1.
 */
import type { Env } from '../../types';
import { json, errorResponse, SYSTEMS } from '../../types';

// In-memory reservation store (resets on cold start — acceptable for demo)
const reservations: Record<string, Record<string, unknown>> = {};

export const onRequestGet: PagesFunction<Env> = async () => {
  return json({ reservations: Object.values(reservations) });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = (await context.request.json()) as {
    system_type?: string;
    duration_minutes?: number;
    reason?: string;
  };

  const systemType = body.system_type ?? 'superconducting';
  if (!SYSTEMS.includes(systemType as typeof SYSTEMS[number])) {
    return errorResponse('Unknown system', 400);
  }

  const slotId = `res-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
  const now = Date.now() / 1000;
  const durationMin = body.duration_minutes ?? 30;

  const slot = {
    id: slotId,
    system_type: systemType,
    duration_minutes: durationMin,
    reason: body.reason ?? '',
    status: 'confirmed',
    created_at: now,
    starts_at: now + 60,
    ends_at: now + 60 + durationMin * 60,
  };

  reservations[slotId] = slot;
  return json(slot);
};

