import React, { useState, useEffect } from 'react';
import { classScheduleAPI, courseConfigAPI } from '../api/index.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_TIME = {
  Monday: '7:00 PM – 8:00 PM', Tuesday: '7:00 PM – 8:00 PM',
  Wednesday: '7:00 PM – 8:00 PM', Thursday: 'Holiday',
  Friday: '7:00 PM – 8:00 PM', Saturday: '7:00 PM – 9:00 PM',
  Sunday: '3:00 PM – 5:00 PM',
};

const EMPTY_ENTRY = { day: '', technology: '', topic: '', content: '' };
const EMPTY_TECH  = { name: '', icon: '📚' };

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div style={s.card}>
      <div style={s.cardHead}>
        <h2 style={s.cardTitle}>{title}</h2>
        {subtitle && <p style={s.cardSub}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClassSchedule() {
  // ── Schedule entries state
  const [entries,   setEntries]   = useState([]);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [editId,    setEditId]    = useState(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);

  // ── Course config state
  const [config,       setConfig]       = useState(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [cfgForm,      setCfgForm]      = useState({
    currentTechnology: '',
    startDate: '',
    totalClasses: 0,
    completedClasses: 0,
  });
  const [techList,    setTechList]    = useState([]);  // [{ name, icon }]
  const [newTech,     setNewTech]     = useState(EMPTY_TECH);
  const [addingTech,  setAddingTech]  = useState(false);

  // ── Shared feedback
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── Load both on mount
  const loadEntries = async () => {
    try {
      const data = await classScheduleAPI.list();
      setEntries(Array.isArray(data) ? data : (data?.data ?? []));
    } catch { setEntries([]); }
  };

  const loadConfig = async () => {
    try {
      const data = await courseConfigAPI.get();
      const cfg = data?.data ?? data;
      setConfig(cfg);
      setTechList(cfg?.techList ?? []);
      setCfgForm({
        currentTechnology: cfg?.currentTechnology ?? '',
        startDate: cfg?.startDate ? cfg.startDate.slice(0, 10) : '',
        totalClasses: cfg?.totalClasses ?? 0,
        completedClasses: cfg?.completedClasses ?? 0,
      });
    } catch { setConfig(null); }
  };

  useEffect(() => { loadEntries(); loadConfig(); }, []);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  // ─── Schedule entry handlers ───────────────────────────────────────────────
  const resetEntryForm = () => { setEntryForm(EMPTY_ENTRY); setEditId(null); };

  const handleEditEntry = (entry) => {
    setEditId(entry._id);
    setEntryForm({ day: entry.day, technology: entry.technology, topic: entry.topic, content: entry.content ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!entryForm.day || !entryForm.technology.trim() || !entryForm.topic.trim()) {
      return flash('Day, technology, and topic are required.', true);
    }
    setEntrySaving(true);
    try {
      if (editId) await classScheduleAPI.update(editId, entryForm);
      else        await classScheduleAPI.create(entryForm);
      resetEntryForm();
      await loadEntries();
      flash(editId ? 'Entry updated.' : 'Entry created.');
    } catch (err) {
      flash(err?.message || 'Save failed. That day may already have an entry.', true);
    } finally { setEntrySaving(false); }
  };

  const handleDeleteEntry = async (id, day) => {
    if (!window.confirm(`Remove schedule entry for ${day}?`)) return;
    setDeletingId(id);
    try { await classScheduleAPI.delete(id); await loadEntries(); flash(`${day} entry removed.`); }
    catch { flash('Delete failed.', true); }
    finally { setDeletingId(null); }
  };

  // ─── Course config handlers ───────────────────────────────────────────────
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      await courseConfigAPI.update({
        ...cfgForm,
        totalClasses:     Number(cfgForm.totalClasses),
        completedClasses: Number(cfgForm.completedClasses),
        techList,
      });
      await loadConfig();
      flash('Course settings saved.');
    } catch (err) {
      flash(err?.message || 'Failed to save settings.', true);
    } finally { setConfigSaving(false); }
  };

  const handleAddTech = () => {
    if (!newTech.name.trim()) return;
    if (techList.find((t) => t.name.toLowerCase() === newTech.name.toLowerCase())) {
      return flash('Technology already in list.', true);
    }
    setTechList((prev) => [...prev, { name: newTech.name.trim(), icon: newTech.icon || '📚' }]);
    setNewTech(EMPTY_TECH);
    setAddingTech(false);
  };

  const handleRemoveTech = (name) => {
    setTechList((prev) => prev.filter((t) => t.name !== name));
    if (cfgForm.currentTechnology === name) setCfgForm((f) => ({ ...f, currentTechnology: '' }));
  };

  const usedDays = new Set(entries.filter((e) => e._id !== editId).map((e) => e.day));

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.title}>📅 Manage Class Schedule</h1>
        <p style={s.subtitle}>Control every aspect of the class schedule visible to students.</p>
      </div>

      {error   && <div style={s.alertError}>{error}</div>}
      {success && <div style={s.alertSuccess}>{success}</div>}

      {/* ── 1. COURSE SETTINGS ─────────────────────────────────────────────── */}
      <Section title="⚙️ Course Settings" subtitle="Progress card and technology tabs shown on the student app.">
        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Technology List */}
          <div>
            <label style={s.label}>Course Curriculum  <span style={s.hint}>(technologies shown as tabs in student app)</span></label>
            <div style={s.techChips}>
              {techList.map((t) => (
                <div key={t.name} style={s.techChip}>
                  <span>{t.icon}</span>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <button type="button" onClick={() => handleRemoveTech(t.name)} style={s.chipRemove}>✕</button>
                </div>
              ))}
              {!addingTech ? (
                <button type="button" onClick={() => setAddingTech(true)} style={s.addTechBtn}>+ Add Technology</button>
              ) : (
                <div style={s.addTechRow}>
                  <input
                    style={{ ...s.input, width: 130 }}
                    placeholder="Name (e.g. React)"
                    value={newTech.name}
                    onChange={(e) => setNewTech((t) => ({ ...t, name: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                    autoFocus
                  />
                  <input
                    style={{ ...s.input, width: 60 }}
                    placeholder="Icon"
                    value={newTech.icon}
                    onChange={(e) => setNewTech((t) => ({ ...t, icon: e.target.value }))}
                  />
                  <button type="button" onClick={handleAddTech} style={s.btnSmallPrimary}>Add</button>
                  <button type="button" onClick={() => { setAddingTech(false); setNewTech(EMPTY_TECH); }} style={s.btnSmallSecondary}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          <div style={s.row3}>
            {/* Current Technology */}
            <div style={s.field}>
              <label style={s.label}>Current Technology <span style={s.hint}>(shown as "In Progress")</span></label>
              <select
                style={s.select}
                value={cfgForm.currentTechnology}
                onChange={(e) => setCfgForm((f) => ({ ...f, currentTechnology: e.target.value }))}
              >
                <option value="">— Select —</option>
                {techList.map((t) => <option key={t.name} value={t.name}>{t.icon} {t.name}</option>)}
              </select>
            </div>

            {/* Start Date */}
            <div style={s.field}>
              <label style={s.label}>Course Start Date <span style={s.hint}>("Started on …")</span></label>
              <input
                type="date"
                style={s.input}
                value={cfgForm.startDate}
                onChange={(e) => setCfgForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
          </div>

          <div style={s.row3}>
            {/* Total Classes */}
            <div style={s.field}>
              <label style={s.label}>Total Classes <span style={s.hint}>(denominator in progress ring)</span></label>
              <input
                type="number" min={0}
                style={s.input}
                value={cfgForm.totalClasses}
                onChange={(e) => setCfgForm((f) => ({ ...f, totalClasses: e.target.value }))}
              />
            </div>

            {/* Completed Classes */}
            <div style={s.field}>
              <label style={s.label}>Completed Classes <span style={s.hint}>(numerator in progress ring)</span></label>
              <input
                type="number" min={0}
                style={s.input}
                value={cfgForm.completedClasses}
                onChange={(e) => setCfgForm((f) => ({ ...f, completedClasses: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <button type="submit" style={s.btnPrimary} disabled={configSaving}>
              {configSaving ? 'Saving…' : '💾 Save Course Settings'}
            </button>
          </div>
        </form>
      </Section>

      {/* ── 2. ADD / EDIT ENTRY ────────────────────────────────────────────── */}
      <Section title={editId ? '✏️ Edit Schedule Entry' : '➕ Add Schedule Entry'} subtitle="One entry per day. Thursday is always a holiday.">
        <form onSubmit={handleSaveEntry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Day *</label>
              <select
                value={entryForm.day}
                onChange={(e) => setEntryForm({ ...entryForm, day: e.target.value })}
                style={s.select}
                required
              >
                <option value="">Select day…</option>
                {DAYS.map((d) => (
                  <option key={d} value={d} disabled={d === 'Thursday' || usedDays.has(d)}>
                    {d}{d === 'Thursday' ? ' (Holiday)' : usedDays.has(d) ? ' (taken)' : ''}
                  </option>
                ))}
              </select>
              {entryForm.day && entryForm.day !== 'Thursday' && (
                <span style={s.timeBadge}>🕐 {DAY_TIME[entryForm.day]}</span>
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>Technology *</label>
              {techList.length > 0 ? (
                <select
                  style={s.select}
                  value={entryForm.technology}
                  onChange={(e) => setEntryForm({ ...entryForm, technology: e.target.value })}
                  required
                >
                  <option value="">Select technology…</option>
                  {techList.map((t) => <option key={t.name} value={t.name}>{t.icon} {t.name}</option>)}
                </select>
              ) : (
                <input
                  style={s.input}
                  value={entryForm.technology}
                  onChange={(e) => setEntryForm({ ...entryForm, technology: e.target.value })}
                  placeholder="e.g. Java  (add technologies in Course Settings above)"
                  required
                />
              )}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Topic / Main Title *</label>
            <input
              style={s.input}
              value={entryForm.topic}
              onChange={(e) => setEntryForm({ ...entryForm, topic: e.target.value })}
              placeholder="e.g. Introduction to Java"
              required
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Content / Sub-topics <span style={s.hint}>(one per line — shown as bullet points)</span></label>
            <textarea
              style={s.textarea}
              value={entryForm.content}
              onChange={(e) => setEntryForm({ ...entryForm, content: e.target.value })}
              placeholder={'What is Java?\nFeatures of Java\nJVM Architecture'}
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={s.btnPrimary} disabled={entrySaving}>
              {entrySaving ? 'Saving…' : editId ? '✓ Update Entry' : '+ Save Entry'}
            </button>
            {editId && (
              <button type="button" style={s.btnSecondary} onClick={resetEntryForm}>Cancel</button>
            )}
          </div>
        </form>
      </Section>

      {/* ── 3. CURRENT WEEK TABLE ──────────────────────────────────────────── */}
      <Section title="📋 Current Schedule" subtitle="All scheduled days. Thursday is fixed as a holiday.">
        {entries.length === 0 ? (
          <div style={s.empty}><p style={{ fontSize: 36, marginBottom: 8 }}>📭</p><p style={{ color: '#9CA3AF' }}>No entries yet. Add one above.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>{['Day', 'Fixed Time', 'Technology', 'Topic', 'Sub-topics', 'Actions'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {DAYS.filter((d) => d !== 'Thursday').map((dayName) => {
                  const entry = entries.find((e) => e.day === dayName);
                  return (
                    <tr key={dayName} style={s.tr}>
                      <td style={{ ...s.td, fontWeight: 700, color: '#4C1D95', whiteSpace: 'nowrap' }}>{dayName}</td>
                      <td style={{ ...s.td, color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' }}>{DAY_TIME[dayName]}</td>
                      {entry ? (
                        <>
                          <td style={s.td}><span style={s.techBadge}>{entry.technology}</span></td>
                          <td style={{ ...s.td, fontWeight: 600 }}>{entry.topic}</td>
                          <td style={{ ...s.td, fontSize: 12, color: '#6B7280', maxWidth: 200 }}>
                            {entry.content
                              ? entry.content.split('\n').filter(Boolean).map((line, i) => (
                                  <div key={i}>• {line.replace(/^[•\-]\s*/, '')}</div>
                                ))
                              : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button style={s.btnEdit} onClick={() => handleEditEntry(entry)}>Edit</button>
                              <button style={s.btnDelete} disabled={deletingId === entry._id} onClick={() => handleDeleteEntry(entry._id, entry.day)}>
                                {deletingId === entry._id ? '…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td colSpan={4} style={{ ...s.td, color: '#D1D5DB', fontStyle: 'italic' }}>
                          No entry — add above
                        </td>
                      )}
                    </tr>
                  );
                })}
                <tr style={{ ...s.tr, backgroundColor: '#FFF7ED' }}>
                  <td style={{ ...s.td, fontWeight: 700, color: '#92400E' }}>Thursday</td>
                  <td style={{ ...s.td, color: '#6B7280', fontSize: 12 }}>—</td>
                  <td colSpan={4} style={{ ...s.td, color: '#D97706', fontWeight: 600 }}>🌴 Holiday — No Class (fixed)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:        { padding: '28px 32px', maxWidth: 960, margin: '0 auto' },
  pageHeader:  { marginBottom: 20 },
  title:       { fontSize: 22, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  subtitle:    { fontSize: 13, color: '#6B7280', marginTop: 4 },

  card:        { background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  cardHead:    { marginBottom: 18 },
  cardTitle:   { fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 },
  cardSub:     { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 0 },

  alertError:   { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 },
  alertSuccess: { background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', color: '#059669', fontSize: 13, marginBottom: 16 },

  row2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  row3:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field:       { display: 'flex', flexDirection: 'column', gap: 5 },
  label:       { fontSize: 13, fontWeight: 600, color: '#374151' },
  hint:        { fontWeight: 400, color: '#9CA3AF', fontSize: 11 },
  input:       { padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, color: '#111827', outline: 'none' },
  select:      { padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, color: '#111827', background: '#fff', outline: 'none' },
  textarea:    { padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, color: '#111827', resize: 'vertical', fontFamily: 'inherit', outline: 'none' },
  timeBadge:   { fontSize: 11, color: '#7C3AED', fontWeight: 600, marginTop: 3 },

  techChips:   { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  techChip:    { display: 'flex', alignItems: 'center', gap: 6, background: '#EDE9FE', color: '#5B21B6', borderRadius: 8, padding: '5px 10px', fontSize: 13, fontWeight: 500 },
  chipRemove:  { background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, marginLeft: 2 },
  addTechBtn:  { padding: '5px 12px', background: '#F3F4F6', border: '1.5px dashed #D1D5DB', borderRadius: 8, fontSize: 12, color: '#6B7280', cursor: 'pointer', fontWeight: 600 },
  addTechRow:  { display: 'flex', alignItems: 'center', gap: 6 },
  btnSmallPrimary:   { padding: '5px 12px', background: '#5B21B6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnSmallSecondary: { padding: '5px 10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },

  btnPrimary:   { padding: '10px 24px', background: '#5B21B6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '10px 20px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  empty:     { textAlign: 'center', padding: '32px 0' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:        { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #E5E7EB', background: '#F9FAFB' },
  tr:        { borderBottom: '1px solid #F3F4F6' },
  td:        { padding: '12px 12px', color: '#111827', verticalAlign: 'top' },
  techBadge: { background: '#EDE9FE', color: '#5B21B6', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  btnEdit:   { padding: '5px 12px', background: '#EDE9FE', color: '#5B21B6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnDelete: { padding: '5px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};
