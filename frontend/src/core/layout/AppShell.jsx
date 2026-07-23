import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHousehold } from '../household/HouseholdContext';

// Faza 1: statična lista. Od Faze 6/7 ovo dolazi iz appRegistry.getNavItems()
const NAV_ITEMS = [
  { path: '/', label: 'Danas', icon: '☰' },
  { path: '/tasks', label: 'Taskovi', icon: '✓' },
  { path: '/kanban', label: 'Kanban', icon: '▤' },
  { path: '/settings', label: 'Postavke', icon: '⚙' },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { household } = useHousehold();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">Home OS</div>
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
          <span className="household-name-display">{household?.name ?? 'Home OS'}</span>
          <div className="topbar-user">
            <span className="topbar-email">{user?.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              Odjava
            </button>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
