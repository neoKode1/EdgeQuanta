/**
 * GET /api/backends — List available quantum backends
 */
import type { Env } from '../types';
import { json, BACKEND_META } from '../types';

export const onRequestGet: PagesFunction<Env> = async () => {
  const backends = [
    {
      name: 'local_sim',
      type: 'simulator',
      max_qubits: 30,
      available: true,
      provider: 'EdgeQuanta (edge)',
    },
    // Include all known backends as available (cloud connection is TODO)
    ...Object.entries(BACKEND_META).map(([name, meta]) => ({
      name,
      type: meta.type,
      max_qubits: meta.max_qubits,
      available: false, // Will be true once Origin Quantum Cloud is wired
      provider: 'Origin Quantum Cloud',
    })),
  ];

  return json({
    backends,
    cloud_connected: false, // TODO: wire Origin Quantum Cloud at the edge
  });
};

