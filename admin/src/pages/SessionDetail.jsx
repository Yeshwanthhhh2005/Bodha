import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionAPI, escalationAPI, pollAPI } from '../api/index.js';

const STATE_COLOR = {
  UPCOMING: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  LIVE: { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  DOUBT_SESSION: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  COMPLETED: { bg: '#F9FAFB', text: '#374151', dot: '#9CA3AF' },
};
const STATE_ORDER = ['UPCOMING', 'LIVE', 'DOUBT_SESSION', 'COMPLETED'];

function StatCard({ label, value, sub, color = '#4F46E5', icon }) {
  return (
    <div style={s.statCard}>
      {icon && <div style={s.statIcon}>{icon}</div>}
      <div style={{ ...s.statValue, color }}>{value ?? '—'}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  );
}

function EscalationItem({ item, onRespond }) {
  const [reply, setReply] = useState('');
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try { await onRespond(item._id, reply.trim()); setReply(''); setOpen(false); }
    finally { setSending(false); }
  };

  const studentName = item.studentId?.name ?? 'Student';
  const isAnswered = item.status === 'answered';

  return (
    <div style={{ ...s.escItem, ...(isAnswered ? s.escItemAnswered : {}) }}>
      <div style={s.escRow}>
        <div style={s.escUser}>{studentName}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAnswered && <span style={s.answeredTag}>✓ Answered</span>}
          <span style={s.escTime}>
            {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
      </div>
      <div style={s.escQuestion}>{item.question}</div>

      {isAnswered ? (
        <div style={s.escResponse}>
          <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 11 }}>Trainer: </span>
          {item.trainerResponse}
        </div>
      ) : (
        <div>
          {open ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your response…"
                style={s.replyInput}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                autoFocus
              />
              <button onClick={send} disabled={sending} style={s.sendBtn}>{sending ? '…' : 'Send'}</button>
              <button onClick={() => setOpen(false)} style={s.cancelSmall}>✕</button>
            </div>
          ) : (
            <button onClick={() => setOpen(true)} style={s.respondBtn}>Respond</button>
          )}
        </div>
      )}
    </div>
  );
}

function NotifyModal({ sessionId, onClose }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await sessionAPI.notify(sessionId, message.trim(), type);
      setSent(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      alert(err?.message || 'Failed to send');
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={notifyModal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E1B4B' }}>Send Notification to Students</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#16A34A', fontWeight: 700 }}>✓ Notification sent!</div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Type</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {[['info', '📢 Info'], ['warning', '⚠️ Warning'], ['success', '✅ Alert']].map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setType(v)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: type === v ? '#4F46E5' : '#F3F4F6',
                      color: type === v ? '#fff' : '#6B7280',
                      border: '1.5px solid ' + (type === v ? '#4F46E5' : '#E5E7EB'),
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Session starting in 5 minutes — join now!"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, resize: 'vertical', minHeight: 80, marginTop: 6, boxSizing: 'border-box' }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 18px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={send} disabled={sending || !message.trim()} style={{ padding: '8px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {sending ? 'Sending…' : '📢 Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const STATE_PILL = {
  DRAFT:  { bg: '#F3F4F6', color: '#6B7280' },
  ACTIVE: { bg: '#DCFCE7', color: '#15803D' },
  CLOSED: { bg: '#EFF6FF', color: '#1D4ED8' },
};

function PollBar({ label, count, total, isWinner, correct }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ fontWeight: isWinner ? 700 : 400, color: isWinner ? '#4F46E5' : '#374151' }}>
          {correct && '✓ '}{label}
        </span>
        <span style={{ color: '#6B7280' }}>{count} ({pct}%)</span>
      </div>
      <div style={{ background: '#F3F4F6', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: correct ? '#16A34A' : isWinner ? '#4F46E5' : '#A5B4FC', borderRadius: 6, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

function PollManager({ sessionId }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ question: '', options: ['', '', '', ''], correctOption: '' });
  const [saving, setSaving] = useState(false);
  const liveResultsRef = useRef({});

  const loadPolls = async () => {
    try {
      const data = await pollAPI.list(sessionId);
      setPolls(Array.isArray(data) ? data : []);
    } catch { setPolls([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPolls(); }, [sessionId]);

  // Poll live results every 3s for any ACTIVE poll
  useEffect(() => {
    const active = polls.find((p) => p.state === 'ACTIVE');
    if (!active) return;
    const timer = setInterval(async () => {
      try {
        const res = await pollAPI.results(active._id);
        setPolls((prev) => prev.map((p) => p._id === active._id ? { ...p, counts: res.counts, total: res.total } : p));
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [polls]);

  const resetForm = () => { setForm({ question: '', options: ['', '', '', ''], correctOption: '' }); setEditingId(null); setShowForm(false); };

  const openEdit = (poll) => {
    const opts = [...poll.options];
    while (opts.length < 4) opts.push('');
    setForm({ question: poll.question, options: opts, correctOption: poll.correctOption ?? '' });
    setEditingId(poll._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const opts = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim() || opts.length < 2) return alert('Question and at least 2 options are required.');
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        options: opts,
        correctOption: form.correctOption !== '' ? Number(form.correctOption) : null,
      };
      if (editingId) await pollAPI.update(editingId, payload);
      else await pollAPI.create(sessionId, payload);
      resetForm();
      loadPolls();
    } catch (err) { alert(err?.message || 'Failed to save poll'); }
    finally { setSaving(false); }
  };

  const handleRelease = async (pollId) => {
    try { await pollAPI.release(pollId); loadPolls(); }
    catch (err) { alert(err?.message || 'Failed to release poll'); }
  };

  const handleClose = async (pollId) => {
    try { await pollAPI.close(pollId); loadPolls(); }
    catch (err) { alert(err?.message || 'Failed to close poll'); }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try { await pollAPI.delete(pollId); loadPolls(); }
    catch (err) { alert(err?.message || 'Failed to delete'); }
  };

  if (loading) return <div style={{ padding: 24, color: '#9CA3AF', fontSize: 13 }}>Loading polls…</div>;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E1B4B' }}>
          Question Polls
          {polls.filter((p) => p.state === 'ACTIVE').length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 12 }}>● LIVE</span>
          )}
        </h3>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} style={ps.addBtn}>+ New Poll</button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div style={ps.formCard}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#1E1B4B', marginBottom: 14 }}>{editingId ? 'Edit Poll' : 'New Poll'}</div>
          <div style={{ marginBottom: 12 }}>
            <label style={ps.label}>Question</label>
            <input
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="e.g. What is the time complexity of binary search?"
              style={ps.input}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={ps.label}>Options (min 2, max 4)</label>
            {form.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={ps.optLetter}>{OPTION_LETTERS[i]}</span>
                <input
                  value={opt}
                  onChange={(e) => setForm((f) => { const o = [...f.options]; o[i] = e.target.value; return { ...f, options: o }; })}
                  placeholder={`Option ${OPTION_LETTERS[i]}${i < 2 ? ' (required)' : ' (optional)'}`}
                  style={{ ...ps.input, marginBottom: 0, flex: 1 }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={ps.label}>Correct option (optional — shown after poll closes)</label>
            <select
              value={form.correctOption}
              onChange={(e) => setForm((f) => ({ ...f, correctOption: e.target.value }))}
              style={{ ...ps.input, width: 'auto' }}
            >
              <option value="">None</option>
              {form.options.map((o, i) => o.trim() ? <option key={i} value={i}>{OPTION_LETTERS[i]}: {o}</option> : null)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={ps.saveBtn}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create Poll'}</button>
            <button onClick={resetForm} style={ps.cancelBtn}>Cancel</button>
          </div>
        </div>
      )}

      {/* Poll list */}
      {polls.length === 0 && !showForm ? (
        <div style={{ padding: '24px 0', color: '#9CA3AF', fontSize: 13 }}>No polls yet. Create one above to get started.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {polls.map((poll) => {
            const sp = STATE_PILL[poll.state] ?? STATE_PILL.DRAFT;
            const total = poll.total ?? 0;
            const maxCount = poll.counts ? Math.max(...poll.counts) : 0;
            return (
              <div key={poll._id} style={ps.pollCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...ps.statePill, background: sp.bg, color: sp.color }}>{poll.state}</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginTop: 6, lineHeight: 1.4 }}>{poll.question}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                    {poll.state === 'DRAFT' && (
                      <>
                        <button onClick={() => openEdit(poll)} style={ps.iconBtn} title="Edit">✏️</button>
                        <button onClick={() => handleRelease(poll._id)} style={ps.releaseBtn}>▶ Release</button>
                        <button onClick={() => handleDelete(poll._id)} style={ps.iconBtn} title="Delete">🗑️</button>
                      </>
                    )}
                    {poll.state === 'ACTIVE' && (
                      <button onClick={() => handleClose(poll._id)} style={ps.closeBtn}>■ Close Poll</button>
                    )}
                    {poll.state === 'CLOSED' && (
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>Closed {poll.closedAt ? new Date(poll.closedAt).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : ''}</span>
                    )}
                  </div>
                </div>

                {/* Results bars — show for ACTIVE and CLOSED */}
                {(poll.state === 'ACTIVE' || poll.state === 'CLOSED') && (
                  <div style={{ marginTop: 8 }}>
                    {poll.options.map((opt, i) => (
                      <PollBar
                        key={i}
                        label={`${OPTION_LETTERS[i]}: ${opt}`}
                        count={poll.counts?.[i] ?? 0}
                        total={total}
                        isWinner={poll.counts?.[i] === maxCount && maxCount > 0}
                        correct={poll.correctOption === i && poll.state === 'CLOSED'}
                      />
                    ))}
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      {total} response{total !== 1 ? 's' : ''}{poll.state === 'ACTIVE' ? ' — refreshes every 3s' : ''}
                    </div>
                  </div>
                )}

                {/* Draft: just show options as list */}
                {poll.state === 'DRAFT' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {poll.options.map((opt, i) => (
                      <span key={i} style={ps.optChip}>{OPTION_LETTERS[i]}: {opt}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [escFilter, setEscFilter] = useState('all');
  const [showNotify, setShowNotify] = useState(false);

  const loadData = () => {
    Promise.all([
      sessionAPI.get(id),
      sessionAPI.analytics(id).catch(() => null),
    ]).then(([sess, ana]) => {
      setSession(sess);
      setAnalytics(ana);
    }).catch(() => {}).finally(() => setLoading(false));

    escalationAPI.list(id).then((data) => {
      setEscalations(Array.isArray(data) ? data : []);
    }).catch(() => setEscalations([]));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleToggleVisibility = async () => {
    try {
      await sessionAPI.update(id, { isVisible: !session.isVisible });
      loadData();
    } catch (err) {
      alert(err?.message || 'Failed to update visibility');
    }
  };

  const handleStateChange = async (state) => {
    try {
      await sessionAPI.setState(id, state);
      loadData();
    } catch (err) {
      alert(err?.message || 'State change failed');
    }
  };

  const handleRespond = async (escId, response) => {
    await escalationAPI.respond(escId, response);
    loadData();
  };

  if (loading) return <div style={s.loading}>Loading…</div>;
  if (!session) return <div style={s.loading}>Session not found.</div>;

  const col = STATE_COLOR[session.state] ?? STATE_COLOR.COMPLETED;
  const idx = STATE_ORDER.indexOf(session.state);
  const nextStates = [];
  if (session.state === 'LIVE') nextStates.push('DOUBT_SESSION', 'COMPLETED');
  else if (idx >= 0 && idx < STATE_ORDER.length - 1) nextStates.push(STATE_ORDER[idx + 1]);

  const pending = escalations.filter((e) => e.status === 'pending');
  const filteredEsc = escFilter === 'pending' ? pending : escFilter === 'answered' ? escalations.filter((e) => e.status === 'answered') : escalations;

  return (
    <div style={s.page}>
      {showNotify && <NotifyModal sessionId={id} onClose={() => setShowNotify(false)} />}

      {/* Breadcrumb */}
      <div style={s.breadcrumb}>
        <Link to="/sessions" style={s.breadLink}>Sessions</Link>
        <span style={s.breadSep}>/</span>
        <span>{session.title}</span>
      </div>

      {/* Header */}
      <div style={s.topRow}>
        <div style={{ flex: 1 }}>
          <h2 style={s.pageTitle}>{session.title}</h2>
          {session.subtitle && <p style={s.subtitle}>{session.subtitle}</p>}
          <div style={s.metaRow}>
            <span style={{ ...s.badge, background: col.bg, color: col.text }}>
              <span style={{ ...s.dot, background: col.dot }} />
              {session.state?.replace(/_/g, ' ')}
            </span>
            <span style={{ ...s.badge, background: session.isVisible ? '#F0FDF4' : '#FEF2F2', color: session.isVisible ? '#16A34A' : '#DC2626' }}>
              {session.isVisible ? '👁 Visible' : '🙈 Hidden'}
            </span>
            <span style={s.metaItem}>{session.category}</span>
            {session.instructor?.name && <span style={s.metaItem}>👤 {session.instructor.name}</span>}
            <span style={s.metaItem}>🕐 {new Date(session.scheduledAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</span>
            <span style={s.metaItem}>⏱ {session.durationMinutes} min</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleToggleVisibility}
            style={{ ...s.notifyBtn, background: session.isVisible ? '#FEF2F2' : '#F0FDF4', color: session.isVisible ? '#DC2626' : '#16A34A', borderColor: session.isVisible ? '#FCA5A5' : '#86EFAC' }}
          >
            {session.isVisible ? '🙈 Disable' : '👁 Enable'}
          </button>
          <button onClick={() => setShowNotify(true)} style={s.notifyBtn}>📢 Notify Students</button>
          {nextStates.map((ns) => (
            <button key={ns} onClick={() => handleStateChange(ns)} style={s.advanceBtn}>
              → {ns.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div style={s.statsGrid}>
          <StatCard icon="👥" label="Watchers" value={analytics.totalJoins} color="#4F46E5" />
          <StatCard icon="📈" label="Peak Watchers" value={analytics.peakWatchers} color="#2563EB" />
          <StatCard icon="💬" label="Total Messages" value={analytics.totalMessages} color="#0D9488" />
          <StatCard icon="🤖" label="AI Messages" value={analytics.aiUsage} color="#7C3AED" />
          <StatCard icon="❓" label="Escalations" value={analytics.totalEscalations} color="#DC2626" />
          <StatCard
            icon="✅"
            label="Responded"
            value={analytics.respondedEscalations}
            sub={`${analytics.responseRate ?? 0}% response rate`}
            color="#16A34A"
          />
          <StatCard icon="🔖" label="Doubt Chat" value={analytics.doubtSessionEngagement} color="#D97706" />
          <StatCard icon="🔔" label="Reminders Set" value={analytics.remindersSet} color="#6B7280" />
        </div>
      )}

      {/* Polls */}
      <PollManager sessionId={id} />

      {/* Two-column: Session Info + Escalation Queue */}
      <div style={{ ...s.twoCol, marginTop: 28 }}>
        {/* Session Info */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Session Configuration</h3>
          <table style={s.infoTable}>
            <tbody>
              {[
                ['Title', session.title],
                ['Subtitle', session.subtitle || '—'],
                ['Instructor', session.instructor?.name || '—'],
                ['Department', session.instructor?.department || '—'],
                ['Category', session.category],
                ['Duration', `${session.durationMinutes} minutes`],
                ['AI Chat', session.aiEnabled ? '✅ Enabled' : '❌ Disabled'],
                ['AI Tone', session.aiResponseTone || '—'],
                ['Topic Context', session.aiTopicContext || '—'],
                ['YouTube URL', session.youtubeUrl ? <a href={session.youtubeUrl} target="_blank" rel="noreferrer" style={{ color: '#4F46E5', fontSize: 12 }}>Open link</a> : '—'],
                ['Recording URL', session.recordingUrl ? <a href={session.recordingUrl} target="_blank" rel="noreferrer" style={{ color: '#4F46E5', fontSize: 12 }}>Open link</a> : '—'],
                ['Doubt Session', session.doubtSessionEndsAt ? `Ends ${new Date(session.doubtSessionEndsAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })}` : '—'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={s.infoKey}>{k}</td>
                  <td style={s.infoVal}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Escalation Queue */}
        <div style={s.card}>
          <div style={{ ...s.cardTitle, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Escalation Queue
              {pending.length > 0 && (
                <span style={s.pendingBadge}>{pending.length} pending</span>
              )}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all', 'All'], ['pending', 'Pending'], ['answered', 'Answered']].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setEscFilter(v)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: escFilter === v ? '#4F46E5' : '#F3F4F6',
                    color: escFilter === v ? '#fff' : '#6B7280',
                    border: '1px solid ' + (escFilter === v ? '#4F46E5' : '#E5E7EB'),
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {filteredEsc.length === 0 ? (
            <div style={s.escEmpty}>No escalations {escFilter !== 'all' ? `(${escFilter})` : ''} yet.</div>
          ) : (
            <div style={s.escList}>
              {filteredEsc.map((e) => (
                <EscalationItem key={e._id} item={e} onRespond={handleRespond} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '32px 36px', maxWidth: 1140 },
  loading: { padding: 48, color: '#9CA3AF', fontSize: 14 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: '#6B7280' },
  breadLink: { color: '#4F46E5', textDecoration: 'none', fontWeight: 600 },
  breadSep: { color: '#D1D5DB' },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#1E1B4B', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  dot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  metaItem: { fontSize: 12, color: '#6B7280' },
  advanceBtn: { padding: '8px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
  notifyBtn: { padding: '8px 16px', background: '#fff', color: '#4F46E5', border: '1.5px solid #4F46E5', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 },
  statCard: { background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  statIcon: { fontSize: 18, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 700, lineHeight: 1.2 },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  statSub: { fontSize: 10, color: '#D97706', marginTop: 2 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 22, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#1E1B4B', marginBottom: 14 },
  infoTable: { width: '100%', borderCollapse: 'collapse' },
  infoKey: { width: 130, fontSize: 12, color: '#9CA3AF', fontWeight: 600, padding: '7px 0', verticalAlign: 'top' },
  infoVal: { fontSize: 13, color: '#111827', padding: '7px 0', wordBreak: 'break-word' },
  pendingBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 8px', borderRadius: 12, background: '#FEF2F2', color: '#DC2626', fontSize: 10, fontWeight: 700 },
  escEmpty: { padding: '20px 0', color: '#9CA3AF', fontSize: 13 },
  escList: { maxHeight: 460, overflowY: 'auto', marginRight: -8, paddingRight: 8 },
  escItem: { padding: '12px 0', borderBottom: '1px solid #F9FAFB' },
  escItemAnswered: { opacity: 0.7 },
  escRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  escUser: { fontSize: 12, fontWeight: 700, color: '#374151' },
  escTime: { fontSize: 11, color: '#9CA3AF' },
  answeredTag: { fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#F0FDF4', padding: '2px 6px', borderRadius: 10 },
  escQuestion: { fontSize: 13, color: '#111827', lineHeight: 1.5 },
  escResponse: { marginTop: 6, fontSize: 12, color: '#374151', background: '#F0FDF4', padding: '6px 10px', borderRadius: 6, lineHeight: 1.5 },
  replyInput: { flex: 1, padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none' },
  sendBtn: { padding: '7px 14px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  cancelSmall: { padding: '7px 10px', background: '#F3F4F6', color: '#9CA3AF', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  respondBtn: { marginTop: 8, padding: '5px 12px', background: '#EEF2FF', color: '#4F46E5', border: '1.5px solid #C7D2FE', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};

const ps = {
  addBtn: { padding: '7px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  formCard: { background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: 20, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 5 },
  input: { width: '100%', padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 0 },
  optLetter: { width: 24, height: 24, borderRadius: 12, background: '#E0E7FF', color: '#4F46E5', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  saveBtn: { padding: '8px 20px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  cancelBtn: { padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  pollCard: { background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  statePill: { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: 0.4 },
  releaseBtn: { padding: '5px 12px', background: '#DCFCE7', color: '#15803D', border: '1.5px solid #86EFAC', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer' },
  closeBtn: { padding: '5px 12px', background: '#FEF2F2', color: '#DC2626', border: '1.5px solid #FCA5A5', borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: 'pointer' },
  iconBtn: { padding: '5px 8px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, cursor: 'pointer' },
  optChip: { fontSize: 11, background: '#EEF2FF', color: '#4F46E5', padding: '3px 9px', borderRadius: 8, fontWeight: 600 },
};

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const notifyModal = {
  background: '#fff', borderRadius: 12, padding: 24,
  width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
