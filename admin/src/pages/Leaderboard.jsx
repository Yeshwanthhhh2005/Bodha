import React, { useEffect, useState } from 'react';
import {
  teamAPI, challengeAPI, scoreAPI, leaderboardAdminAPI,
} from '../api';

const TABS = ['Leaderboard', 'Teams', 'Challenges', 'Points'];

export default function Leaderboard() {
  const [tab, setTab] = useState('Leaderboard');
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Leadership Board</h1>
          <p style={S.sub}>Manage teams, challenges, and points</p>
        </div>
      </div>
      <div style={S.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }}
          >{t}</button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        {tab === 'Leaderboard' && <LeaderboardView />}
        {tab === 'Teams' && <TeamsTab />}
        {tab === 'Challenges' && <ChallengesTab />}
        {tab === 'Points' && <PointsTab />}
      </div>
    </div>
  );
}

// ─── LEADERBOARD VIEW ─────────────────────────────────────────────────────────
function LeaderboardView() {
  const [data, setData] = useState({ challenge: null, totalTeams: 0, teams: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await leaderboardAdminAPI.view()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reset = async () => {
    if (!window.confirm('Reset ALL leaderboard scores? This cannot be undone.')) return;
    try { await leaderboardAdminAPI.reset(); await load(); }
    catch (e) { alert(e.message || 'Reset failed'); }
  };

  if (loading) return <div style={S.loading}>Loading…</div>;

  return (
    <div>
      <div style={S.viewHead}>
        <div>
          <div style={S.viewActiveLabel}>Active Challenge</div>
          <div style={S.viewActiveName}>{data.challenge?.name || 'None'}</div>
          <div style={S.viewActiveStat}>{data.totalTeams} teams competing</div>
        </div>
        <button onClick={reset} style={S.resetBtn}>Reset Leaderboard</button>
      </div>

      <div style={S.tableCard}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Rank</th>
              <th style={S.th}>Team</th>
              <th style={S.th}>Members</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {data.teams.length === 0 && (
              <tr><td colSpan={4} style={S.empty}>No teams yet. Create teams in the Teams tab.</td></tr>
            )}
            {data.teams.map((t) => (
              <tr key={t._id}>
                <td style={S.td}>
                  <span style={{ ...S.rankBadge, background: rankColor(t.rank) }}>{t.rank}</span>
                </td>
                <td style={S.td}>
                  <span style={{ ...S.teamIcon, background: t.color || '#7C3AED' }}>{t.icon || '⚡'}</span>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                </td>
                <td style={S.td}>{t.memberCount}</td>
                <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{t.points} <span style={S.ptsLabel}>PTS</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const rankColor = (r) => r === 1 ? '#F59E0B' : r === 2 ? '#3B82F6' : r === 3 ? '#F97316' : '#9CA3AF';

// ─── TEAMS TAB ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [editing, setEditing] = useState(null); // null | object
  const [form, setForm] = useState({ name: '', icon: '⚡', color: '#7C3AED', members: [] });
  const [error, setError] = useState('');

  const load = async () => {
    const [t, s] = await Promise.all([teamAPI.list(), leaderboardAdminAPI.students()]);
    setTeams(t); setStudents(s);
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setForm({ name: '', icon: '⚡', color: '#7C3AED', members: [] }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await teamAPI.update(editing._id, form);
      else await teamAPI.create(form);
      reset(); load();
    } catch (err) { setError(err.message || 'Failed'); }
  };

  const startEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name,
      icon: t.icon || '⚡',
      color: t.color || '#7C3AED',
      members: (t.members || []).map((m) => m._id || m),
    });
  };

  const del = async (id) => {
    if (!window.confirm('Delete this team and all its scores?')) return;
    try { await teamAPI.delete(id); load(); }
    catch (err) { alert(err.message || 'Failed'); }
  };

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((x) => x !== id) : [...f.members, id],
    }));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
      <form onSubmit={submit} style={S.formCard}>
        <h3 style={S.formTitle}>{editing ? 'Edit Team' : 'Create Team'}</h3>
        {error && <div style={S.error}>{error}</div>}
        <label style={S.label}>Team Name</label>
        <input style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Icon (emoji)</label>
            <input style={S.input} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
          </div>
          <div>
            <label style={S.label}>Color</label>
            <input type="color" style={{ ...S.input, padding: 4, height: 40 }} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </div>

        <label style={S.label}>Members ({form.members.length} selected)</label>
        <div style={S.memberList}>
          {students.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 13 }}>No students found</div>}
          {students.map((s) => (
            <label key={s._id} style={S.memberRow}>
              <input type="checkbox" checked={form.members.includes(s._id)} onChange={() => toggleMember(s._id)} />
              <span>{s.name} <span style={{ color: '#9CA3AF', fontSize: 12 }}>· {s.email}</span></span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="submit" style={S.primaryBtn}>{editing ? 'Update' : 'Create'}</button>
          {editing && <button type="button" onClick={reset} style={S.cancelBtn}>Cancel</button>}
        </div>
      </form>

      <div style={S.tableCard}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Team</th>
            <th style={S.th}>Members</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
          </tr></thead>
          <tbody>
            {teams.length === 0 && <tr><td colSpan={3} style={S.empty}>No teams yet</td></tr>}
            {teams.map((t) => (
              <tr key={t._id}>
                <td style={S.td}>
                  <span style={{ ...S.teamIcon, background: t.color || '#7C3AED' }}>{t.icon || '⚡'}</span>
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                </td>
                <td style={S.td}>{(t.members || []).length}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button onClick={() => startEdit(t)} style={S.editBtn}>Edit</button>
                  <button onClick={() => del(t._id)} style={S.delBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CHALLENGES TAB ───────────────────────────────────────────────────────────
function ChallengesTab() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', isActive: false });
  const [error, setError] = useState('');

  const load = async () => setList(await challengeAPI.list());
  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setForm({ name: '', description: '', startDate: '', endDate: '', isActive: false }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await challengeAPI.update(editing._id, form);
      else await challengeAPI.create(form);
      reset(); load();
    } catch (err) { setError(err.message || 'Failed'); }
  };

  const startEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || '',
      startDate: c.startDate?.slice(0, 10) || '',
      endDate: c.endDate?.slice(0, 10) || '',
      isActive: !!c.isActive,
    });
  };

  const activate = async (id) => { try { await challengeAPI.activate(id); load(); } catch (e) { alert(e.message); } };
  const del = async (id) => {
    if (!window.confirm('Delete this challenge and all related scores?')) return;
    try { await challengeAPI.delete(id); load(); } catch (e) { alert(e.message); }
  };

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString() : '';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
      <form onSubmit={submit} style={S.formCard}>
        <h3 style={S.formTitle}>{editing ? 'Edit Challenge' : 'Create Challenge'}</h3>
        {error && <div style={S.error}>{error}</div>}
        <label style={S.label}>Name</label>
        <input style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Start Date</label>
            <input type="date" style={S.input} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          </div>
          <div>
            <label style={S.label}>End Date</label>
            <input type="date" style={S.input} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
          </div>
        </div>
        <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Set as Active Challenge (deactivates others)
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="submit" style={S.primaryBtn}>{editing ? 'Update' : 'Create'}</button>
          {editing && <button type="button" onClick={reset} style={S.cancelBtn}>Cancel</button>}
        </div>
      </form>

      <div style={S.tableCard}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Name</th>
            <th style={S.th}>Duration</th>
            <th style={S.th}>Status</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} style={S.empty}>No challenges yet</td></tr>}
            {list.map((c) => (
              <tr key={c._id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{c.name}</span></td>
                <td style={S.td}>{fmt(c.startDate)} – {fmt(c.endDate)}</td>
                <td style={S.td}>
                  {c.isActive
                    ? <span style={S.activeTag}>ACTIVE</span>
                    : <button onClick={() => activate(c._id)} style={S.activateBtn}>Activate</button>}
                </td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <button onClick={() => startEdit(c)} style={S.editBtn}>Edit</button>
                  <button onClick={() => del(c._id)} style={S.delBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── POINTS TAB ───────────────────────────────────────────────────────────────
function PointsTab() {
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [scores, setScores] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [form, setForm] = useState({ team: '', points: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([teamAPI.list(), challengeAPI.list()]);
      setTeams(t); setChallenges(c);
      const active = c.find((x) => x.isActive);
      if (active) setSelectedChallenge(active._id);
      else if (c[0]) setSelectedChallenge(c[0]._id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedChallenge) return;
    scoreAPI.list(selectedChallenge).then(setScores);
  }, [selectedChallenge]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedChallenge) { setError('Select a challenge'); return; }
    if (!form.team) { setError('Select a team'); return; }
    try {
      await scoreAPI.upsert({ team: form.team, challenge: selectedChallenge, points: Number(form.points) });
      setForm({ team: '', points: 0 });
      const list = await scoreAPI.list(selectedChallenge);
      setScores(list);
    } catch (err) { setError(err.message || 'Failed'); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove this score entry?')) return;
    try { await scoreAPI.delete(id); setScores(await scoreAPI.list(selectedChallenge)); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={S.label}>Challenge</label>
        <select style={{ ...S.input, maxWidth: 400 }} value={selectedChallenge} onChange={(e) => setSelectedChallenge(e.target.value)}>
          <option value="">— Select a challenge —</option>
          {challenges.map((c) => (
            <option key={c._id} value={c._id}>{c.name} {c.isActive ? '(ACTIVE)' : ''}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        <form onSubmit={submit} style={S.formCard}>
          <h3 style={S.formTitle}>Assign Points</h3>
          {error && <div style={S.error}>{error}</div>}
          <label style={S.label}>Team</label>
          <select style={S.input} value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} required>
            <option value="">— Select team —</option>
            {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <label style={S.label}>Points</label>
          <input type="number" min="0" style={S.input} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} required />
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Saving overwrites this team's points for the selected challenge.
          </div>
          <button type="submit" style={{ ...S.primaryBtn, marginTop: 14 }}>Save Points</button>
        </form>

        <div style={S.tableCard}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Team</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Points</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {scores.length === 0 && <tr><td colSpan={3} style={S.empty}>No scores yet for this challenge</td></tr>}
              {scores.map((s) => (
                <tr key={s._id}>
                  <td style={S.td}>
                    <span style={{ ...S.teamIcon, background: s.team?.color || '#7C3AED' }}>{s.team?.icon || '⚡'}</span>
                    <span style={{ fontWeight: 600 }}>{s.team?.name || '(deleted)'}</span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{s.points}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <button onClick={() => del(s._id)} style={S.delBtn}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:           { padding: 24 },
  header:         { display: 'flex', justifyContent: 'space-between', marginBottom: 20 },
  title:          { fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 },
  sub:            { color: '#6B7280', margin: '4px 0 0' },
  tabs:           { display: 'flex', gap: 4, borderBottom: '1px solid #E5E7EB' },
  tab:            { padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#6B7280', borderBottom: '2px solid transparent' },
  tabActive:      { color: '#7C3AED', borderBottomColor: '#7C3AED' },
  loading:        { padding: 40, textAlign: 'center', color: '#9CA3AF' },
  viewHead:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: 18, borderRadius: 12, marginBottom: 16, border: '1px solid #F3F4F6' },
  viewActiveLabel:{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: 1 },
  viewActiveName: { fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 4 },
  viewActiveStat: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  resetBtn:       { background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  tableCard:      { background: '#fff', borderRadius: 12, border: '1px solid #F3F4F6', overflow: 'hidden' },
  table:          { width: '100%', borderCollapse: 'collapse' },
  th:             { textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 1, borderBottom: '1px solid #F3F4F6', textTransform: 'uppercase' },
  td:             { padding: '12px 16px', borderBottom: '1px solid #F3F4F6', fontSize: 14, color: '#374151' },
  empty:          { padding: 32, textAlign: 'center', color: '#9CA3AF' },
  rankBadge:      { display: 'inline-block', minWidth: 28, padding: '4px 8px', borderRadius: 14, color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 12 },
  teamIcon:       { display: 'inline-flex', width: 28, height: 28, borderRadius: 14, color: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10, fontSize: 14, verticalAlign: 'middle' },
  ptsLabel:       { color: '#9CA3AF', fontSize: 10, fontWeight: 700 },
  formCard:       { background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #F3F4F6', height: 'fit-content' },
  formTitle:      { margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#111827' },
  label:          { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 10, marginBottom: 4 },
  input:          { width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' },
  primaryBtn:     { background: '#7C3AED', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn:      { background: '#F3F4F6', color: '#374151', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  editBtn:        { background: '#EDE9FE', color: '#7C3AED', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12, marginRight: 6 },
  delBtn:         { background: '#FEE2E2', color: '#DC2626', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  activateBtn:    { background: '#DBEAFE', color: '#1D4ED8', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  activeTag:      { background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 },
  error:          { background: '#FEF2F2', color: '#DC2626', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13 },
  memberList:     { maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 },
  memberRow:      { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', fontSize: 13, cursor: 'pointer' },
};
