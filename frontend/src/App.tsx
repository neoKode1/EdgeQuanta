import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Platform from './pages/Platform';
import Observability from './pages/Observability';
import Access from './pages/Access';
import Docs from './pages/Docs';
import Contact from './pages/Contact';
import Demo from './pages/Demo';
import Chat from './pages/Chat';
import Login from './pages/Login';
import type { AuthUser } from './services/api';
import { auth } from './services/api';

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: AuthUser | null }) {
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.getSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--accent)', fontFamily: 'monospace' }}>LOADING…</div>;
  }

  return (
    <Routes>
      <Route element={<Layout user={user} setUser={setUser} />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/platform" element={<ProtectedRoute user={user}><Platform /></ProtectedRoute>} />
        <Route path="/observability" element={<ProtectedRoute user={user}><Observability /></ProtectedRoute>} />
        <Route path="/access" element={<ProtectedRoute user={user}><Access /></ProtectedRoute>} />
        <Route path="/demo" element={<ProtectedRoute user={user}><Demo /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute user={user}><Chat /></ProtectedRoute>} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
    </Routes>
  );
}

