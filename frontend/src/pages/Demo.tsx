import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { BellStateResult, Backend } from '../services/api';

const STEPS = [
  { title: 'INITIALIZE', desc: 'Two qubits start in the ground state |00⟩.' },
  { title: 'HADAMARD GATE', desc: 'Apply H to qubit 0, creating superposition: (|0⟩ + |1⟩)/√2 ⊗ |0⟩.' },
  { title: 'CNOT GATE', desc: 'Apply CNOT with q0 as control and q1 as target. This entangles the qubits into the Bell state: (|00⟩ + |11⟩)/√2.' },
  { title: 'MEASURE', desc: 'Measure both qubits. You should see ~50% |00⟩ and ~50% |11⟩ — the hallmark of quantum entanglement.' },
];

export default function Demo() {
  const [shots, setShots] = useState(1024);
  const [result, setResult] = useState<BellStateResult | null>(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [backends, setBackends] = useState<Backend[]>([]);
  const [selectedBackend, setSelectedBackend] = useState('local_sim');
  const [cloudConnected, setCloudConnected] = useState(false);

  useEffect(() => {
    api.getBackends().then((data) => {
      setBackends(data.backends);
      setCloudConnected(data.cloud_connected);
    }).catch(() => {
      setBackends([{ name: 'local_sim', type: 'simulator', max_qubits: 30, available: true, provider: 'EdgeQuanta (local)' }]);
    });
  }, []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    for (let i = 0; i < STEPS.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, selectedBackend === 'local_sim' ? 600 : 400));
    }
    try {
      const res = await api.runBellState(shots, selectedBackend);
      setResult(res);
    } catch (e) {
      console.error('Bell state demo failed:', e);
    }
    setRunning(false);
  };

  const currentBackend = backends.find((b) => b.name === selectedBackend);

  const maxCount = result ? Math.max(...Object.values(result.counts)) : 0;

  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Demo</div>
        <h1>Bell State Experiment</h1>
        <p>
          The Bell State is the simplest demonstration of quantum entanglement.
          Two qubits are prepared so their measurement outcomes are perfectly correlated —
          a phenomenon with no classical analogue.
        </p>
        <div className="watermark">DEMO</div>
      </section>

      {/* What is entanglement — dual-audience explainer */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">WHAT IS ENTANGLEMENT?</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Newcomer card */}
          <div className="card" style={{ borderColor: 'rgba(163,230,53,0.15)' }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: '#a3e635' }}>🧑‍🔬 THE SHORT VERSION</div>
            <p style={{ lineHeight: 1.8 }}>
              Imagine flipping two coins that are magically linked: no matter how far apart they are,
              when one lands <strong style={{ color: '#22d3ee' }}>heads</strong>, the other <em>always</em> lands{' '}
              <strong style={{ color: '#22d3ee' }}>heads</strong> too — and the same for tails.
              That's entanglement. The coins aren't communicating; they were <em>prepared</em> to be correlated.
            </p>
            <p style={{ lineHeight: 1.8, marginTop: 12 }}>
              In this experiment you'll create that link between two quantum bits (qubits). When you measure them,
              you'll see only <code style={{ color: '#22d3ee' }}>|00⟩</code> and <code style={{ color: '#22d3ee' }}>|11⟩</code> — never{' '}
              <code style={{ color: 'var(--dim)' }}>|01⟩</code> or <code style={{ color: 'var(--dim)' }}>|10⟩</code>.
              That perfect correlation is the signature of a <strong style={{ color: '#e4e4e7' }}>Bell state</strong>.
            </p>
          </div>
          {/* Professional card */}
          <div className="card" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: '#818cf8' }}>📐 FORMAL DEFINITION</div>
            <p style={{ lineHeight: 1.8 }}>
              A Bell state is a maximally entangled two-qubit state. The four Bell states form an
              orthonormal basis for the two-qubit Hilbert space ℋ = ℂ² ⊗ ℂ²:
            </p>
            <div className="card" style={{ background: 'rgba(0,0,0,0.3)', fontFamily: "'SF Mono', monospace", fontSize: '0.85rem', lineHeight: 2, margin: '12px 0 0', padding: 16 }}>
              <div style={{ color: '#22d3ee' }}>|Φ⁺⟩ = (|00⟩ + |11⟩) / √2 &nbsp;← <span style={{ color: 'var(--muted)' }}>this experiment</span></div>
              <div style={{ color: 'var(--muted)' }}>|Φ⁻⟩ = (|00⟩ − |11⟩) / √2</div>
              <div style={{ color: 'var(--muted)' }}>|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2</div>
              <div style={{ color: 'var(--muted)' }}>|Ψ⁻⟩ = (|01⟩ − |10⟩) / √2</div>
            </div>
            <p style={{ lineHeight: 1.8, marginTop: 12, fontSize: '0.85rem' }}>
              Each qubit's reduced density matrix is the maximally mixed state <em>ρ = I/2</em>,
              yet the composite state is pure — a hallmark of quantum correlations that violate Bell inequalities.
            </p>
          </div>
        </div>
      </section>

      {/* Circuit diagram */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">CIRCUIT</h2></div>
        <div className="card" style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", padding: 32 }}>
          <div style={{ fontSize: '1.1rem', lineHeight: 2.2, letterSpacing: '0.05em', color: 'rgba(212,212,216,1)' }}>
            <div>q0 : ───[&nbsp;H&nbsp;]───●───[M]</div>
            <div style={{ color: 'var(--dim)', margin: '0 0 0 108px' }}>│</div>
            <div>q1 : ─────────⊕───[M]</div>
          </div>
        </div>
      </section>

      {/* Step walkthrough */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">WALKTHROUGH</h2></div>
        <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STEPS.map((s, i) => (
            <div
              className="card"
              key={i}
              style={{
                borderColor: i === activeStep && running ? 'rgba(34,211,238,0.6)' : undefined,
                opacity: result ? 1 : (i <= activeStep ? 1 : 0.4),
                transition: 'all 0.3s ease',
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>STEP {i}</div>
              <h3 style={{ margin: '0 0 8px' }}>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Backend explainer */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">QUANTUM BACKENDS</h2></div>
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--muted)', lineHeight: 1.7, margin: '0 0 16px' }}>
            EdgeQuanta connects to <strong style={{ color: '#22d3ee' }}>Origin Quantum Cloud</strong> —
            China's leading quantum computing platform operated by{' '}
            <strong style={{ color: '#e4e4e7' }}>Origin Quantum (本源量子)</strong>.
            You can run experiments on a <em>local software simulator</em> for instant results,
            or submit circuits to <em>real superconducting quantum processors</em> and
            high-performance computing clusters deployed remotely via the Origin QPilot service.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Real Chips */}
            <div className="card" style={{ background: 'rgba(34,211,238,0.04)', borderColor: 'rgba(34,211,238,0.15)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>⚛ QUANTUM CHIPS</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Real superconducting quantum processors. Circuits are compiled to native gate sets
                and executed on physical qubits. Results include real-world noise from decoherence,
                gate errors, and readout imperfections.
              </p>
              <div style={{ marginTop: 12, fontSize: '0.75rem' }}>
                {backends.filter(b => b.type === 'chip').map(b => (
                  <span key={b.name} style={{
                    display: 'inline-block', marginRight: 8, marginBottom: 4,
                    padding: '2px 8px', borderRadius: 4,
                    background: b.available ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.05)',
                    color: b.available ? '#22d3ee' : 'var(--dim)',
                    border: `1px solid ${b.available ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    {b.name} · {b.max_qubits}Q {b.available ? '●' : '○'}
                  </span>
                ))}
                {backends.filter(b => b.type === 'chip').length === 0 && (
                  <span style={{ color: 'var(--dim)' }}>NO CLOUD CONNECTION</span>
                )}
              </div>
            </div>
            {/* Cloud Simulators */}
            <div className="card" style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>🔬 HPC SIMULATORS</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                High-performance computing clusters that simulate quantum behavior at scale.
                Full-amplitude simulation gives exact state vectors up to 33 qubits.
                Single-amplitude mode can handle circuits up to 200 qubits.
              </p>
              <div style={{ marginTop: 12, fontSize: '0.75rem' }}>
                {backends.filter(b => b.type === 'simulator' && b.name !== 'local_sim').map(b => (
                  <span key={b.name} style={{
                    display: 'inline-block', marginRight: 8, marginBottom: 4,
                    padding: '2px 8px', borderRadius: 4,
                    background: b.available ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
                    color: b.available ? '#818cf8' : 'var(--dim)',
                    border: `1px solid ${b.available ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    {b.name} · {b.max_qubits}Q {b.available ? '●' : '○'}
                  </span>
                ))}
              </div>
            </div>
            {/* Local */}
            <div className="card" style={{ background: 'rgba(163,230,53,0.04)', borderColor: 'rgba(163,230,53,0.15)' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>🖥 LOCAL SIMULATOR</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                In-browser noise model running on the EdgeQuanta server.
                Instant results with simulated decoherence — ideal for learning and rapid iteration
                without consuming cloud resources.
              </p>
              <div style={{ marginTop: 12, fontSize: '0.75rem' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                  background: 'rgba(163,230,53,0.12)', color: '#a3e635',
                  border: '1px solid rgba(163,230,53,0.25)',
                }}>
                  local_sim · 30Q ●
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Run controls */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">RUN EXPERIMENT</h2></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="dash-form">
            <div className="form-group">
              <label>BACKEND</label>
              <select
                className="form-input"
                value={selectedBackend}
                onChange={(e) => setSelectedBackend(e.target.value)}
              >
                {backends.map((b) => (
                  <option key={b.name} value={b.name} disabled={!b.available}>
                    {b.name === 'local_sim' ? '🖥 LOCAL SIMULATOR' :
                      `${b.type === 'chip' ? '⚛' : '🔬'} ${b.name.toUpperCase()}`}
                    {' '}({b.max_qubits}Q{b.available ? '' : ' — OFFLINE'})
                  </option>
                ))}
              </select>
              {currentBackend && currentBackend.name !== 'local_sim' && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(34,211,238,0.7)', marginTop: 4 }}>
                  {currentBackend.type === 'chip' ? 'REAL QUANTUM HARDWARE' : 'HPC CLOUD SIMULATOR'} · {currentBackend.provider}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>SHOTS</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={100000}
                value={shots}
                onChange={(e) => setShots(+e.target.value)}
              />
            </div>
            <button className="pill" onClick={run} disabled={running}>
              {running ? 'RUNNING…' : 'RUN BELL STATE'}
            </button>
            {!cloudConnected && (
              <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginTop: 8 }}>
                CLOUD NOT CONNECTED — SET ORIGIN_QUANTUM_API_KEY IN .ENV FOR REAL HARDWARE
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="section">
          <div className="section-header"><h2 className="section-title">RESULTS</h2></div>

          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
            <div className="card metric-card">
              <div className="metric-value">{result.fidelity}</div>
              <div className="metric-label">BELL FIDELITY</div>
            </div>
            <div className="card metric-card">
              <div className="metric-value">{result.shots.toLocaleString()}</div>
              <div className="metric-label">TOTAL SHOTS</div>
            </div>
            <div className="card metric-card">
              <div className="metric-value" style={{ fontSize: '1rem' }}>{result.backend?.toUpperCase() || 'LOCAL'}</div>
              <div className="metric-label">BACKEND</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--dim)', marginTop: 4 }}>{result.provider}</div>
            </div>
            <div className="card metric-card">
              <div className="mono" style={{ color: 'rgba(34,211,238,0.8)', fontSize: '0.75rem' }}>{result.task_id}</div>
              <div className="metric-label" style={{ marginTop: 8 }}>TASK ID</div>
            </div>
          </div>

          {/* Histogram */}
          <div className="card">
            <h3>MEASUREMENT HISTOGRAM</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
              {Object.entries(result.counts).map(([state, count]) => {
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                const isCorrelated = state === '00' || state === '11';
                return (
                  <div key={state} style={{ textAlign: 'center' }}>
                    <div style={{
                      height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 8,
                    }}>
                      <div style={{
                        width: '60%',
                        height: `${Math.max(pct, 2)}%`,
                        borderRadius: '6px 6px 0 0',
                        background: isCorrelated
                          ? 'linear-gradient(180deg, #22d3ee, #3b82f6)'
                          : 'rgba(255,255,255,0.1)',
                        transition: 'height 0.6s ease',
                      }} />
                    </div>
                    <div style={{ fontFamily: "'SF Mono', monospace", fontSize: '1.1rem', fontWeight: 600, color: isCorrelated ? '#22d3ee' : 'var(--dim)' }}>
                      |{state}⟩
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: 4 }}>
                      {count.toLocaleString()} ({result.probabilities[state]})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Interpreting results */}
          <div className="card" style={{ marginTop: 24, borderColor: 'rgba(34,211,238,0.12)' }}>
            <h3>INTERPRETING YOUR RESULTS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8, color: '#a3e635' }}>WHAT TO LOOK FOR</div>
                <ul style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
                  <li>The <strong style={{ color: '#22d3ee' }}>|00⟩</strong> and <strong style={{ color: '#22d3ee' }}>|11⟩</strong> bars should be roughly equal in height — each near 50%.</li>
                  <li>The <strong style={{ color: 'var(--dim)' }}>|01⟩</strong> and <strong style={{ color: 'var(--dim)' }}>|10⟩</strong> bars should be absent (simulator) or very small (real hardware).</li>
                  <li><strong style={{ color: '#e4e4e7' }}>Fidelity</strong> close to 1.0 means your result closely matches the ideal Bell state.</li>
                </ul>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 8, color: '#818cf8' }}>SIMULATOR VS. REAL CHIP</div>
                <p style={{ lineHeight: 1.8, margin: 0 }}>
                  On a <em>simulator</em>, you'll see a near-perfect 50/50 split between |00⟩ and |11⟩ with zero |01⟩ or |10⟩.
                  On <em>real hardware</em>, noise from decoherence (T1/T2 decay), imperfect gates, and readout errors
                  will produce small populations in the |01⟩ and |10⟩ states.
                  This is normal — that noise is the reason quantum error correction exists,
                  and studying it is a core part of quantum information research.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Theory deep dive — always visible */}
      <section className="section">
        <div className="section-header"><h2 className="section-title">THEORY</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Step-by-step derivation */}
          <div className="card">
            <h3>STEP-BY-STEP STATE EVOLUTION</h3>
            <div style={{ fontFamily: "'SF Mono', monospace", fontSize: '0.82rem', lineHeight: 2.2, marginTop: 12 }}>
              <div><span style={{ color: 'var(--dim)' }}>1. INIT</span> &nbsp; |ψ₀⟩ = <span style={{ color: '#22d3ee' }}>|0⟩ ⊗ |0⟩</span> = |00⟩</div>
              <div><span style={{ color: 'var(--dim)' }}>2. H(q₀)</span> &nbsp;|ψ₁⟩ = <span style={{ color: '#22d3ee' }}>(|0⟩+|1⟩)/√2</span> ⊗ |0⟩ = (|00⟩+|10⟩)/√2</div>
              <div><span style={{ color: 'var(--dim)' }}>3. CNOT</span> &nbsp;|ψ₂⟩ = (|00⟩+|11⟩)/√2 = <span style={{ color: '#22d3ee' }}>|Φ⁺⟩</span></div>
              <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.78rem' }}>
                The CNOT flips q₁ when q₀ = |1⟩, mapping |10⟩ → |11⟩ and creating the entangled state.
              </div>
            </div>
          </div>
          {/* Key concepts */}
          <div className="card">
            <h3>KEY CONCEPTS</h3>
            <div style={{ display: 'grid', gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>SUPERPOSITION</div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                  A qubit can exist in a linear combination α|0⟩ + β|1⟩ where |α|² + |β|² = 1.
                  The Hadamard gate creates an equal superposition with α = β = 1/√2.
                </p>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>ENTANGLEMENT</div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                  A multi-qubit state that cannot be written as a tensor product of individual qubit states.
                  Measuring one qubit instantaneously determines the other's outcome — regardless of distance.
                </p>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>FIDELITY</div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                  F = ⟨Φ⁺|ρ|Φ⁺⟩ measures how close your experimental density matrix ρ is to the ideal Bell state.
                  F = 1 means a perfect match; real hardware typically achieves F {'>'} 0.9 on 2-qubit circuits.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Further reading */}
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(99,102,241,0.12)' }}>
          <h3>FURTHER READING</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>FOR NEWCOMERS</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.85rem', lineHeight: 2 }}>
                <li>IBM Quantum Learning — <em>Basics of Quantum Information</em></li>
                <li>Qiskit Textbook — <em>Single Qubit Gates</em></li>
                <li>3Blue1Brown — <em>Some light quantum mechanics</em></li>
              </ul>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>FOR RESEARCHERS</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.85rem', lineHeight: 2 }}>
                <li>Nielsen & Chuang — <em>Quantum Computation and Quantum Information</em></li>
                <li>Preskill — <em>Quantum Computing in the NISQ Era and Beyond</em></li>
                <li>Origin Quantum — <em>QPanda3 Documentation</em></li>
              </ul>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>APPLICATIONS</div>
              <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.85rem', lineHeight: 2 }}>
                <li>Quantum Key Distribution (QKD / BB84)</li>
                <li>Quantum Teleportation protocols</li>
                <li>Superdense Coding</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

