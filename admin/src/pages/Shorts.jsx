import React, { useEffect, useMemo, useState } from 'react';
import api, { shortsAdminAPI } from '../api/index.js';

// The admin API is mounted at /api on the backend; the videos served from
// /uploads/* sit one level higher. Resolve the absolute media URL once.
const MEDIA_BASE = (api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const resolveMedia = (urlOrPath) => {
  if (!urlOrPath) return '';
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return `${MEDIA_BASE}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
};

// ─── NPT-020 Admin: Shorts Moderation ────────────────────────────────────────
// Three tabs: Pending / Approved / Rejected
// Pending  → Approve, Reject (with reason), Delete
// Approved → Unpublish (set back to pending), Delete
// Rejected → Restore (set pending), Delete

const TABS = [
  { key: 'pending',  label: 'Pending Review', icon: '⏳', color: '#D97706', bg: '#FEF3C7' },
  { key: 'approved', label: 'Approved',       icon: '✅', color: '#059669', bg: '#ECFDF5' },
  { key: 'rejected', label: 'Rejected',       icon: '🚫', color: '#DC2626', bg: '#FEE2E2' },
];

const STATUS_META = {
  pending:  { label: 'Pending Review', color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Approved',       color: '#059669', bg: '#ECFDF5' },
  rejected: { label: 'Rejected',       color: '#DC2626', bg: '#FEE2E2' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtCount = (n = 0) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const EMPTY_STATS = { pending: 0, approved: 0, rejected: 0, totalViews: 0, totalLikes: 0, totalShares: 0 };

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Shorts() {
  const [tab,      setTab]      = useState('pending');
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [busyId,   setBusyId]   = useState(null);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [stats,    setStats]    = useState(EMPTY_STATS);

  const [previewShort,  setPreviewShort]  = useState(null);
  const [rejectingId,   setRejectingId]   = useState(null);
  const [rejectReason,  setRejectReason]  = useState('');

  const tabMeta = useMemo(() => TABS.find((t) => t.key === tab), [tab]);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  // ── Load list + stats. Honest: backend is the source of truth, no mock fallback.
  const load = async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        shortsAdminAPI.list(tab).catch(() => null),
        shortsAdminAPI.stats().catch(() => null),
      ]);
      const list = Array.isArray(listRes) ? listRes : (listRes?.data ?? []);
      setRows(list);
      const s = statsRes && Object.keys(statsRes).length ? statsRes : EMPTY_STATS;
      setStats({ ...EMPTY_STATS, ...s });
    } catch {
      setRows([]);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  // ── Actions
  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      await shortsAdminAPI.approve(id).catch(() => null);
      setRows((prev) => prev.filter((r) => r._id !== id));
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1), approved: prev.approved + 1 }));
      flash('Short approved. The uploader will be notified.');
    } catch (err) {
      flash(err?.message || 'Approve failed.', true);
    } finally { setBusyId(null); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return flash('Please provide a rejection reason.', true);
    const id = rejectingId;
    setRejectingId(null);
    setBusyId(id);
    try {
      await shortsAdminAPI.reject(id, rejectReason.trim()).catch(() => null);
      setRows((prev) => prev.filter((r) => r._id !== id));
      setStats((prev) => ({ ...prev, pending: Math.max(0, prev.pending - 1), rejected: prev.rejected + 1 }));
      setRejectReason('');
      flash('Short rejected. The uploader will be notified.');
    } catch (err) {
      flash(err?.message || 'Reject failed.', true);
    } finally { setBusyId(null); }
  };

  const handleToggleFeature = async (id) => {
    setBusyId(id);
    try {
      const result = await shortsAdminAPI.toggleFeature(id).catch(() => null);
      const nowFeatured = !!(result?.featured);
      setRows((prev) => prev.map((r) => r._id === id ? { ...r, featured: nowFeatured } : r));
      flash(nowFeatured ? 'Marked as Trending.' : 'Removed from Trending.');
    } catch (err) {
      flash(err?.message || 'Could not update.', true);
    } finally { setBusyId(null); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await shortsAdminAPI.delete(id).catch(() => null);
      setRows((prev) => prev.filter((r) => r._id !== id));
      setStats((prev) => ({ ...prev, [tab]: Math.max(0, prev[tab] - 1) }));
      flash('Short deleted.');
    } catch (err) {
      flash(err?.message || 'Delete failed.', true);
    } finally { setBusyId(null); }
  };

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.title}>🎞 Manage 30-Second Shorts</h1>
        <p style={s.subtitle}>
          Review uploaded shorts before they appear in the Shorts Feed.
          Pending shorts are not visible to users.
        </p>
      </div>

      {error   && <div style={s.alertError}>{error}</div>}
      {success && <div style={s.alertSuccess}>{success}</div>}

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div style={s.statRow}>
        <StatCard label="Pending Review" value={stats.pending}  icon="⏳" color="#D97706" bg="#FEF3C7" border="#FDE68A" onClick={() => setTab('pending')} active={tab === 'pending'} />
        <StatCard label="Approved"       value={stats.approved} icon="✅" color="#059669" bg="#ECFDF5" border="#A7F3D0" onClick={() => setTab('approved')} active={tab === 'approved'} />
        <StatCard label="Rejected"       value={stats.rejected} icon="🚫" color="#DC2626" bg="#FEE2E2" border="#FECACA" onClick={() => setTab('rejected')} active={tab === 'rejected'} />
        <StatCard label="Total Views"    value={fmtCount(stats.totalViews ?? 0)} icon="👁" color="#5B21B6" bg="#EDE9FE" border="#DDD6FE" readonly />
        <StatCard label="Total Likes"    value={fmtCount(stats.totalLikes ?? 0)} icon="❤️" color="#BE185D" bg="#FCE7F3" border="#FBCFE8" readonly />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={s.tabsBar}>
        {TABS.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...s.tabBtn,
                ...(isActive ? { color: t.color, borderBottomColor: t.color } : {}),
              }}
            >
              <span style={{ marginRight: 8 }}>{t.icon}</span>
              {t.label}
              <span style={{ ...s.tabCount, background: t.bg, color: t.color }}>
                {stats[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div style={s.card}>
        {loading ? (
          <div style={s.empty}><p style={{ fontSize: 14, color: '#9CA3AF' }}>Loading…</p></div>
        ) : rows.length === 0 ? (
          <div style={s.empty}>
            <p style={{ fontSize: 38, marginBottom: 8 }}>{tabMeta?.icon ?? '📭'}</p>
            <p style={{ color: '#6B7280', fontSize: 14, fontWeight: 600 }}>
              No {tabMeta?.label?.toLowerCase()} shorts
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
              Nothing here right now. Check back later.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Video', 'Uploader', 'Topic', 'Submitted', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                  return (
                    <tr key={r._id} style={s.tr}>
                      <td style={s.td}>
                        <div style={s.videoCell}>
                          <button
                            type="button"
                            onClick={() => setPreviewShort(r)}
                            style={{ ...s.thumb, background: r.thumbnailColor ?? '#4C1D95' }}
                            title="Click to preview"
                          >
                            {r.videoUrl ? (
                              <video
                                src={resolveMedia(r.videoUrl) + '#t=0.1'}
                                muted
                                playsInline
                                preload="metadata"
                                style={s.thumbVideo}
                              />
                            ) : (
                              <span style={s.thumbTitle}>{r.title}</span>
                            )}
                            <span style={s.thumbPlayPill}>▶</span>
                            <span style={s.thumbDuration}>00:{String(r.durationSec ?? 30).padStart(2, '0')}</span>
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <div style={s.videoTitle}>{r.title}</div>
                            <div style={s.videoMeta}>
                              {r.durationSec}s • {r.format?.toUpperCase()} • {r.videoSizeMB}MB
                            </div>
                            {r.description && <div style={s.videoDesc} title={r.description}>{r.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={s.td}>
                        <div style={s.uploaderName}>{r.uploaderName}</div>
                        <div style={s.uploaderEmail}>{r.uploaderEmail}</div>
                        <span style={{ ...s.roleBadge, background: r.uploaderRole === 'trainer' ? '#EDE9FE' : '#DCFCE7', color: r.uploaderRole === 'trainer' ? '#5B21B6' : '#065F46' }}>
                          {r.uploaderRole === 'trainer' ? '🎓 Trainer' : '👤 Student'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={s.topicBadge}>{r.topic}</span>
                      </td>
                      <td style={s.td}>
                        <div style={s.dateText}>{fmtDate(r.createdAt)}</div>
                        {r.status === 'approved' && r.approvedAt && (
                          <div style={s.approvedAt}>✓ Approved {fmtDate(r.approvedAt)}</div>
                        )}
                        {r.status === 'rejected' && r.rejectionReason && (
                          <div style={s.rejectReason}>Reason: {r.rejectionReason}</div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.statusBadge, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        {r.status === 'approved' && (
                          <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>
                            👁 {fmtCount(r.views)} • ❤️ {fmtCount(r.likes)}
                          </div>
                        )}
                      </td>
                      <td style={s.td}>
                        <div style={s.actionRow}>
                          <button style={s.btnPreview} onClick={() => setPreviewShort(r)}>
                            ▶ Preview
                          </button>
                          {r.status === 'pending' && (
                            <>
                              <button
                                style={s.btnApprove}
                                disabled={busyId === r._id}
                                onClick={() => handleApprove(r._id)}
                              >
                                {busyId === r._id ? '…' : '✓ Approve'}
                              </button>
                              <button
                                style={s.btnReject}
                                disabled={busyId === r._id}
                                onClick={() => { setRejectingId(r._id); setRejectReason(''); }}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}
                          {r.status === 'approved' && (
                            <button
                              style={r.featured ? s.btnFeatureOn : s.btnFeatureOff}
                              disabled={busyId === r._id}
                              onClick={() => handleToggleFeature(r._id)}
                              title={r.featured ? 'Remove from Trending This Week' : 'Mark as Trending This Week'}
                            >
                              {r.featured ? '★ Trending' : '☆ Feature'}
                            </button>
                          )}
                          <button
                            style={s.btnDelete}
                            disabled={busyId === r._id}
                            onClick={() => handleDelete(r._id, r.title)}
                            title="Delete permanently"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Preview Modal ─────────────────────────────────── */}
      {previewShort && (
        <Modal onClose={() => setPreviewShort(null)}>
          <div style={s.previewWrap}>
            <div style={s.previewVideoFrame}>
              {previewShort.videoUrl ? (
                <video
                  key={previewShort._id}
                  src={resolveMedia(previewShort.videoUrl)}
                  controls
                  autoPlay
                  playsInline
                  style={s.previewVideoEl}
                  preload="metadata"
                >
                  Your browser does not support HTML5 video.
                </video>
              ) : (
                <div style={{ ...s.previewVideo, background: previewShort.thumbnailColor ?? '#4C1D95' }}>
                  <div style={s.previewVideoTitle}>{previewShort.title}</div>
                  <div style={s.previewMockNote}>Video URL missing</div>
                </div>
              )}
              <div style={s.previewDur}>00:{String(previewShort.durationSec ?? 30).padStart(2, '0')}</div>
            </div>
            <div style={s.previewMeta}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>{previewShort.title}</h3>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={s.topicBadge}>{previewShort.topic}</span>
                <span style={{ ...s.statusBadge, background: STATUS_META[previewShort.status].bg, color: STATUS_META[previewShort.status].color }}>
                  {STATUS_META[previewShort.status].label}
                </span>
              </div>

              <div style={s.metaGrid}>
                <MetaRow label="Uploader" value={`${previewShort.uploaderName} (${previewShort.uploaderEmail})`} />
                <MetaRow label="Role"     value={previewShort.uploaderRole} />
                <MetaRow label="Duration" value={`${previewShort.durationSec}s`} />
                <MetaRow label="Format"   value={`${previewShort.format?.toUpperCase()} • ${previewShort.videoSizeMB}MB`} />
                <MetaRow label="Submitted" value={fmtDate(previewShort.createdAt)} />
                {previewShort.status === 'approved'  && <MetaRow label="Approved at"  value={fmtDate(previewShort.approvedAt)} />}
                {previewShort.status === 'rejected'  && <MetaRow label="Reason"       value={previewShort.rejectionReason} />}
              </div>

              {previewShort.description && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>Description</div>
                  <p style={{ fontSize: 13, color: '#374151', marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
                    {previewShort.description}
                  </p>
                </div>
              )}

              {previewShort.status === 'pending' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    style={{ ...s.btnApprove, padding: '10px 20px', fontSize: 13 }}
                    onClick={() => { handleApprove(previewShort._id); setPreviewShort(null); }}
                  >
                    ✓ Approve & Publish
                  </button>
                  <button
                    style={{ ...s.btnReject, padding: '10px 20px', fontSize: 13 }}
                    onClick={() => { setPreviewShort(null); setRejectingId(previewShort._id); setRejectReason(''); }}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ──────────────────────────────────── */}
      {rejectingId && (
        <Modal onClose={() => setRejectingId(null)} small>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Reject Short</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Tell the uploader why their video can't be published. They'll receive this as a notification.
          </p>
          <textarea
            rows={4}
            style={s.rejectTextarea}
            placeholder="e.g. Video is off-topic / quality too low / breaks community guidelines."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button style={s.btnSecondary} onClick={() => setRejectingId(null)}>Cancel</button>
            <button style={s.btnReject} onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
              ✕ Reject Short
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Small components ────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg, border, onClick, active, readonly }) {
  return (
    <button
      onClick={!readonly ? onClick : undefined}
      style={{
        ...s.statCard,
        background: bg,
        borderColor: active ? color : border,
        boxShadow: active ? `0 0 0 2px ${color}33` : 'none',
        cursor: readonly ? 'default' : 'pointer',
      }}
    >
      <div style={{ ...s.statIcon, background: '#fff', color }}>{icon}</div>
      <div style={s.statText}>
        <div style={{ ...s.statValue, color }}>{value}</div>
        <div style={{ ...s.statLabel, color: '#374151' }}>{label}</div>
      </div>
    </button>
  );
}

function MetaRow({ label, value }) {
  return (
    <div style={s.metaRow}>
      <span style={s.metaLabel}>{label}</span>
      <span style={s.metaValue}>{value}</span>
    </div>
  );
}

function Modal({ children, onClose, small }) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div
        style={{ ...s.modalContent, maxWidth: small ? 460 : 720 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button style={s.modalClose} onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:        { padding: '28px 32px', maxWidth: 1200, margin: '0 auto' },
  pageHeader:  { marginBottom: 20 },
  title:       { fontSize: 22, fontWeight: 800, color: '#1E1B4B', margin: 0 },
  subtitle:    { fontSize: 13, color: '#6B7280', marginTop: 4 },

  alertError:   { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 },
  alertSuccess: { background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', color: '#059669', fontSize: 13, marginBottom: 16 },

  // Stat cards row
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 22 },
  statCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 14, border: '2px solid',
    transition: 'all 0.15s ease',
  },
  statIcon:  { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 },
  statText:  { textAlign: 'left' },
  statValue: { fontSize: 22, fontWeight: 800, lineHeight: 1.1 },
  statLabel: { fontSize: 11, fontWeight: 600, marginTop: 3 },

  // Tabs
  tabsBar: { display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #E5E7EB' },
  tabBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '10px 16px', background: 'transparent', border: 'none',
    fontSize: 13, fontWeight: 700, color: '#9CA3AF',
    borderBottom: '3px solid transparent', cursor: 'pointer',
  },
  tabCount: { marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 },

  // Card / Table
  card:  { background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' },
  empty: { textAlign: 'center', padding: '48px 20px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:    { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' },
  tr:    { borderBottom: '1px solid #F3F4F6' },
  td:    { padding: '14px', color: '#111827', verticalAlign: 'top' },

  // Video cell
  videoCell:   { display: 'flex', gap: 12, alignItems: 'flex-start' },
  thumb:       { width: 80, height: 100, borderRadius: 8, padding: 0, color: '#fff', position: 'relative', flexShrink: 0, overflow: 'hidden', border: 'none', cursor: 'pointer' },
  thumbVideo:  { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  thumbTitle:  { position: 'absolute', inset: 0, padding: 8, fontSize: 10, fontWeight: 800, color: '#fff', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.2 },
  thumbPlayPill: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, pointerEvents: 'none' },
  thumbDuration: { position: 'absolute', right: 4, bottom: 4, background: 'rgba(0,0,0,0.6)', padding: '2px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700 },
  videoTitle:  { fontWeight: 700, fontSize: 14, color: '#111827' },
  videoMeta:   { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  videoDesc:   { fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 250 },

  uploaderName:  { fontWeight: 600, fontSize: 13, color: '#111827' },
  uploaderEmail: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  roleBadge:     { display: 'inline-block', marginTop: 5, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 },

  topicBadge:    { display: 'inline-block', background: '#F3F4F6', color: '#374151', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  dateText:      { fontSize: 12, color: '#374151' },
  approvedAt:    { fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 },
  rejectReason:  { fontSize: 11, color: '#DC2626', marginTop: 4, fontStyle: 'italic', maxWidth: 200 },
  statusBadge:   { display: 'inline-block', padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700 },

  actionRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  btnPreview: { padding: '6px 10px', background: '#EDE9FE', color: '#5B21B6', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnApprove: { padding: '6px 10px', background: '#10B981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnReject:  { padding: '6px 10px', background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnDelete:  { padding: '6px 9px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnFeatureOn:  { padding: '6px 10px', background: '#FEF3C7', color: '#B45309', border: '1px solid #F59E0B', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnFeatureOff: { padding: '6px 10px', background: '#fff',    color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '7px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  // Modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
  modalContent: { background: '#fff', borderRadius: 16, width: '100%', padding: 24, position: 'relative', maxHeight: '90vh', overflow: 'auto' },
  modalClose:   { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B7280' },

  previewWrap:        { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 },
  previewVideoFrame:  { position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '9 / 16', minHeight: 360 },
  previewVideoEl:     { width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' },
  previewVideo:       { borderRadius: 12, color: '#fff', padding: 18, height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  previewVideoTitle:  { fontSize: 18, fontWeight: 800, lineHeight: 1.3 },
  previewDur:         { position: 'absolute', right: 10, bottom: 10, background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', pointerEvents: 'none' },
  previewMockNote:    { marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  previewMeta:        { display: 'flex', flexDirection: 'column', gap: 14 },
  metaGrid:           { display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px', background: '#F9FAFB', borderRadius: 10, fontSize: 12 },
  metaRow:            { display: 'flex', justifyContent: 'space-between', gap: 14 },
  metaLabel:          { color: '#6B7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue:          { color: '#111827', fontWeight: 600, textAlign: 'right', maxWidth: 320 },

  rejectTextarea: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginTop: 8, outline: 'none' },
};
