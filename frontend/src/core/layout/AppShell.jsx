import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHousehold } from '../household/HouseholdContext';
import { NotificationBell } from '../../apps/notifications/components/NotificationBell';
import { GlobalSearch } from '../../apps/search/components/GlobalSearch';
import { QuickCaptureModal } from '../../apps/quickcapture/QuickCaptureModal';
import { Logo } from '../components/Logo';

// Faza 1: statična lista. Od Faze 6/7 ovo dolazi iz appRegistry.getNavItems()
const NAV_ITEMS = [
  { path: '/', label: 'Početna tabla', icon: '☰' },
  { path: '/tasks', label: 'Taskovi', icon: '✓' },
  { path: '/kanban', label: 'Kanban', icon: '▤' },
  { path: '/finance', label: 'Finansije', icon: '$' },
  { path: '/life-admin', label: 'Life Admin', icon: '⌘' },
  { path: '/settings', label: 'Postavke', icon: '⚙' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { household, error } = useHousehold();
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="sidebar-brand" style={{ textDecoration: 'none' }}>
          <Logo size="sm" />
        </NavLink>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          {household && <GlobalSearch householdId={household.id} />}
          <div className="topbar-user">
            {household && (
              <button className="btn btn-primary" onClick={() => setQuickCaptureOpen(true)}>
                + Brzo dodaj
              </button>
            )}
            <NotificationBell />
            <span className="topbar-email">{user?.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              Odjava
            </button>
          </div>
        </header>

        {error && (
          <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '10px 28px', fontSize: 13 }}>
            Greška pri učitavanju domaćinstva: {error}
          </div>
        )}

        <main className="shell-content">
          <Outlet />
        </main>
      </div>

      {quickCaptureOpen && household && (
        <QuickCaptureModal householdId={household.id} onClose={() => setQuickCaptureOpen(false)} />
      )}
    </div>
  );
}
