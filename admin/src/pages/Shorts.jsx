import React, { useEffect, useState } from 'react';
import { shortsAPI } from '../api/index.js';

const TOPICS = ['Data Structures', 'Algorithms', 'DBMS', 'OS', 'Networking', 'OOPs', 'Other'];

const STATUS_COLOR = {
  pending:  { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  approved: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  topic: 'Data Structures',
  videoUrl: '',
  bgTop: '#7C3AED',
  bgBot: '#4C1D95',
};

function ShortForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => initial
    ? {
        title: initial.title ?? '',
        description: initial.description ?? '',
        topic: initial.topic ?? 'Data Structures',
        videoUrl: initial.videoUrl ?? '',
        bgTop: initial.bgTop ?? '#7C3AED',
        bgBot: initial.bgBot ?? '#4C1D95',
      }
    : EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > 50 * 1024 * 1024) {
      setErr('Video too large. Max 50MB.');
      return;
    }
    setErr('');
    setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        topic: form.topic,
        videoUrl: form.videoUrl.trim(),
        bgTop: form.bgTop,
        bgBot: form.bgBot,
      };
      if (file) payload.file = file;
      await onSave(payload);
    } catch (e2) {
      setErr(e2?.message || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>
              {initial ? 'Edit Short' : 'New Trainer Short — Publish Directly'}
            </h3>
            {!initial && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                Admin uploads go live immediately — no approval needed.
              </div>
            )}
          </div>
          <button onClick={onCancel} style={closeBtn}>x</button>
        </div>

        {err && <div style={errBox}>{err}</div>}

        <form onSubmit={submit} style={formGrid}>
          <Field label="Title">
            <input value={form.title} onChange={set('title')} required style={inp} placeholder="e.g. What is Recursion?" />
          </Field>
          <Field label="Topic">
            <select value={form.topic} onChange={set('topic')} style={inp}>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Description (optional)">
            <textarea value={form.description} onChange={set('description')} style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="Short description shown on preview" />
          </Field>

          {!initial && (
            <Field label="Upload Video File (MP4 / MOV, max 50MB)">
              <input type="file" accept="video/mp4,video/quicktime,video/*" onChange={onFile} style={fileInp} />
              {file && (
                <div style={fileMeta}>
                  {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              )}
            </Field>
          )}

          <Field label={initial ? 'Video URL' : 'Or paste external Video URL'}>
            <input value={form.videoUrl} onChange={set('videoUrl')} style={inp} placeholder="https://..." />
          </Field>

          <div style={row2}>
            <Field label="Thumbnail Top Color" half>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.bgTop} onChange={set('bgTop')} style={colorInp} />
                <input value={form.bgTop} onChange={set('bgTop')} style={inp} />
              </div>
            </Field>
            <Field label="Thumbnail Bottom Color" half>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.bgBot} onChange={set('bgBot')} style={colorInp} />
                <input value={form.bgBot} onChange={set('bgBot')} style={inp} />
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ ...sectionLabel, marginBottom: 8 }}>Thumbnail Preview</div>
            <div style={{
              width: 130, height: 150, borderRadius: 12,
              padding: 10, color: '#fff', fontWeight: 800, fontSize: 14,
              background: `linear-gradient(180deg, ${form.bgTop} 0%, ${form.bgBot} 100%)`,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>{form.title || 'Title preview'}</div>
              <div style={{ fontSize: 11 }}>00:30</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={saveBtn}>
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Publish Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectModal({ short, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); }
    catch (e) { alert(e?.message || 'Reject failed'); setBusy(false); }
  };

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 460 }}>
        <div style={modalHeader}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>Reject Short</h3>
          <button onClick={onCancel} style={closeBtn}>x</button>
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 14 }}>
          Reject "<strong>{short?.title}</strong>" by {short?.creator?.name || 'Unknown'}?
        </div>
        <Field label="Reason (optional — shown to the student)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Audio not clear, please re-upload..."
            style={{ ...inp, minHeight: 80, resize: 'vertical' }}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={cancelBtn}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy} style={rejectBtn}>
            {busy ? 'Rejecting...' : 'Reject Short'}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoPreviewCell({ short }) {
  // If we have a real video URL, show a small <video>. Otherwise fall back to gradient thumb.
  if (short.videoUrl) {
    return (
      <video
        src={short.videoUrl}
        style={{
          width: 64, height: 84, borderRadius: 8,
          objectFit: 'cover', background: '#000',
        }}
        muted
        playsInline
        onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
      />
    );
  }
  return (
    <div style={{
      width: 64, height: 84, borderRadius: 8,
      background: `linear-gradient(180deg, ${short.bgTop} 0%, ${short.bgBot} 100%)`,
      padding: 6, color: '#fff', fontSize: 9, fontWeight: 800,
      display: 'flex', alignItems: 'flex-start',
    }}>
      {short.title?.split(' ').slice(0, 2).join(' ')}
    </div>
  );
}

function Field({ label, children, half }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(half && { minWidth: 0 }) }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</label>
      {children}
    </div>
  );
}

function PendingCard({ short, onApprove, onReject }) {
  return (
    <div style={pendingCard}>
      <div style={{ display: 'flex', gap: 14 }}>
        {short.videoUrl ? (
          <video
            src={short.videoUrl}
            controls
            style={{ width: 180, height: 240, borderRadius: 12, background: '#000', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: 180, height: 240, borderRadius: 12,
            background: `linear-gradient(180deg, ${short.bgTop} 0%, ${short.bgBot} 100%)`,
            color: '#fff', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{short.title}</div>
            <div style={{ fontSize: 12 }}>00:30</div>
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1E1B4B' }}>{short.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {short.creator?.name || 'Unknown'} · submitted {timeAgo(short.createdAt)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={topicChip}>{short.topic}</span>
            <span style={{ ...topicChip, background: '#FEF3C7', color: '#92400E' }}>Pending</span>
          </div>
          {short.description && (
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
              {short.description}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onApprove(short)} style={approveBtnLg}>
              Approve & Publish
            </button>
            <button onClick={() => onReject(short)} style={rejectBtnLg}>
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Shorts() {
  const [tab, setTab] = useState('pending'); // pending | all
  const [shorts, setShorts] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const loadAll = () => {
    setLoading(true);
    shortsAPI
      .list({ status: statusFilter, type: typeFilter })
      .then((data) => setShorts(Array.isArray(data) ? data : []))
      .catch(() => setShorts([]))
      .finally(() => setLoading(false));
  };

  const loadPending = () => {
    setLoading(true);
    shortsAPI
      .pending()
      .then((data) => setPending(Array.isArray(data) ? data : []))
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'pending') loadPending();
    else loadAll();
  }, [tab, statusFilter, typeFilter]);

  // Always refresh pending count in background
  useEffect(() => {
    shortsAPI.pending().then((d) => setPending(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleCreate = async (form) => {
    await shortsAPI.create(form);
    setShowForm(false);
    if (tab === 'all') loadAll();
  };
  const handleUpdate = async (form) => {
    await shortsAPI.update(editing._id, form);
    setEditing(null);
    if (tab === 'all') loadAll();
  };
  const handleApprove = async (short) => {
    try {
      await shortsAPI.approve(short._id);
      if (tab === 'pending') loadPending();
      else loadAll();
      // Update pending count
      shortsAPI.pending().then((d) => setPending(Array.isArray(d) ? d : [])).catch(() => {});
    } catch (e) { alert(e?.message || 'Approve failed'); }
  };
  const handleRejectConfirm = async (reason) => {
    if (!rejecting) return;
    await shortsAPI.reject(rejecting._id, reason);
    setRejecting(null);
    if (tab === 'pending') loadPending();
    else loadAll();
    shortsAPI.pending().then((d) => setPending(Array.isArray(d) ? d : [])).catch(() => {});
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this short? This cannot be undone.')) return;
    await shortsAPI.delete(id);
    if (tab === 'all') loadAll();
    else loadPending();
  };

  const approvedCount = shorts.filter((x) => x.status === 'approved').length;

  return (
    <div style={styles.page}>
      {showForm && <ShortForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}
      {editing && <ShortForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
      {rejecting && (
        <RejectModal
          short={rejecting}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejecting(null)}
        />
      )}

      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>30 Sec Shorts</h2>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Approve student submissions or publish trainer shorts directly.
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.newBtn}>+ New Trainer Short</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('pending')}
          style={{ ...styles.tab, ...(tab === 'pending' ? styles.tabActive : {}) }}
        >
          Pending Approvals
          {pending.length > 0 && (
            <span style={styles.tabBadge}>{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          style={{ ...styles.tab, ...(tab === 'all' ? styles.tabActive : {}) }}
        >
          All Shorts
        </button>
      </div>

      {tab === 'pending' ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Awaiting Review</div>
              <div style={{ ...styles.statValue, color: '#92400E' }}>{pending.length}</div>
            </div>
          </div>

          {loading ? (
            <div style={styles.empty}>Loading...</div>
          ) : pending.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 14, color: '#374151', fontWeight: 700 }}>All caught up!</div>
              <div style={{ marginTop: 6 }}>No student shorts awaiting review.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
              {pending.map((s) => (
                <PendingCard
                  key={s._id}
                  short={s}
                  onApprove={handleApprove}
                  onReject={(sh) => setRejecting(sh)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={styles.statRow}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Pending Review</div>
              <div style={{ ...styles.statValue, color: '#92400E' }}>
                {shorts.filter((x) => x.status === 'pending').length}
              </div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Approved (Live)</div>
              <div style={{ ...styles.statValue, color: '#065F46' }}>{approvedCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Shorts</div>
              <div style={{ ...styles.statValue, color: '#1E1B4B' }}>{shorts.length}</div>
            </div>
          </div>

          <div style={styles.filterBar}>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Status:</span>
              {['all', 'pending', 'approved', 'rejected'].map((sval) => (
                <button
                  key={sval}
                  onClick={() => setStatusFilter(sval)}
                  style={{ ...styles.filterBtn, ...(statusFilter === sval ? styles.filterActive : {}) }}
                >
                  {sval === 'all' ? 'All' : sval.charAt(0).toUpperCase() + sval.slice(1)}
                </button>
              ))}
            </div>
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Type:</span>
              {['all', 'trainer', 'student'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{ ...styles.filterBtn, ...(typeFilter === t ? styles.filterActive : {}) }}
                >
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={styles.empty}>Loading...</div>
          ) : shorts.length === 0 ? (
            <div style={styles.empty}>No shorts found for this filter.</div>
          ) : (
            <div style={styles.table}>
              <div style={styles.thead}>
                <div style={{ ...styles.th, width: 80 }}>Preview</div>
                <div style={{ ...styles.th, flex: 2 }}>Title</div>
                <div style={{ ...styles.th, flex: 1.2 }}>Creator</div>
                <div style={{ ...styles.th, flex: 1 }}>Topic</div>
                <div style={{ ...styles.th, flex: 0.8 }}>Type</div>
                <div style={{ ...styles.th, flex: 0.8 }}>Status</div>
                <div style={{ ...styles.th, flex: 0.8 }}>Views</div>
                <div style={{ ...styles.th, flex: 2 }}>Actions</div>
              </div>

              {shorts.map((sh) => {
                const col = STATUS_COLOR[sh.status] ?? STATUS_COLOR.pending;
                return (
                  <div key={sh._id} style={styles.row}>
                    <div style={{ ...styles.td, width: 80 }}>
                      <VideoPreviewCell short={sh} />
                    </div>
                    <div style={{ ...styles.td, flex: 2 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{sh.title}</div>
                      {!!sh.description && (
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sh.description.slice(0, 80)}</div>
                      )}
                    </div>
                    <div style={{ ...styles.td, flex: 1.2, fontSize: 12, color: '#6B7280' }}>
                      {sh.creator?.name ?? '-'}
                    </div>
                    <div style={{ ...styles.td, flex: 1, fontSize: 12, color: '#6B7280' }}>{sh.topic}</div>
                    <div style={{ ...styles.td, flex: 0.8, fontSize: 11 }}>
                      <span style={{ ...styles.typeBadge, background: sh.creatorType === 'trainer' ? '#EDE9FE' : '#DCFCE7', color: sh.creatorType === 'trainer' ? '#5B21B6' : '#166534' }}>
                        {sh.creatorType}
                      </span>
                    </div>
                    <div style={{ ...styles.td, flex: 0.8 }}>
                      <span style={{ ...styles.badge, background: col.bg, color: col.text }}>
                        <span style={{ ...styles.dot, background: col.dot }} />
                        {sh.status}
                      </span>
                    </div>
                    <div style={{ ...styles.td, flex: 0.8, fontSize: 12, color: '#374151' }}>{sh.views}</div>
                    <div style={{ ...styles.td, flex: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sh.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(sh)} style={{ ...styles.actionBtn, ...styles.approve }}>Approve</button>
                          <button onClick={() => setRejecting(sh)} style={{ ...styles.actionBtn, ...styles.reject }}>Reject</button>
                        </>
                      )}
                      <button onClick={() => setEditing(sh)} style={styles.actionBtn}>Edit</button>
                      <button onClick={() => handleDelete(sh._id)} style={styles.actionBtn}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = {
  page: { padding: '32px 36px', maxWidth: 1200 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#1E1B4B' },
  newBtn: {
    padding: '9px 20px', background: '#4F46E5', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
  },

  tabs: {
    display: 'flex', gap: 6, marginBottom: 22,
    borderBottom: '1px solid #E5E7EB',
  },
  tab: {
    background: 'transparent', border: 'none',
    padding: '10px 18px', fontSize: 13, fontWeight: 700,
    color: '#6B7280', cursor: 'pointer',
    borderBottom: '2px solid transparent',
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  tabActive: { color: '#4F46E5', borderBottomColor: '#4F46E5' },
  tabBadge: {
    background: '#EF4444', color: '#fff',
    fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 10,
  },

  statRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 },
  statCard: {
    background: '#fff', borderRadius: 12,
    padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    minWidth: 180,
  },
  statLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 26, fontWeight: 800, marginTop: 6 },
  filterBar: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginBottom: 16,
    background: '#fff', padding: '12px 16px', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  filterGroup: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, fontWeight: 700, color: '#6B7280', marginRight: 4 },
  filterBtn: {
    padding: '5px 12px', border: '1.5px solid #E5E7EB', borderRadius: 16,
    background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  filterActive: { background: '#4F46E5', color: '#fff', borderColor: '#4F46E5' },
  empty: { color: '#9CA3AF', fontSize: 14, padding: 24, textAlign: 'center', background: '#fff', borderRadius: 12 },
  table: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' },
  thead: { display: 'flex', padding: '10px 18px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' },
  th: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #F9FAFB' },
  td: { fontSize: 13, color: '#111827', paddingRight: 10 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  typeBadge: { display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontWeight: 700, textTransform: 'capitalize' },
  actionBtn: {
    padding: '5px 10px', background: '#F3F4F6', color: '#374151',
    border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11,
    fontWeight: 600, cursor: 'pointer',
  },
  approve: { background: '#D1FAE5', color: '#065F46', borderColor: '#A7F3D0' },
  reject:  { background: '#FEE2E2', color: '#991B1B', borderColor: '#FECACA' },
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: '#fff', borderRadius: 14, padding: '28px 32px',
  width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
const modalHeader = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, gap: 12 };
const closeBtn = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9CA3AF', fontWeight: 700 };
const errBox = { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', padding: '10px 14px', fontSize: 13, marginBottom: 16 };
const formGrid = { display: 'flex', flexDirection: 'column', gap: 12 };
const sectionLabel = { fontSize: 10, fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: 1 };
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const inp = { padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
const fileInp = { padding: '9px 12px', border: '1.5px dashed #C7D2FE', borderRadius: 8, fontSize: 13, width: '100%', boxSizing: 'border-box', background: '#F5F3FF', cursor: 'pointer' };
const fileMeta = { fontSize: 11, color: '#6B7280', marginTop: 4 };
const colorInp = { width: 38, height: 36, padding: 2, border: '1.5px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' };
const cancelBtn = { padding: '9px 20px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const saveBtn = { padding: '9px 24px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const rejectBtn = { padding: '9px 24px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' };

const pendingCard = {
  background: '#fff', borderRadius: 14, padding: 16,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  border: '1px solid #F3F4F6',
};
const topicChip = {
  display: 'inline-block', padding: '3px 10px', borderRadius: 12,
  background: '#EDE9FE', color: '#4F46E5',
  fontSize: 11, fontWeight: 700,
};
const approveBtnLg = {
  padding: '10px 18px', background: '#10B981', color: '#fff',
  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
const rejectBtnLg = {
  padding: '10px 18px', background: '#fff', color: '#EF4444',
  border: '1.5px solid #FECACA', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
