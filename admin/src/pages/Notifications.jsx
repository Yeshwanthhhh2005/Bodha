import React, { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../api/index.js';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Notifications() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({ title: '', message: '', targetAll: true });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadBroadcasts = useCallback(async () => {
    try {
      const data = await notificationAPI.listBroadcasts();
      setBroadcasts(Array.isArray(data) ? data : []);
    } catch {
      setBroadcasts([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadBroadcasts(); }, [loadBroadcasts]);

  const handleSend = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.title.trim() || !form.message.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      const res = await notificationAPI.send({ title: form.title.trim(), message: form.message.trim() });
      setFormSuccess(`Sent to ${res?.recipientCount ?? 'all'} students.`);
      setForm({ title: '', message: '', targetAll: true });
      loadBroadcasts();
    } catch (err) {
      setFormError(err?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (broadcastId) => {
    if (!window.confirm('Delete this broadcast? It will be removed for all students.')) return;
    setDeletingId(broadcastId);
    try {
      await notificationAPI.deleteBroadcast(broadcastId);
      setBroadcasts((prev) => prev.filter((b) => b._id !== broadcastId));
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>Notifications</h1>
      <p style={s.pageSub}>Send announcements to all students.</p>

      {/* Send Form */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Send Notification</h2>
        <form onSubmit={handleSend} style={s.form}>
          <label style={s.label}>Title</label>
          <input
            style={s.input}
            placeholder="e.g. New Session Added"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={120}
          />

          <label style={s.label}>Message</label>
          <textarea
            style={{ ...s.input, minHeight: 90, resize: 'vertical' }}
            placeholder="Write your announcement here…"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            maxLength={500}
          />

          <div style={s.targetRow}>
            <span style={s.label}>Target: </span>
            <span style={s.targetChip}>🎓 All Students</span>
          </div>

          {formError && <p style={s.error}>{formError}</p>}
          {formSuccess && <p style={s.success}>{formSuccess}</p>}

          <button type="submit" style={s.sendBtn} disabled={sending}>
            {sending ? 'Sending…' : '📤 Send Notification'}
          </button>
        </form>
      </div>

      {/* Sent Broadcasts */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Sent Broadcasts</h2>
        {loadingList ? (
          <p style={s.muted}>Loading…</p>
        ) : broadcasts.length === 0 ? (
          <div style={s.emptyState}>
            <span style={s.emptyIcon}>📭</span>
            <p style={s.emptyText}>No broadcasts sent yet.</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Title', 'Message', 'Recipients', 'Read', 'Sent', ''].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b._id} style={s.tr}>
                  <td style={s.td}><strong>{b.title}</strong></td>
                  <td style={{ ...s.td, maxWidth: 300 }}>{b.message}</td>
                  <td style={s.td}>{b.recipientCount}</td>
                  <td style={s.td}>
                    <span style={s.readPill}>
                      {b.readCount}/{b.recipientCount}
                    </span>
                  </td>
                  <td style={s.td}>{timeAgo(b.createdAt)}</td>
                  <td style={s.td}>
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(b._id)}
                      disabled={deletingId === b._id}
                    >
                      {deletingId === b._id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px 36px', maxWidth: 860, margin: '0 auto' },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  pageSub: { color: '#6B7280', marginTop: 4, marginBottom: 28, fontSize: 14 },
  card: {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 28,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#1E1B4B', margin: '0 0 18px' },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB',
    fontSize: 14, color: '#111827', outline: 'none', fontFamily: 'inherit',
    background: '#FAFAFA',
  },
  targetRow: { display: 'flex', alignItems: 'center', gap: 8 },
  targetChip: {
    background: '#EDE9FE', color: '#4C1D95', fontSize: 12, fontWeight: 600,
    padding: '4px 10px', borderRadius: 20,
  },
  error: { color: '#DC2626', fontSize: 13, margin: 0 },
  success: { color: '#16A34A', fontSize: 13, margin: 0 },
  sendBtn: {
    background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8,
    padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    alignSelf: 'flex-start', marginTop: 4,
  },
  emptyState: { textAlign: 'center', padding: '32px 0' },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  muted: { color: '#9CA3AF', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', color: '#6B7280', fontWeight: 600, borderBottom: '1.5px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '12px 12px', color: '#374151', verticalAlign: 'top' },
  readPill: { background: '#F3F4F6', padding: '2px 8px', borderRadius: 12, fontSize: 12, color: '#6B7280' },
  deleteBtn: {
    background: 'transparent', border: '1px solid #FCA5A5', color: '#DC2626',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
};
