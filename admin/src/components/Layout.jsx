import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/sessions', label: 'Sessions', icon: '🎥' },
  { to: '/users', label: 'Users', icon: '👥' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>⚡</span>
          <span style={styles.brandText}>Bodha Admin</span>
        </div>

        <nav style={styles.nav}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}
            >
              <span style={styles.navIcon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>{user?.email?.[0]?.toUpperCase() ?? 'A'}</div>
            <div style={styles.userMeta}>
              <div style={styles.userName}>{user?.name ?? 'Admin'}</div>
              <div style={styles.userEmail}>{user?.email ?? ''}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </aside>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    width: 220, background: '#1E1B4B', color: '#E0E7FF',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '24px 20px 20px', borderBottom: '1px solid #312E81',
  },
  brandIcon: { fontSize: 22 },
  brandText: { fontWeight: 700, fontSize: 16, color: '#fff' },
  nav: { flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8, color: '#A5B4FC',
    textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
  },
  navItemActive: { background: '#312E81', color: '#fff' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  sidebarFooter: { padding: '16px 12px', borderTop: '1px solid #312E81' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: '#4F46E5', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  userMeta: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, color: '#E0E7FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { fontSize: 11, color: '#818CF8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  logoutBtn: {
    width: '100%', padding: '8px 0', background: 'transparent',
    border: '1px solid #312E81', borderRadius: 6, color: '#A5B4FC',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  main: { flex: 1, overflow: 'auto', background: '#F5F3FF' },
};
