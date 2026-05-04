import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI } from '../api/index.js';

const STATE_COLOR = {
  UPCOMING: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  LIVE: { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  DOUBT_SESSION: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  COMPLETED: { bg: '#F9FAFB', text: '#374151', dot: '#9CA3AF' },
};

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    sessionAPI.list()
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch((err) => setError(err?.message || 'Failed to load sessions'))
      .finally(() => setLoading(false));
  }, []);

  const counts = sessions.reduce((acc, s) => {
    acc[s.state] = (acc[s.state] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Total Sessions', value: sessions.length, icon: '🎥', color: '#4F46E5' },
    { label: 'Live Now', value: counts.LIVE ?? 0, icon: '🔴', color: '#DC2626' },
    { label: 'Upcoming', value: counts.UPCOMING ?? 0, icon: '📅', color: '#2563EB' },
    { label: 'Completed', value: counts.COMPLETED ?? 0, icon: '✅', color: '#16A34A' },
  ];

  const recent = [...sessions]
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
    .slice(0, 10);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>Dashboard</h2>
          <p style={styles.pageSubtitle}>Overview of all sessions and activity</p>
        </div>
        <Link to="/sessions" style={styles.newBtn}>+ New Session</Link>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error} — make sure the backend server is running on port 5000.
        </div>
      )}

      <div style={styles.statsGrid}>
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: color + '18' }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
            </div>
            <div>
              <div style={{ ...styles.statValue, color }}>{value}</div>
              <div style={styles.statLabel}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Sessions</h3>
          <Link to="/sessions" style={styles.viewAll}>View all →</Link>
        </div>

        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={styles.empty}>
            No sessions yet. <Link to="/sessions">Create your first session →</Link>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.thead}>
              <div style={{ ...styles.th, flex: 3 }}>Title</div>
              <div style={{ ...styles.th, flex: 2 }}>Instructor</div>
              <div style={{ ...styles.th, flex: 2 }}>Scheduled</div>
              <div style={{ ...styles.th, flex: 1 }}>State</div>
              <div style={{ ...styles.th, flex: 1 }}></div>
            </div>
            {recent.map((s) => {
              const col = STATE_COLOR[s.state] ?? STATE_COLOR.COMPLETED;
              return (
                <div key={s._id} style={styles.row}>
                  <div style={{ ...styles.td, flex: 3 }}>
                    <div style={{ fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{s.category}</div>
                  </div>
                  <div style={{ ...styles.td, flex: 2, color: '#6B7280' }}>{s.instructor?.name ?? '—'}</div>
                  <div style={{ ...styles.td, flex: 2, color: '#6B7280' }}>
                    {new Date(s.scheduledAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ ...styles.td, flex: 1 }}>
                    <span style={{ ...styles.badge, background: col.bg, color: col.text }}>
                      <span style={{ ...styles.dot, background: col.dot }} />
                      {s.state.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ ...styles.td, flex: 1 }}>
                    <Link to={`/sessions/${s._id}`} style={styles.detailLink}>Details →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: '32px 36px', maxWidth: 1100 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#1E1B4B', marginBottom: 2 },
  pageSubtitle: { fontSize: 13, color: '#9CA3AF' },
  newBtn: { padding: '9px 20px', background: '#4F46E5', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' },
  errorBanner: { background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#C2410C', marginBottom: 20 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  statIcon: { width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  section: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #F3F4F6' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1E1B4B' },
  viewAll: { fontSize: 13, color: '#4F46E5', textDecoration: 'none', fontWeight: 600 },
  empty: { padding: '32px 22px', color: '#9CA3AF', fontSize: 14 },
  table: { width: '100%' },
  thead: { display: 'flex', padding: '10px 22px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' },
  th: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #F9FAFB' },
  td: { fontSize: 13, color: '#111827', paddingRight: 12 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  detailLink: { fontSize: 12, color: '#4F46E5', textDecoration: 'none', fontWeight: 600 },
};
