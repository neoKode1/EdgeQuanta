/**
 * EdgeQuanta — Quantum simulation logic (TypeScript port)
 *
 * Generates realistic mock quantum measurement results with noise models.
 */

export interface BellStateCounts {
  '00': number;
  '01': number;
  '10': number;
  '11': number;
}

/**
 * Simulate a Bell State (EPR pair) with realistic noise.
 * Creates |Φ+⟩ = (|00⟩ + |11⟩)/√2 with depolarizing noise.
 */
export function bellStateLocal(shots: number): BellStateCounts {
  const counts: BellStateCounts = { '00': 0, '01': 0, '10': 0, '11': 0 };
  for (let i = 0; i < shots; i++) {
    const r = Math.random();
    if (r < 0.48) counts['00']++;
    else if (r < 0.96) counts['11']++;
    else if (r < 0.98) counts['01']++;
    else counts['10']++;
  }
  return counts;
}

/**
 * Generate mock quantum job results for a given system type.
 * Mimics the Python result_generator with realistic noise.
 */
export function generateJobResult(
  systemType: string,
  qubits: number,
  shots: number,
): Record<string, unknown> {
  // Generate measurement counts with noise
  const numStates = Math.min(Math.pow(2, qubits), 32); // cap for sanity
  const counts: Record<string, number> = {};
  let remaining = shots;

  for (let i = 0; i < numStates && remaining > 0; i++) {
    const state = i.toString(2).padStart(qubits, '0');
    if (i === numStates - 1) {
      counts[state] = remaining;
    } else {
      // Exponential decay distribution + noise
      const weight = Math.exp(-i * 0.3) + Math.random() * 0.1;
      const count = Math.max(1, Math.floor(weight * shots / numStates));
      counts[state] = Math.min(count, remaining);
      remaining -= counts[state];
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const probabilities: Record<string, number> = {};
  for (const [state, count] of Object.entries(counts)) {
    probabilities[state] = Math.round((count / total) * 10000) / 10000;
  }

  // System-specific fidelity ranges
  const fidelityRanges: Record<string, [number, number]> = {
    superconducting: [0.94, 0.998],
    ion_trap: [0.96, 0.999],
    neutral_atom: [0.90, 0.97],
    photonic: [0.92, 0.99],
  };
  const [lo, hi] = fidelityRanges[systemType] ?? [0.90, 0.99];
  const fidelity = Math.round((lo + Math.random() * (hi - lo)) * 10000) / 10000;

  return {
    counts,
    probabilities,
    fidelity,
    qubits,
    shots: total,
    system_type: systemType,
  };
}

/**
 * Generate mock system metrics.
 */
export function generateSystemMetrics(systemType: string, chipId: string) {
  return {
    system: systemType,
    chip_id: chipId,
    status: 'online',
    queue_depth: Math.floor(Math.random() * 5),
    work_areas: Math.floor(Math.random() * 4) + 1,
    fidelity: Math.round((0.92 + Math.random() * 0.078) * 10000) / 10000,
    calibration_age_min: Math.round((2 + Math.random() * 118) * 10) / 10,
    last_heartbeat: Date.now() / 1000 - Math.random() * 5,
  };
}

