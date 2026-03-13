import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1 className="hero-title reveal-up">EDGE QUANTA</h1>

        <div className="hero-grid">
          <div className="hero-copy reveal-up delay-200">
            <div className="eyebrow">Infrastructure Layer</div>
            <p className="intro">
              Quantum infrastructure as a product surface — access, observability,
              and scheduling for real quantum systems.
            </p>
          </div>

          <div className="hero-links reveal-up delay-200">
            <div className="kicker-list">
              <Link to="/platform">PLATFORM</Link>
              <Link to="/observability">OBSERVABILITY</Link>
              <Link to="/access">ACCESS</Link>
            </div>
          </div>

          <div className="hero-meta reveal-up delay-400">
            <div className="meta-list">
              <div>QUANTUM INFRASTRUCTURE</div>
              <div>REAL-TIME OBSERVABILITY</div>
              <div>PROTOCOL-LEVEL ACCESS</div>
            </div>
          </div>
        </div>

        <div className="hero-bottom">
          <div className="shimmer-line" />
          <div className="hero-bottom-row">
            <span>SUPERCONDUCTING</span>
            <span>ION TRAP</span>
            <span>NEUTRAL ATOM</span>
            <span>PHOTONIC</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">CAPABILITIES</h2>
          <p className="section-copy">
            Built on the QPilotos measurement and control protocol for superconducting,
            ion trap, neutral atom, and photonic quantum systems.
          </p>
        </div>

        {[
          { num: '01', title: 'TASK SUBMISSION', desc: 'Submit quantum tasks with configurable shots, qubits, and priority. Track status in real-time.', tag: 'CORE' },
          { num: '02', title: 'SYSTEM OBSERVABILITY', desc: 'Live fidelity metrics, calibration age, queue depth, and system health across all chip types.', tag: 'TELEMETRY' },
          { num: '03', title: 'ACCESS CONTROL', desc: 'API key management with tiered quotas. Reserve dedicated system time for critical workloads.', tag: 'SECURITY' },
          { num: '04', title: 'MULTI-CHIP SUPPORT', desc: 'Protocol adapters for superconducting, ion trap, neutral atom, and photonic architectures.', tag: 'PROTOCOL' },
        ].map((f) => (
          <div className="feature-row" key={f.num}>
            <div className="feature-num">{f.num}</div>
            <div className="feature-sep" />
            <div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
            <div className="feature-accent">
              <span className="accent-tag">{f.tag}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">USE CASES</h2>
          <p className="section-copy">
            Real-world applications powered by quantum infrastructure — from drug discovery
            to financial optimization.
          </p>
        </div>

        <div className="grid-3">
          {/* Pharma / Drug Discovery */}
          <div className="card" style={{ borderColor: 'rgba(34,211,238,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>PHARMACEUTICAL</div>
            <h3>MOLECULAR SIMULATION</h3>
            <p>
              Simulate molecular ground-state energies and reaction pathways that are
              intractable on classical hardware. Accelerate drug candidate screening by
              modeling protein-ligand binding at the quantum level.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>Variational Quantum Eigensolver (VQE)</li>
              <li>Quantum Phase Estimation</li>
              <li>Molecular Hamiltonian mapping</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">CHEMISTRY</span>
            </div>
          </div>

          {/* Finance */}
          <div className="card" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>FINANCE</div>
            <h3>PORTFOLIO OPTIMIZATION</h3>
            <p>
              Solve combinatorial optimization problems in asset allocation, risk analysis,
              and derivative pricing. Quantum annealing and QAOA find near-optimal portfolios
              across thousands of instruments.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>QAOA for constrained optimization</li>
              <li>Monte Carlo amplitude estimation</li>
              <li>Credit risk modeling</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">OPTIMIZATION</span>
            </div>
          </div>

          {/* Cryptography */}
          <div className="card" style={{ borderColor: 'rgba(163,230,53,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>SECURITY</div>
            <h3>QUANTUM CRYPTOGRAPHY</h3>
            <p>
              Implement and test quantum key distribution (QKD) protocols on real hardware.
              Prepare for the post-quantum transition by benchmarking lattice-based and
              code-based schemes against quantum attacks.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>BB84 / E91 key distribution</li>
              <li>Shor's algorithm benchmarking</li>
              <li>Post-quantum readiness testing</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">CRYPTOGRAPHY</span>
            </div>
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: 16 }}>
          {/* Materials Science */}
          <div className="card" style={{ borderColor: 'rgba(251,146,60,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>MATERIALS</div>
            <h3>MATERIALS DISCOVERY</h3>
            <p>
              Model crystal structures, superconductor behavior, and battery chemistry
              at the atomic level. Quantum simulation reveals material properties that
              classical density functional theory cannot capture.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>Lattice gauge theory simulation</li>
              <li>High-Tc superconductor modeling</li>
              <li>Battery electrolyte optimization</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">SIMULATION</span>
            </div>
          </div>

          {/* Machine Learning */}
          <div className="card" style={{ borderColor: 'rgba(244,114,182,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>AI / ML</div>
            <h3>QUANTUM MACHINE LEARNING</h3>
            <p>
              Explore quantum-enhanced feature spaces, kernel methods, and variational
              classifiers. Hybrid quantum-classical models can outperform classical baselines
              on structured, low-dimensional datasets.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>Quantum kernel estimation</li>
              <li>Parameterized quantum circuits</li>
              <li>Quantum generative models (QGAN)</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">HYBRID AI</span>
            </div>
          </div>

          {/* Logistics */}
          <div className="card" style={{ borderColor: 'rgba(34,211,238,0.12)' }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>LOGISTICS</div>
            <h3>SUPPLY CHAIN & ROUTING</h3>
            <p>
              Tackle NP-hard routing, scheduling, and supply chain problems.
              Quantum optimization finds high-quality solutions to vehicle routing,
              warehouse allocation, and network flow problems at scale.
            </p>
            <ul style={{ paddingLeft: 16, margin: '12px 0 0', color: 'rgba(161,161,170,1)', fontSize: '0.9375rem', lineHeight: 1.8 }}>
              <li>Travelling salesman (TSP) via QAOA</li>
              <li>Job-shop scheduling</li>
              <li>Network flow optimization</li>
            </ul>
            <div style={{ marginTop: 16 }}>
              <span className="accent-tag">OPERATIONS</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">METRICS</h2>
        </div>
        <div className="bento-grid">
          <div className="bento-item bento-wide">
            <h3 className="bento-title">SYSTEM OVERVIEW</h3>
            <p className="bento-desc">
              Real-time visibility into quantum system health, calibration status,
              and workload distribution across all connected backends.
            </p>
            <ul className="bento-list">
              <li>Live fidelity tracking</li>
              <li>Calibration age monitoring</li>
              <li>Queue depth indicators</li>
              <li>Multi-chip status dashboard</li>
            </ul>
            <div className="bento-glow bento-glow-cyan" />
          </div>
          <div className="bento-item bento-tall bento-stat">
            <div className="bento-stat-value">4<span className="bento-stat-unit"> TYPES</span></div>
            <div className="bento-stat-label">CHIP ARCHITECTURES</div>
          </div>
          <div className="bento-item bento-stat">
            <div className="bento-stat-value">&lt;50<span className="bento-stat-unit">MS</span></div>
            <div className="bento-stat-label">TELEMETRY LATENCY</div>
            <div className="bento-glow bento-glow-blue" />
          </div>
        </div>
      </section>
    </>
  );
}

