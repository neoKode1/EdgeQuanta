import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <section className="hero">
        <div className="login-card">
          <h1 className="hero-title">CHECK YOUR EMAIL</h1>
          <p className="hero-sub" style={{ maxWidth: 420, margin: '0 auto' }}>
            We sent a magic link to <strong style={{ color: 'var(--accent)' }}>{email}</strong>.
            Click the link to sign in. It expires in 15 minutes.
          </p>
          <button
            className="cta"
            onClick={() => { setSent(false); setEmail(''); }}
            style={{ marginTop: 24 }}
          >
            ← TRY ANOTHER EMAIL
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="hero">
      <div className="login-card">
        <h1 className="hero-title">SIGN IN</h1>
        <p className="hero-sub">Enter your email to receive a magic link</p>

        <form onSubmit={handleSubmit} style={{ marginTop: 32, maxWidth: 400, margin: '32px auto 0' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="login-input"
          />
          <button type="submit" className="cta" disabled={loading} style={{ width: '100%', marginTop: 16 }}>
            {loading ? 'SENDING…' : 'SEND MAGIC LINK →'}
          </button>
          {error && <p style={{ color: '#ff4444', marginTop: 12, fontSize: 14 }}>{error}</p>}
        </form>
      </div>
    </section>
  );
}

