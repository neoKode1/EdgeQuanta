/**
 * EdgeQuanta API Client — TypeScript port of api.js
 */

const BASE = window.location.origin;
const API = `${BASE}/api`;

// ─── Types ───
export interface SystemInfo {
  id: string;
  status: string;
  chip_id: string;
  queue_depth: number;
}

export interface Job {
  task_id: string;
  system_type: string;
  shots: number;
  qubits: number;
  status: string;
  submitted_at: number;
}

export interface JobSubmission {
  system_type: string;
  shots: number;
  qubits: number;
  priority: number;
}

export interface MetricsGlobal {
  total: number;
  completed: number;
  failed: number;
  active: number;
}

export interface SystemMetrics {
  system: string;
  chip_id: string;
  fidelity: number;
  queue_depth: number;
  work_areas: number;
  calibration_age_min: number;
  status: string;
}

export interface ApiKey {
  key: string;
  name: string;
  tier: string;
  used: number;
  quota: number;
}

export interface Reservation {
  id: string;
  system_type: string;
  duration_minutes: number;
  status: string;
}

export interface BellStateResult {
  task_id: string;
  experiment: string;
  backend: string;
  provider: string;
  circuit: { gate: string; target: number | number[]; control?: number; step: number }[];
  shots: number;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  fidelity: number;
  status: string;
}

export interface Backend {
  name: string;
  type: string;
  max_qubits: number;
  available: boolean;
  provider: string;
}

export interface WSEvent {
  type: string;
  job?: Job;
  task_id?: string;
  status?: string;
  [key: string]: unknown;
}

// ─── REST Helpers ───
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  return r.json();
}

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path}: ${r.status}`);
  return r.json();
}

// ─── WebSocket ───
type EventCallback = (data: WSEvent) => void;
let ws: WebSocket | null = null;
const wsListeners: EventCallback[] = [];

export function connectWS(): void {
  if (ws && ws.readyState <= 1) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as WSEvent;
      wsListeners.forEach((fn) => fn(data));
    } catch { /* ignore parse errors */ }
  };
  ws.onclose = () => setTimeout(connectWS, 3000);
  ws.onerror = () => ws?.close();
}

export function onEvent(fn: EventCallback): () => void {
  wsListeners.push(fn);
  return () => {
    const idx = wsListeners.indexOf(fn);
    if (idx >= 0) wsListeners.splice(idx, 1);
  };
}

// ─── Auth ───
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: string;
}

export const auth = {
  sendMagicLink: (email: string) =>
    post<{ ok: boolean; message: string }>('/auth/send-magic-link', { email }),
  getSession: () => get<{ user: AuthUser }>('/auth/session'),
  logout: () => post<{ ok: boolean }>('/auth/logout'),
};

// ─── Public API ───
export const api = {
  getHealth: () => get<{ status: string }>('/health'),
  getSystems: () => get<{ systems: SystemInfo[] }>('/systems'),
  getChip: (id: string) => get<unknown>(`/systems/${id}/chip`),
  submitJob: (body: JobSubmission) => post<Job>('/jobs', body),
  getJobs: (n = 50) => get<{ jobs: Job[] }>(`/jobs?limit=${n}`),
  getJob: (id: string) => get<Job>(`/jobs/${id}`),
  getMetrics: () => get<{ global: MetricsGlobal; systems: SystemMetrics[] }>('/metrics'),
  getReservations: () => get<{ reservations: Reservation[] }>('/reservations'),
  createReservation: (b: { system_type: string; duration_minutes: number; reason: string }) =>
    post<Reservation>('/reservations', b),
  getKeys: () => get<{ keys: ApiKey[] }>('/keys'),
  createKey: (name: string, tier: string) =>
    post<ApiKey>(`/keys?name=${encodeURIComponent(name)}&tier=${tier}`),
  getBackends: () => get<{ backends: Backend[]; cloud_connected: boolean }>('/backends'),
  runBellState: (shots = 1024, backend = 'local_sim') =>
    post<BellStateResult>(`/demo/bell-state?shots=${shots}&backend=${encodeURIComponent(backend)}`),
};

// ─── Helpers ───
export function statusBadge(status: string): string {
  const map: Record<string, string> = {
    online: '🟢', queued: '🟡', compiling: '🔵',
    running: '🔵', completed: '🟢', failed: '🔴',
  };
  return `${map[status] || '⚪'} ${status.toUpperCase()}`;
}

export function timeAgo(ts: number): string {
  if (!ts || isNaN(ts)) return 'JUST NOW';
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 0 || isNaN(s)) return 'JUST NOW';
  if (s < 60) return `${s}S AGO`;
  if (s < 3600) return `${Math.floor(s / 60)}M AGO`;
  return `${Math.floor(s / 3600)}H AGO`;
}

