import React, { useEffect, useState, useCallback } from 'react';
import { puzzleAdminAPI } from '../api/index.js';

const EMPTY_FORM = {
  title: '', hint: '', answer: '', explanation: '',
  releaseDate: '', status: 'active', pointsAwarded: 20, maxAttempts: 3,
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Puzzles() {
  const [puzzles, setPuzzles]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('all'); // 'all' | 'analytics'
  const [modal, setModal]       = useState(null);  // null | 'create' | { ...puzzle }
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [attemptsModal, setAttemptsModal] = useState(null);
  const [attempts, setAttempts] = useState([]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [pRes, sRes] = await Promise.allSettled([
        puzzleAdminAPI.list(),
        puzzleAdminAPI.stats(),
      ]);
      if (pRes.status === 'fulfilled') setPuzzles(pRes.value?.puzzles ?? pRes.value ?? []);
      if (sRes.status === 'fulfilled') setStats(sRes.value);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + poll stats every 8s so attempts from the mobile app
  // show up live without needing a manual refresh.
  useEffect(() => {
    load();
    const id = setInterval(() => load({ silent: true }), 8000);
    const onFocus = () => load({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit   = (p) => {
    setForm({
      title: p.title, hint: p.hint || '', answer: p.answer || '',
      explanation: p.explanation || '',
      releaseDate: p.releaseDate ? p.releaseDate.slice(0, 10) : '',
      status: p.status, pointsAwarded: p.pointsAwarded, maxAttempts: p.maxAttempts,
    });
    setModal(p);
  };

  const save = async () => {
    if (!form.title || !form.answer || !form.releaseDate) return alert('Title, answer and release date are required');
    setSaving(true);
    try {
      if (modal === 'create') {
        await puzzleAdminAPI.create(form);
      } else {
        await puzzleAdminAPI.update(modal._id, form);
      }
      setModal(null);
      load();
    } catch (e) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this puzzle? All student attempts will be erased.')) return;
    await puzzleAdminAPI.delete(id);
    load();
  };

  const toggle = async (id) => {
    await puzzleAdminAPI.toggleStatus(id);
    load();
  };

  const viewAttempts = async (puzzle) => {
    setAttemptsModal(puzzle);
    const res = await puzzleAdminAPI.attempts(puzzle._id);
    setAttempts(res ?? []);
  };

  return (
    <div style={st.page}>
      {/* Page header */}
      <div style={st.topBar}>
        <div>
          <h1 style={st.title}>Mind Twister Puzzles</h1>
          <p style={st.sub}>Create and manage daily puzzles for students</p>
        </div>
        <button style={st.createBtn} onClick={openCreate}>+ New Puzzle</button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={st.statsGrid}>
          {[
            { label: 'Total Puzzles', value: stats.total, color: '#7C3AED', bg: '#EDE9FE' },
            { label: 'Active',        value: stats.active, color: '#059669', bg: '#DCFCE7' },
            { label: 'Total Attempts',value: stats.totalAttempts, color: '#2563EB', bg: '#DBEAFE' },
            { label: 'Correct',       value: stats.correctCount, color: '#D97706', bg: '#FEF3C7' },
            { label: 'Wrong',         value: stats.wrongCount,   color: '#DC2626', bg: '#FEE2E2' },
            { label: 'Success Rate',  value: `${stats.successRate}%`, color: '#0891B2', bg: '#E0F2FE' },
          ].map(c => (
            <div key={c.label} style={{ ...st.statCard, background: c.bg }}>
              <div style={{ ...st.statVal, color: c.color }}>{c.value}</div>
              <div style={st.statLbl}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={st.center}>Loading…</div>
      ) : puzzles.length === 0 ? (
        <div style={st.empty}>
          <div style={st.emptyIcon}>🧩</div>
          <p style={st.emptyTitle}>No puzzles yet</p>
          <p style={st.emptySub}>Click "New Puzzle" to create your first Mind Twister.</p>
        </div>
      ) : (
        <div style={st.tableWrap}>
          <table style={st.table}>
            <thead>
              <tr>
                {['Date', 'Question', 'Points', 'Attempts', 'Solved', 'Status', 'Actions'].map(h => (
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puzzles.map(p => (
                <tr key={p._id} style={st.tr}>
                  <td style={st.td}>{fmtDate(p.releaseDate)}</td>
                  <td style={{ ...st.td, maxWidth: 260 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>{p.title}</div>
                    {p.hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>💡 {p.hint}</div>}
                  </td>
                  <td style={st.td}><span style={st.ptsBadge}>+{p.pointsAwarded}</span></td>
                  <td style={st.td}>{p.totalAttempts}</td>
                  <td style={st.td}>{p.solvedCount}</td>
                  <td style={st.td}>
                    <button
                      style={{ ...st.statusChip, ...(p.status === 'active' ? st.active : st.inactive) }}
                      onClick={() => toggle(p._id)}
                      title="Click to toggle"
                    >
                      {p.status === 'active' ? '● Active' : '○ Inactive'}
                    </button>
                  </td>
                  <td style={st.td}>
                    <div style={st.actions}>
                      <button style={st.btnSm} onClick={() => viewAttempts(p)}>👁 Attempts</button>
                      <button style={st.btnSm} onClick={() => openEdit(p)}>✏️ Edit</button>
                      <button style={{ ...st.btnSm, color: '#DC2626' }} onClick={() => del(p._id)}>🗑 Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <div style={st.overlay} onClick={() => setModal(null)}>
          <div style={st.modalBox} onClick={e => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h2 style={st.modalTitle}>{modal === 'create' ? 'Create Puzzle' : 'Edit Puzzle'}</h2>
              <button style={st.closeBtn} onClick={() => setModal(null)}>✕</button>
            </div>

            <div style={st.formGrid}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={st.label}>Question *</label>
                <textarea
                  rows={3}
                  style={{ ...st.input, resize: 'vertical' }}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What has keys but can't open locks?"
                />
              </div>
              <div>
                <label style={st.label}>Correct Answer *</label>
                <input style={st.input} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="A keyboard" />
              </div>
              <div>
                <label style={st.label}>Release Date *</label>
                <input type="date" style={st.input} value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} />
              </div>
              <div>
                <label style={st.label}>Hint (optional)</label>
                <input style={st.input} value={form.hint} onChange={e => setForm(f => ({ ...f, hint: e.target.value }))} placeholder="It helps you write, not open." />
              </div>
              <div>
                <label style={st.label}>Points Awarded</label>
                <input type="number" min="1" style={st.input} value={form.pointsAwarded} onChange={e => setForm(f => ({ ...f, pointsAwarded: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={st.label}>Max Attempts</label>
                <input type="number" min="1" max="10" style={st.input} value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: Number(e.target.value) }))} />
              </div>
              <div>
                <label style={st.label}>Status</label>
                <select style={st.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={st.label}>Explanation (shown after solving)</label>
                <textarea rows={2} style={{ ...st.input, resize: 'vertical' }} value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} placeholder="A keyboard has keys but doesn't open locks!" />
              </div>
            </div>

            <div style={st.modalFoot}>
              <button style={st.cancelBtn} onClick={() => setModal(null)}>Cancel</button>
              <button style={st.saveBtn} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create Puzzle' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attempts Modal */}
      {attemptsModal && (
        <div style={st.overlay} onClick={() => setAttemptsModal(null)}>
          <div style={{ ...st.modalBox, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={st.modalHead}>
              <h2 style={st.modalTitle}>Attempts — {attemptsModal.title}</h2>
              <button style={st.closeBtn} onClick={() => setAttemptsModal(null)}>✕</button>
            </div>
            {attempts.length === 0 ? (
              <p style={{ padding: 20, color: '#9CA3AF', textAlign: 'center' }}>No attempts yet.</p>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                <table style={{ ...st.table, margin: 0 }}>
                  <thead><tr>
                    <th style={st.th}>Student</th>
                    <th style={st.th}>Answer</th>
                    <th style={st.th}>Result</th>
                    <th style={st.th}>Pts</th>
                    <th style={st.th}>When</th>
                  </tr></thead>
                  <tbody>
                    {attempts.map(a => (
                      <tr key={a._id} style={st.tr}>
                        <td style={st.td}>{a.student?.name || '—'}</td>
                        <td style={st.td}>{a.answer}</td>
                        <td style={st.td}>
                          <span style={{ color: a.isCorrect ? '#059669' : '#DC2626', fontWeight: 700 }}>
                            {a.isCorrect ? '✓ Correct' : '✗ Wrong'}
                          </span>
                        </td>
                        <td style={st.td}>{a.pointsEarned}</td>
                        <td style={st.td}>{new Date(a.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  page:      { padding: 24, minHeight: '100%', boxSizing: 'border-box' },
  topBar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:     { fontSize: 22, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  sub:       { fontSize: 13, color: '#6B7280', marginTop: 4 },
  createBtn: { padding: '10px 20px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 24 },
  statCard:  { borderRadius: 12, padding: '14px 16px' },
  statVal:   { fontSize: 22, fontWeight: 900 },
  statLbl:   { fontSize: 11, color: '#374151', marginTop: 4, fontWeight: 600 },

  center: { textAlign: 'center', padding: 40, color: '#9CA3AF' },
  empty:  { textAlign: 'center', padding: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: '#374151' },
  emptySub:   { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  tableWrap: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #E5E7EB' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' },
  tr:        { borderBottom: '1px solid #F3F4F6' },
  td:        { padding: '12px 14px', fontSize: 13, color: '#374151', verticalAlign: 'middle' },
  ptsBadge:  { background: '#EDE9FE', color: '#7C3AED', borderRadius: 6, padding: '2px 8px', fontWeight: 800, fontSize: 12 },
  statusChip:{ border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 11, cursor: 'pointer' },
  active:    { background: '#DCFCE7', color: '#059669' },
  inactive:  { background: '#F3F4F6', color: '#9CA3AF' },
  actions:   { display: 'flex', gap: 6 },
  btnSm:     { padding: '5px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, color: '#374151' },

  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:  { background: '#fff', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #F3F4F6' },
  modalTitle:{ fontSize: 18, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  closeBtn:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', lineHeight: 1 },
  formGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 24 },
  label:     { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 },
  input:     { width: '100%', padding: '10px 12px', border: '1px solid #DDD6FE', borderRadius: 8, fontSize: 14, color: '#111827', boxSizing: 'border-box', outline: 'none' },
  modalFoot: { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid #F3F4F6' },
  cancelBtn: { padding: '10px 20px', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#374151' },
  saveBtn:   { padding: '10px 24px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
};
