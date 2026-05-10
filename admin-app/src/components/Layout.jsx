import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { to: '/',          label: 'Dashboard', icon: '📊' },
    { to: '/products',  label: 'Products',  icon: '📦' },
    { to: '/batches',   label: 'Batches',   icon: '🚢' },
    { to: '/orders',    label: 'Orders',    icon: '🧾' },
  ];

  return (
    <div className="layout">
      <header className="topbar">
        <div className="topbar__left">
          <button className="topbar__menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? '✕' : '☰'}
          </button>
          <span className="topbar__brand">Sally</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </header>

      <nav className={`mobile-nav ${menuOpen ? 'mobile-nav--open' : ''}`}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </nav>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">{l.icon}</span>
            <span className="bottom-nav__label">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
