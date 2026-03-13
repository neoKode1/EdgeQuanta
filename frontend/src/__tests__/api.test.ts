/**
 * EdgeQuanta API service unit tests
 * Run: npx vitest run src/__tests__/api.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statusBadge, timeAgo } from '../services/api';

// ─── statusBadge ───
describe('statusBadge', () => {
  it('returns green dot for online', () => {
    expect(statusBadge('online')).toBe('🟢 ONLINE');
  });

  it('returns yellow dot for queued', () => {
    expect(statusBadge('queued')).toBe('🟡 QUEUED');
  });

  it('returns blue dot for running', () => {
    expect(statusBadge('running')).toBe('🔵 RUNNING');
  });

  it('returns red dot for failed', () => {
    expect(statusBadge('failed')).toBe('🔴 FAILED');
  });

  it('returns white dot for unknown status', () => {
    expect(statusBadge('unknown')).toBe('⚪ UNKNOWN');
  });
});

// ─── timeAgo ───
describe('timeAgo', () => {
  it('shows seconds for recent timestamps', () => {
    const ts = Date.now() / 1000 - 30;
    expect(timeAgo(ts)).toBe('30S AGO');
  });

  it('shows minutes for older timestamps', () => {
    const ts = Date.now() / 1000 - 300;
    expect(timeAgo(ts)).toBe('5M AGO');
  });

  it('shows hours for much older timestamps', () => {
    const ts = Date.now() / 1000 - 7200;
    expect(timeAgo(ts)).toBe('2H AGO');
  });
});

// ─── API fetch functions ───
describe('api REST helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('api.getHealth calls /api/health', async () => {
    const mockResponse = { status: 'online', uptime_seconds: 100, version: '1.0.0', systems: [] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { api } = await import('../services/api');
    const data = await api.getHealth();
    expect(data).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/health'));
  });

  it('api.submitJob sends POST with body', async () => {
    const mockJob = { task_id: 'eq-abc', status: 'queued' };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJob),
    });

    const { api } = await import('../services/api');
    const result = await api.submitJob({
      system_type: 'superconducting',
      shots: 1024,
      qubits: 5,
      priority: 1,
    });
    expect(result).toEqual(mockJob);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/jobs'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on non-ok response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { api } = await import('../services/api');
    await expect(api.getHealth()).rejects.toThrow('500');
  });
});

