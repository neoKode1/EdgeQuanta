import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ApiKey, Reservation } from '../services/api';

export default function Access() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [keyForm, setKeyForm] = useState({ name: '', tier: 'standard' });
  const [resForm, setResForm] = useState({ system_type: 'superconducting', duration_minutes: 30, reason: '' });

  useEffect(() => {
    api.getKeys().then((d) => setKeys(d.keys)).catch(() => {});
    api.getReservations().then((d) => setReservations(d.reservations)).catch(() => {});
  }, []);

  const createKey = async () => {
    if (!keyForm.name) return;
    try {
      const k = await api.createKey(keyForm.name, keyForm.tier);
      setKeys((prev) => [k, ...prev]);
      setKeyForm({ name: '', tier: 'standard' });
    } catch (e) { console.error(e); }
  };

  const createRes = async () => {
    if (!resForm.reason) return;
    try {
      const r = await api.createReservation(resForm);
      setReservations((prev) => [r, ...prev]);
      setResForm({ ...resForm, reason: '' });
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">Access</div>
        <h1>API keys and system reservations</h1>
        <p>Manage programmatic access credentials and reserve dedicated time on quantum backends.</p>
        <div className="watermark">ACCESS</div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">API KEYS</h2></div>
        <div className="grid-2">
          <div className="card">
            <h3>GENERATE KEY</h3>
            <div className="dash-form">
              <div className="form-group">
                <label>KEY NAME</label>
                <input className="form-input" value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} placeholder="e.g. prod-backend" />
              </div>
              <div className="form-group">
                <label>TIER</label>
                <select className="form-select" value={keyForm.tier} onChange={(e) => setKeyForm({ ...keyForm, tier: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <button className="pill" onClick={createKey}>CREATE KEY</button>
            </div>
          </div>
          <div className="card">
            <h3>ACTIVE KEYS</h3>
            {keys.length > 0 ? keys.map((k) => (
              <div className="key-row" key={k.key}>
                <div>
                  <div className="mono">{k.key.slice(0, 12)}…</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{k.name} · {k.tier}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{k.used}/{k.quota}</div>
              </div>
            )) : <p style={{ color: 'var(--muted)' }}>No keys yet</p>}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">RESERVATIONS</h2></div>
        <div className="grid-2">
          <div className="card">
            <h3>BOOK TIME</h3>
            <div className="dash-form">
              <div className="form-group">
                <label>SYSTEM</label>
                <select className="form-select" value={resForm.system_type} onChange={(e) => setResForm({ ...resForm, system_type: e.target.value })}>
                  <option value="superconducting">Superconducting</option>
                  <option value="ion_trap">Ion Trap</option>
                  <option value="neutral_atom">Neutral Atom</option>
                  <option value="photonic">Photonic</option>
                </select>
              </div>
              <div className="form-group">
                <label>DURATION (MIN)</label>
                <input className="form-input" type="number" value={resForm.duration_minutes} onChange={(e) => setResForm({ ...resForm, duration_minutes: +e.target.value })} />
              </div>
              <div className="form-group">
                <label>REASON</label>
                <input className="form-input" value={resForm.reason} onChange={(e) => setResForm({ ...resForm, reason: e.target.value })} placeholder="e.g. calibration experiment" />
              </div>
              <button className="pill" onClick={createRes}>RESERVE</button>
            </div>
          </div>
          <div className="card">
            <h3>ACTIVE RESERVATIONS</h3>
            {reservations.length > 0 ? (
              <table className="dash-table">
                <thead><tr><th>SYSTEM</th><th>DURATION</th><th>STATUS</th></tr></thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td>{r.system_type}</td>
                      <td>{r.duration_minutes}m</td>
                      <td><span className={`status-dot ${r.status}`} />{r.status.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ color: 'var(--muted)' }}>No reservations</p>}
          </div>
        </div>
      </section>
    </>
  );
}

