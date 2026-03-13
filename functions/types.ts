/**
 * EdgeQuanta — Cloudflare Pages Functions shared types
 */

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

/** Standard JSON response helper */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}

/** Error response helper */
export function errorResponse(message: string, status = 500): Response {
  return json({ error: message }, status);
}

/** CORS preflight handler */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Quantum system constants
export const SYSTEMS = ['superconducting', 'ion_trap', 'neutral_atom', 'photonic'] as const;
export type SystemType = (typeof SYSTEMS)[number];

export const DEFAULT_CHIPS: Record<SystemType, string> = {
  superconducting: '72',
  ion_trap: 'IonTrap',
  neutral_atom: 'HanYuan_01',
  photonic: 'PQPUMESH8',
};

export const BACKEND_META: Record<string, { type: string; max_qubits: number }> = {
  full_amplitude: { type: 'simulator', max_qubits: 33 },
  single_amplitude: { type: 'simulator', max_qubits: 200 },
  partial_amplitude: { type: 'simulator', max_qubits: 64 },
  '72': { type: 'chip', max_qubits: 72 },
  'WK_C102-2': { type: 'chip', max_qubits: 102 },
  WK_C102_400: { type: 'chip', max_qubits: 102 },
  WK_C180: { type: 'chip', max_qubits: 180 },
  HanYuan_01: { type: 'chip', max_qubits: 0 },
  PQPUMESH8: { type: 'chip', max_qubits: 8 },
};

// Chat constants
export const CHAT_MODEL = 'claude-sonnet-4-20250514';
export const MAX_TOOL_ROUNDS = 8;

