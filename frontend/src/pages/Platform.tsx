import { useState, useEffect } from 'react';
import { api, connectWS, onEvent, statusBadge, timeAgo } from '../services/api';
import type { Job, SystemInfo } from '../services/api';

export default function Platform() {
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState({ system_type: 'superconducting', shots: 1024, qubits: 4, priority: 1 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSystems().then((d) => setSystems(d.systems)).catch(() => {});
    api.getJobs(20).then((d) => setJobs(d.jobs)).catch(() => {});
    connectWS();
    const unsub = onEvent((ev) => {
      if (ev.type === 'job_update' && ev.job) {
        setJobs((prev) => {
          const idx = prev.findIndex((j) => j.task_id === ev.job!.task_id);
          if (idx >= 0) { const next = [...prev]; next[idx] = ev.job!; return next; }
          return [ev.job!, ...prev];
        });
      }
    });
    return unsub;
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      const job = await api.submitJob(form);
      setJobs((prev) => [job, ...prev]);
    } catch (e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Platform</div>
        <h1>Submit and track quantum tasks</h1>
        <p>Configure jobs, monitor execution, and retrieve results across all connected quantum backends.</p>
        <div className="watermark">PLATFORM</div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">SYSTEMS</h2></div>
        <div className="grid-4">
          {systems.map((s) => (
            <div className="card metric-card" key={s.id}>
              <h3>{s.chip_id || s.id}</h3>
              <div className="metric-value">{s.queue_depth}</div>
              <div className="metric-label">QUEUE DEPTH</div>
              <p style={{ marginTop: 8 }}><span className={`status-dot ${s.status}`} />{s.status.toUpperCase()}</p>
            </div>
          ))}
          {systems.length === 0 && <p style={{ color: 'var(--muted)' }}>No systems connected</p>}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">SUBMIT JOB</h2></div>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="dash-form">
            <div className="form-group">
              <label>SYSTEM TYPE</label>
              <select className="form-select" value={form.system_type} onChange={(e) => setForm({ ...form, system_type: e.target.value })}>
                <option value="superconducting">Superconducting</option>
                <option value="ion_trap">Ion Trap</option>
                <option value="neutral_atom">Neutral Atom</option>
                <option value="photonic">Photonic</option>
              </select>
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label>SHOTS</label>
                <input className="form-input" type="number" value={form.shots} onChange={(e) => setForm({ ...form, shots: +e.target.value })} />
              </div>
              <div className="form-group">
                <label>QUBITS</label>
                <input className="form-input" type="number" value={form.qubits} onChange={(e) => setForm({ ...form, qubits: +e.target.value })} />
              </div>
              <div className="form-group">
                <label>PRIORITY</label>
                <input className="form-input" type="number" min={1} max={10} value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })} />
              </div>
            </div>
            <button className="pill" onClick={submit} disabled={submitting}>{submitting ? 'SUBMITTING…' : 'SUBMIT TASK'}</button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">RECENT JOBS</h2></div>
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="dash-table">
            <thead><tr><th>TASK ID</th><th>SYSTEM</th><th>SHOTS</th><th>QUBITS</th><th>STATUS</th><th>SUBMITTED</th></tr></thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.task_id}>
                  <td className="mono">{j.task_id.slice(0, 8)}…</td>
                  <td>{j.system_type}</td>
                  <td>{j.shots}</td>
                  <td>{j.qubits}</td>
                  <td dangerouslySetInnerHTML={{ __html: statusBadge(j.status) }} />
                  <td>{timeAgo(j.submitted_at)}</td>
                </tr>
              ))}
              {jobs.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>No jobs yet</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

