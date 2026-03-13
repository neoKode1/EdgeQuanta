import { useState, useEffect } from 'react';
import { api, connectWS, onEvent } from '../services/api';
import type { MetricsGlobal, SystemMetrics, WSEvent } from '../services/api';

export default function Observability() {
  const [global, setGlobal] = useState<MetricsGlobal | null>(null);
  const [systems, setSystems] = useState<SystemMetrics[]>([]);
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    const load = () => {
      api.getMetrics().then((d) => { setGlobal(d.global); setSystems(d.systems); }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);

    connectWS();
    const unsub = onEvent((ev: WSEvent) => {
      const msg = `[${new Date().toISOString().substring(11, 19)}] ${ev.type}: ${ev.task_id || ev.status || JSON.stringify(ev).slice(0, 60)}`;
      setFeed((prev) => [msg, ...prev].slice(0, 50));
    });
    return () => { clearInterval(interval); unsub(); };
  }, []);

  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Observability</div>
        <h1>Live system telemetry</h1>
        <p>Real-time metrics, calibration status, and event feeds across all connected quantum backends.</p>
        <div className="watermark">OBSERVE</div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">GLOBAL METRICS</h2></div>
        <div className="grid-4">
          {[
            { label: 'TOTAL JOBS', value: global?.total ?? '—' },
            { label: 'COMPLETED', value: global?.completed ?? '—' },
            { label: 'FAILED', value: global?.failed ?? '—' },
            { label: 'ACTIVE', value: global?.active ?? '—' },
          ].map((m) => (
            <div className="card metric-card" key={m.label}>
              <div className="metric-value">{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">SYSTEM STATUS</h2></div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead><tr><th>SYSTEM</th><th>CHIP</th><th>FIDELITY</th><th>QUEUE</th><th>CAL AGE</th><th>STATUS</th></tr></thead>
            <tbody>
              {systems.map((s) => (
                <tr key={s.system}>
                  <td>{s.system}</td>
                  <td className="mono">{s.chip_id}</td>
                  <td>{(s.fidelity * 100).toFixed(1)}%</td>
                  <td>{s.queue_depth}</td>
                  <td>{s.calibration_age_min}m</td>
                  <td><span className={`status-dot ${s.status}`} />{s.status.toUpperCase()}</td>
                </tr>
              ))}
              {systems.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>Waiting for data…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">EVENT FEED</h2></div>
        <div className="card">
          <div className="feed-panel">
            {feed.length > 0
              ? feed.map((msg, i) => <div className="feed-item mono" key={i}>{msg}</div>)
              : <p style={{ color: 'var(--muted)' }}>No events yet — waiting for WebSocket data…</p>
            }
          </div>
        </div>
      </section>
    </>
  );
}

