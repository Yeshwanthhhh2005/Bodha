import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI } from '../api/index.js';

const STATE_ORDER = ['UPCOMING', 'LIVE', 'DOUBT_SESSION', 'COMPLETED'];
const STATE_COLOR = {
  UPCOMING: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  LIVE: { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  DOUBT_SESSION: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  COMPLETED: { bg: '#F9FAFB', text: '#374151', dot: '#9CA3AF' },
};

const CATEGORIES = ['Computer Science', 'Frontend', 'Backend', 'Database', 'Networks', 'Security', 'AI', 'Operating Systems'];
const TONES = ['friendly and educational', 'formal and precise', 'casual and encouraging', 'detailed and technical'];

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  category: 'Computer Science',
  instructorName: '',
  instructorDepartment: '',
  scheduledAt: '',
  durationMinutes: 60,
  youtubeUrl: '',
  recordingUrl: '',
  aiEnabled: true,
  aiTopicContext: '',
  aiResponseTone: 'friendly and educational',
};

function Field({ label, children, half }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(half && { minWidth: 0 }) }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</label>
      {children}
    </div>
  );
}

function SessionForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_FORM;
    return {
      title: initial.title ?? '',
      subtitle: initial.subtitle ?? '',
      category: initial.category ?? 'Computer Science',
      instructorName: initial.instructor?.name ?? '',
      instructorDepartment: initial.instructor?.department ?? '',
      scheduledAt: initial.scheduledAt ? new Date(initial.scheduledAt).toISOString().slice(0, 16) : '',
      durationMinutes: initial.durationMinutes ?? 60,
      youtubeUrl: initial.youtubeUrl ?? '',
      recordingUrl: initial.recordingUrl ?? '',
      aiEnabled: initial.aiEnabled ?? true,
      aiTopicContext: initial.aiTopicContext ?? '',
      aiResponseTone: initial.aiResponseTone ?? 'friendly and educational',
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        category: form.category,
        instructor: {
          name: form.instructorName,
          department: form.instructorDepartment,
        },
        scheduledAt: form.scheduledAt,
        durationMinutes: Number(form.durationMinutes),
        youtubeUrl: form.youtubeUrl,
        recordingUrl: form.recordingUrl,
        aiEnabled: form.aiEnabled,
        aiTopicContext: form.aiTopicContext,
        aiResponseTone: form.aiResponseTone,
      };
      await onSave(payload);
    } catch (err) {
      setError(err?.message ?? 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>
            {initial ? 'Edit Session' : 'New Session'}
          </h3>
          <button onClick={onCancel} style={closeBtn}>✕</button>
        </div>

        {error && <div style={errBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={formGrid}>

          {/* Basic Info */}
          <div style={sectionLabel}>Basic Info</div>
          <Field label="Title">
            <input value={form.title} onChange={set('title')} required style={inp} placeholder="e.g. Introduction to React Hooks" />
          </Field>
          <Field label="Subtitle / Topic">
            <input value={form.subtitle} onChange={set('subtitle')} style={inp} placeholder="Short topic description" />
          </Field>

          <div style={row2}>
            <Field label="Category" half>
              <select value={form.category} onChange={set('category')} style={inp}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Duration (minutes)" half>
              <input type="number" value={form.durationMinutes} onChange={set('durationMinutes')} min={1} style={inp} />
            </Field>
          </div>

          {/* Schedule */}
          <div style={{ ...sectionLabel, marginTop: 12 }}>Schedule</div>
          <Field label="Scheduled At">
            <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required style={inp} />
          </Field>

          {/* Instructor */}
          <div style={{ ...sectionLabel, marginTop: 12 }}>Instructor</div>
          <div style={row2}>
            <Field label="Instructor Name" half>
              <input value={form.instructorName} onChange={set('instructorName')} style={inp} placeholder="e.g. Dr. Anand Kumar" />
            </Field>
            <Field label="Department" half>
              <input value={form.instructorDepartment} onChange={set('instructorDepartment')} style={inp} placeholder="e.g. Computer Science" />
            </Field>
          </div>

          {/* Video */}
          <div style={{ ...sectionLabel, marginTop: 12 }}>Video Links</div>
          <Field label="YouTube Live URL">
            <input value={form.youtubeUrl} onChange={set('youtubeUrl')} style={inp} placeholder="https://youtube.com/live/..." />
          </Field>
          <Field label="Recording URL (for post-session)">
            <input value={form.recordingUrl} onChange={set('recordingUrl')} style={inp} placeholder="https://youtube.com/watch?v=..." />
          </Field>

          {/* AI Config */}
          <div style={{ ...sectionLabel, marginTop: 12 }}>AI Configuration</div>
          <label style={checkRow}>
            <input type="checkbox" checked={form.aiEnabled} onChange={set('aiEnabled')} />
            <span>Enable AI Chat for this session</span>
          </label>

          {form.aiEnabled && (
            <>
              <Field label="Topic Context (guides AI responses)">
                <textarea
                  value={form.aiTopicContext}
                  onChange={set('aiTopicContext')}
                  style={{ ...inp, resize: 'vertical', minHeight: 64 }}
                  placeholder="e.g. This session covers React hooks — useState, useEffect, useRef. Focus on practical examples."
                />
              </Field>
              <Field label="AI Response Tone">
                <select value={form.aiResponseTone} onChange={set('aiResponseTone')} style={inp}>
                  {TONES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={saveBtn}>
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const load = () => {
    setLoading(true);
    sessionAPI.list().then((data) => {
      setSessions(Array.isArray(data) ? data : []);
    }).catch(() => setSessions([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    await sessionAPI.create(form);
    setShowForm(false);
    load();
  };

  const handleEdit = async (id) => {
    const sess = await sessionAPI.get(id);
    setEditing(sess);
  };

  const handleUpdate = async (form) => {
    await sessionAPI.update(editing._id, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session? This cannot be undone.')) return;
    await sessionAPI.delete(id);
    load();
  };

  const handleState = async (id, state) => {
    try {
      await sessionAPI.setState(id, state);
      load();
    } catch (err) {
      alert(err?.message || 'State change failed');
    }
  };

  const filtered = filter === 'ALL' ? sessions : sessions.filter((s) => s.state === filter);

  return (
    <div style={styles.page}>
      {showForm && (
        <SessionForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editing && (
        <SessionForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}

      <div style={styles.header}>
        <h2 style={styles.pageTitle}>Sessions</h2>
        <button onClick={() => setShowForm(true)} style={styles.newBtn}>+ New Session</button>
      </div>

      <div style={styles.filterRow}>
        {['ALL', ...STATE_ORDER].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{ ...styles.filterBtn, ...(filter === s ? styles.filterActive : {}) }}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>No sessions found.</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.thead}>
            <div style={{ ...styles.th, flex: 3 }}>Title</div>
            <div style={{ ...styles.th, flex: 2 }}>Instructor</div>
            <div style={{ ...styles.th, flex: 2 }}>Scheduled</div>
            <div style={{ ...styles.th, flex: 1 }}>State</div>
            <div style={{ ...styles.th, flex: 2 }}>Advance</div>
            <div style={{ ...styles.th, flex: 1 }}>Actions</div>
          </div>

          {filtered.map((s) => {
            const col = STATE_COLOR[s.state] ?? STATE_COLOR.COMPLETED;
            const idx = STATE_ORDER.indexOf(s.state);
            const nextState = idx >= 0 && idx < STATE_ORDER.length - 1 ? STATE_ORDER[idx + 1] : null;

            return (
              <div key={s._id} style={styles.row}>
                <div style={{ ...styles.td, flex: 3 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{s.category} · {s.durationMinutes}min</div>
                </div>
                <div style={{ ...styles.td, flex: 2, color: '#6B7280', fontSize: 12 }}>
                  {s.instructor?.name || '—'}
                </div>
                <div style={{ ...styles.td, flex: 2, color: '#6B7280', fontSize: 12 }}>
                  {new Date(s.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
                <div style={{ ...styles.td, flex: 1 }}>
                  <span style={{ ...styles.badge, background: col.bg, color: col.text }}>
                    <span style={{ ...styles.dot, background: col.dot }} />
                    {s.state.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ ...styles.td, flex: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.state === 'LIVE' ? (
                    <>
                      <button onClick={() => handleState(s._id, 'DOUBT_SESSION')} style={styles.stateBtn}>→ DOUBT</button>
                      <button onClick={() => handleState(s._id, 'COMPLETED')} style={{ ...styles.stateBtn, background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' }}>→ DONE</button>
                    </>
                  ) : nextState ? (
                    <button onClick={() => handleState(s._id, nextState)} style={styles.stateBtn}>
                      → {nextState.replace(/_/g, ' ')}
                    </button>
                  ) : null}
                </div>
                <div style={{ ...styles.td, flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/sessions/${s._id}`} style={styles.iconBtn} title="Analytics">📊</Link>
                  <button onClick={() => handleEdit(s._id)} style={styles.iconBtn} title="Edit">✏️</button>
                  <button onClick={() => handleDelete(s._id)} style={{ ...styles.iconBtn }} title="Delete">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '32px 36px', maxWidth: 1100 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#1E1B4B' },
  newBtn: {
    padding: '9px 20px', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20 },
  filterBtn: {
    padding: '6px 14px', border: '1.5px solid #E5E7EB', borderRadius: 20,
    background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  filterActive: { background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' },
  empty: { color: '#9CA3AF', fontSize: 14, padding: 24 },
  table: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  thead: { display: 'flex', padding: '10px 22px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' },
  th: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #F9FAFB' },
  td: { fontSize: 13, color: '#111827', paddingRight: 12 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  stateBtn: {
    padding: '5px 12px', background: '#EEF2FF', color: '#4F46E5',
    border: '1.5px solid #C7D2FE', borderRadius: 6, fontSize: 11,
    fontWeight: 700, cursor: 'pointer',
  },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 15, textDecoration: 'none', padding: 2,
  },
};

// Modal styles
const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: '#fff', borderRadius: 14, padding: '28px 32px',
  width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const modalHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 };
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF' };
const errBox = {
  background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
  color: '#DC2626', padding: '10px 14px', fontSize: 13, marginBottom: 16,
};
const formGrid = { display: 'flex', flexDirection: 'column', gap: 12 };
const sectionLabel = {
  fontSize: 10, fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase',
  letterSpacing: 1, paddingBottom: 4, borderBottom: '1px solid #EEF2FF',
};
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const inp = {
  padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8,
  fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
};
const checkRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  fontSize: 13, color: '#374151', cursor: 'pointer',
};
const cancelBtn = {
  padding: '9px 20px', background: '#F3F4F6', color: '#374151',
  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const saveBtn = {
  padding: '9px 24px', background: '#4F46E5', color: '#fff',
  border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
