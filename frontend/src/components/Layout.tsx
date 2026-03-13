import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Background from './Background';
import type { AuthUser } from '../services/api';
import { auth } from '../services/api';

const NAV_LINKS = [
  { to: '/platform', label: 'PLATFORM', protected: true },
  { to: '/observability', label: 'OBSERVABILITY', protected: true },
  { to: '/access', label: 'ACCESS', protected: true },
  { to: '/demo', label: 'DEMO', protected: true },
  { to: '/chat', label: 'CHAT', protected: true },
  { to: '/docs', label: 'DOCS', protected: false },
  { to: '/contact', label: 'CONTACT', protected: false },
];

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const day = days[now.getUTCDay()];
      const ts = now.toISOString().substring(11, 19);
      setTime(`${day} ${ts} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}

interface LayoutProps {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
}

export default function Layout({ user, setUser }: LayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hideGlobalBg = pathname === '/chat';

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
    navigate('/');
  };

  const visibleLinks = NAV_LINKS.filter((l) => !l.protected || user);

  return (
    <>
      {!hideGlobalBg && <Background />}
      <NavLink to="/" className="wordmark">EDGE QUANTA</NavLink>
      <nav className="topnav">
        {visibleLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {l.label}
          </NavLink>
        ))}
        {user ? (
          <button onClick={handleLogout} className="nav-auth-btn">LOGOUT</button>
        ) : (
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
            LOGIN
          </NavLink>
        )}
      </nav>

      <div className="site-shell">
        <main>
          <Outlet />
        </main>
        <footer className="site-footer">
          <span>EDGE QUANTA</span>
          <Clock />
        </footer>
      </div>
    </>
  );
}

