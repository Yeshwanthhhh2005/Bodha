import React, { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../api/index.js';

const ROLES = ['student', 'instructor', 'admin'];
const ROLE_COLOR = {
  student:    { bg: '#EFF6FF', color: '#1D4ED8' },
  instructor: { bg: '#FFF7ED', color: '#C2410C' },
  admin:      { bg: '#F0FDF4', color: '#15803D' },
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'student' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userAPI.list(roleFilter === 'ALL' ? undefined : roleFilter);
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Name, email and password are required.');
      return;
    }
    setSaving(true);
    try {
      await userAPI.create(form);
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormError(err?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await userAPI.updateRole(id, newRole);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err?.message || 'Failed to update role');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await userAPI.delete(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err?.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const counts = { ALL: users.length };
  users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });

  return (
    <div style={s.page}>
      <div style={s.topRow}>
        <div>
          <h1 style={s.pageTitle}>Users</h1>
          <p style={s.pageSub}>Manage student and instructor accounts.</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(''); setForm(EMPTY_FORM); }} style={s.addBtn}>
          + Add User
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>Create New User</h3>
          <form onSubmit={handleCreate} style={s.form}>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Full Name</label>
                <input
                  style={s.input}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input
                  style={s.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="student@example.com"
                  required
                />
              </div>
            </div>
            <div style={s.row2}>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <input
                  style={s.input}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>Role</label>
                <select
                  style={s.input}
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {formError && <p style={s.error}>{formError}</p>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={s.cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={s.saveBtn}>
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role filter tabs */}
      <div style={s.filterRow}>
        {['ALL', ...ROLES].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            style={{
              ...s.filterBtn,
              ...(roleFilter === r ? s.filterBtnActive : {}),
            }}
          >
            {r} {counts[r] !== undefined ? <span style={s.filterCount}>({counts[r]})</span> : ''}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div style={s.card}>
        {loading ? (
          <p style={s.muted}>Loading users…</p>
        ) : users.length === 0 ? (
          <div style={s.empty}>
            <span style={s.emptyIcon}>👥</span>
            <p style={s.emptyText}>
              {roleFilter === 'ALL' ? 'No users yet.' : `No ${roleFilter}s found.`}
            </p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Joined', ''].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const rc = ROLE_COLOR[u.role] ?? ROLE_COLOR.student;
                return (
                  <tr key={u._id} style={s.tr}>
                    <td style={s.td}>
                      <div style={s.nameCell}>
                        <div style={s.avatar}>{u.name?.[0]?.toUpperCase() ?? '?'}</div>
                        <span style={s.userName}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: '#6B7280' }}>{u.email}</td>
                    <td style={s.td}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        style={{ ...s.roleSelect, background: rc.bg, color: rc.color }}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td style={{ ...s.td, color: '#9CA3AF', fontSize: 12 }}>
                      {new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={s.td}>
                      <button
                        style={s.deleteBtn}
                        disabled={deletingId === u._id}
                        onClick={() => handleDelete(u._id, u.name)}
                      >
                        {deletingId === u._id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px 36px', maxWidth: 960 },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#1E1B4B', margin: 0 },
  pageSub: { color: '#6B7280', marginTop: 4, fontSize: 14 },
  addBtn: {
    padding: '9px 20px', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  formCard: {
    background: '#fff', borderRadius: 12, padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20,
    border: '1.5px solid #E0E7FF',
  },
  formTitle: { fontSize: 15, fontWeight: 700, color: '#1E1B4B', margin: '0 0 16px' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, outline: 'none', color: '#111827', background: '#FAFAFA',
  },
  error: { color: '#DC2626', fontSize: 13, margin: 0 },
  saveBtn: { padding: '9px 22px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  cancelBtn: { padding: '9px 16px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  filterRow: { display: 'flex', gap: 8, marginBottom: 16 },
  filterBtn: {
    padding: '6px 16px', borderRadius: 20, border: '1.5px solid #E5E7EB',
    background: '#fff', color: '#6B7280', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  filterBtnActive: { background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' },
  filterCount: { fontWeight: 400, opacity: 0.8 },
  card: {
    background: '#fff', borderRadius: 12, padding: '0 0 8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden',
  },
  muted: { color: '#9CA3AF', fontSize: 14, padding: 24 },
  empty: { textAlign: 'center', padding: '40px 0' },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14, marginTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', color: '#6B7280', fontWeight: 600, borderBottom: '1.5px solid #E5E7EB', background: '#FAFAFA' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '12px 16px', color: '#374151', verticalAlign: 'middle' },
  nameCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: '#4F46E5',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, flexShrink: 0,
  },
  userName: { fontWeight: 600, color: '#111827' },
  roleSelect: {
    padding: '4px 8px', borderRadius: 8, border: 'none',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
  },
  deleteBtn: {
    background: 'transparent', border: '1px solid #FCA5A5', color: '#DC2626',
    borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
};
