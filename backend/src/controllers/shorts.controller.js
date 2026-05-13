const fs = require('fs');
const path = require('path');
const Short = require('../models/Short');
const User  = require('../models/User');
const { success, error } = require('../utils/response');
const { createAndPush, emitGlobal } = require('../services/notification.service');

const PAGE_SIZE = 20;
const MAX_DURATION_SEC = 30;

// Soft palette used to colour the placeholder thumbnail server-side so the
// feed feels visually varied even before real thumbnails are generated.
const THUMB_COLORS = [
  '#312E81', '#7C2D12', '#92400E', '#1E40AF', '#581C87',
  '#065F46', '#4C1D95', '#1F2937', '#1E3A8A', '#7F1D1D',
];

const pickThumbColor = () => THUMB_COLORS[Math.floor(Math.random() * THUMB_COLORS.length)];

const removeFile = (videoUrl) => {
  if (!videoUrl) return;
  try {
    // videoUrl is like "/uploads/shorts/abc.mp4" — strip the leading slash
    const abs = path.join(__dirname, '..', '..', videoUrl.replace(/^\//, ''));
    fs.unlink(abs, () => {});
  } catch { /* swallow */ }
};

// Public shape — strip sensitive fields like likedBy for non-admin reads.
const toPublic = (short, viewer) => {
  const obj = short.toObject ? short.toObject() : short;
  const likedBy = obj.likedBy || [];
  const viewerId = viewer?._id?.toString();
  return {
    _id: obj._id,
    title: obj.title,
    description: obj.description,
    topic: obj.topic,
    videoUrl: obj.videoUrl,
    durationSec: obj.durationSec,
    durationLabel: `00:${String(obj.durationSec).padStart(2, '0')}`,
    thumbnailColor: obj.thumbnailColor,
    creatorId: obj.uploader,
    creatorName: obj.uploaderName,
    creatorRole: obj.uploaderRole,
    creatorHandle: '@' + (obj.uploaderName || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    views: obj.views,
    likes: obj.likes,
    shares: obj.shares,
    liked: viewerId ? likedBy.some((u) => u.toString() === viewerId) : false,
    featured: obj.featured,
    uploadedAt: obj.createdAt,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// USER-FACING
// ════════════════════════════════════════════════════════════════════════════

// GET /api/shorts/feed?section=trainer|student&topic=X&page=N
exports.feed = async (req, res, next) => {
  try {
    const { section = 'trainer', topic, page = 1 } = req.query;
    const q = { status: 'approved' };
    if (section === 'trainer' || section === 'student') q.uploaderRole = section;
    if (topic && topic !== 'All') q.topic = topic;

    const docs = await Short.find(q)
      .sort({ createdAt: -1 })
      .skip((Math.max(1, +page) - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    success(res, docs.map((d) => toPublic(d, req.user)));
  } catch (err) { next(err); }
};

// GET /api/shorts/trending — top videos this week (admin-featured first, then most-viewed)
exports.trending = async (req, res, next) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const docs = await Short.find({ status: 'approved', createdAt: { $gte: oneWeekAgo } })
      .sort({ featured: -1, views: -1, createdAt: -1 })
      .limit(10);

    // Fallback: if nothing this week, return latest approved
    if (docs.length === 0) {
      const latest = await Short.find({ status: 'approved' })
        .sort({ views: -1, createdAt: -1 })
        .limit(10);
      return success(res, latest.map((d) => toPublic(d, req.user)));
    }

    success(res, docs.map((d) => toPublic(d, req.user)));
  } catch (err) { next(err); }
};

// GET /api/shorts/top-creators — students with the most approved-video likes
exports.topCreators = async (req, res, next) => {
  try {
    const agg = await Short.aggregate([
      { $match: { status: 'approved', uploaderRole: 'student' } },
      {
        $group: {
          _id: '$uploader',
          name: { $first: '$uploaderName' },
          totalLikes: { $sum: '$likes' },
          totalViews: { $sum: '$views' },
          videoCount: { $sum: 1 },
        },
      },
      { $sort: { totalLikes: -1, totalViews: -1 } },
      { $limit: 10 },
    ]);

    // Mock follower count proportional to engagement until a real Follow model exists
    const palette = ['#F472B6', '#60A5FA', '#A78BFA', '#FB923C', '#34D399', '#FBBF24', '#22D3EE'];
    const list = agg.map((c, i) => ({
      _id: c._id,
      name: c.name,
      handle: '@' + (c.name || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      followers: c.totalLikes + c.totalViews * 0.1 | 0,
      avatarColor: palette[i % palette.length],
      initials: (c.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
      videoCount: c.videoCount,
    }));

    success(res, list);
  } catch (err) { next(err); }
};

// GET /api/shorts/mine — the caller's own uploads (any status)
exports.mine = async (req, res, next) => {
  try {
    const docs = await Short.find({ uploader: req.user._id }).sort({ createdAt: -1 });
    success(res, docs.map((d) => ({
      ...toPublic(d, req.user),
      status: d.status,
      rejectionReason: d.rejectionReason,
    })));
  } catch (err) { next(err); }
};

// POST /api/shorts/upload — multipart form data (video + title/topic/description)
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No video file uploaded', 400);

    const { title, topic, description = '', durationSec } = req.body;
    if (!title?.trim()) { removeFile('/' + req.file.path.replace(/\\/g, '/')); return error(res, 'Title is required', 400); }
    if (!topic) { removeFile('/' + req.file.path.replace(/\\/g, '/')); return error(res, 'Topic is required', 400); }
    if (!Short.TOPICS.includes(topic)) { removeFile('/' + req.file.path.replace(/\\/g, '/')); return error(res, 'Invalid topic', 400); }

    const dur = parseInt(durationSec, 10) || 30;
    if (dur < 1 || dur > MAX_DURATION_SEC) {
      removeFile('/' + req.file.path.replace(/\\/g, '/'));
      return error(res, `Video must be 1–${MAX_DURATION_SEC} seconds`, 400);
    }

    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    if (!['mp4', 'mov'].includes(ext)) {
      removeFile('/' + req.file.path.replace(/\\/g, '/'));
      return error(res, 'Only MP4 or MOV videos are allowed', 400);
    }

    // Build the public URL from the saved path. multer.diskStorage writes to
    // backend/uploads/shorts/, so the URL is /uploads/shorts/<filename>.
    const videoUrl = '/' + path.relative(path.join(__dirname, '..', '..'), req.file.path).replace(/\\/g, '/');

    const short = await Short.create({
      title:       title.trim(),
      description: description.trim(),
      topic,
      videoUrl,
      videoSize:   req.file.size,
      durationSec: dur,
      format:      ext,
      thumbnailColor: pickThumbColor(),
      uploader:     req.user._id,
      uploaderName: req.user.name,
      uploaderRole: req.user.role === 'admin' || req.user.role === 'instructor' ? 'trainer' : 'student',
      status: 'pending',
    });

    emitGlobal('shorts:pending', { id: short._id });

    success(res, {
      _id: short._id,
      title: short.title,
      status: short.status,
      videoUrl: short.videoUrl,
    }, 'Upload received — pending review', 201);
  } catch (err) { next(err); }
};

// POST /api/shorts/:id/view — increment view count (idempotent enough)
exports.recordView = async (req, res, next) => {
  try {
    const updated = await Short.findOneAndUpdate(
      { _id: req.params.id, status: 'approved' },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!updated) return error(res, 'Short not found', 404);
    success(res, { views: updated.views });
  } catch (err) { next(err); }
};

// POST /api/shorts/:id/like — toggle like for caller
exports.toggleLike = async (req, res, next) => {
  try {
    const short = await Short.findOne({ _id: req.params.id, status: 'approved' });
    if (!short) return error(res, 'Short not found', 404);

    const uid = req.user._id;
    const idx = short.likedBy.findIndex((u) => u.toString() === uid.toString());
    if (idx >= 0) {
      short.likedBy.splice(idx, 1);
      short.likes = Math.max(0, short.likes - 1);
    } else {
      short.likedBy.push(uid);
      short.likes += 1;
    }
    await short.save();
    success(res, { liked: idx < 0, likes: short.likes });
  } catch (err) { next(err); }
};

// POST /api/shorts/:id/share — increment share counter
exports.recordShare = async (req, res, next) => {
  try {
    const updated = await Short.findOneAndUpdate(
      { _id: req.params.id, status: 'approved' },
      { $inc: { shares: 1 } },
      { new: true }
    );
    if (!updated) return error(res, 'Short not found', 404);
    success(res, { shares: updated.shares });
  } catch (err) { next(err); }
};

// POST/DELETE /api/shorts/creators/:creatorId/follow — Follow store not yet
// modelled; respond OK so the optimistic UI toggle persists for the session.
exports.followNoop  = (req, res) => success(res, { following: true  });
exports.unfollowNoop= (req, res) => success(res, { following: false });

// ════════════════════════════════════════════════════════════════════════════
// ADMIN
// ════════════════════════════════════════════════════════════════════════════

// GET /api/shorts/admin?status=pending|approved|rejected (default pending)
exports.adminList = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    if (!Short.STATUSES.includes(status)) return error(res, 'Invalid status', 400);

    const docs = await Short.find({ status })
      .sort({ createdAt: status === 'pending' ? 1 : -1 })   // FIFO for queue, newest-first otherwise
      .populate('uploader', 'name email role')
      .populate('reviewedBy', 'name email');

    const list = docs.map((d) => {
      const o = d.toObject();
      return {
        _id: o._id,
        title: o.title,
        description: o.description,
        topic: o.topic,
        videoUrl: o.videoUrl,
        videoSizeMB: +(o.videoSize / (1024 * 1024)).toFixed(2),
        durationSec: o.durationSec,
        format: o.format,
        thumbnailColor: o.thumbnailColor,
        uploaderName: o.uploader?.name || o.uploaderName,
        uploaderEmail: o.uploader?.email || '',
        uploaderRole: o.uploaderRole,
        status: o.status,
        rejectionReason: o.rejectionReason,
        featured: o.featured,
        views: o.views,
        likes: o.likes,
        shares: o.shares,
        createdAt: o.createdAt,
        approvedAt: o.status === 'approved' ? o.reviewedAt : undefined,
        rejectedAt: o.status === 'rejected' ? o.reviewedAt : undefined,
        reviewedByName: o.reviewedBy?.name,
      };
    });

    success(res, list);
  } catch (err) { next(err); }
};

// GET /api/shorts/admin/stats — counts + total engagement
exports.adminStats = async (req, res, next) => {
  try {
    const [pending, approved, rejected, totals] = await Promise.all([
      Short.countDocuments({ status: 'pending' }),
      Short.countDocuments({ status: 'approved' }),
      Short.countDocuments({ status: 'rejected' }),
      Short.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, views: { $sum: '$views' }, likes: { $sum: '$likes' }, shares: { $sum: '$shares' } } },
      ]),
    ]);

    success(res, {
      pending, approved, rejected,
      totalViews:  totals[0]?.views  || 0,
      totalLikes:  totals[0]?.likes  || 0,
      totalShares: totals[0]?.shares || 0,
    });
  } catch (err) { next(err); }
};

// GET /api/shorts/admin/:id — full record (used by the preview modal)
exports.adminGet = async (req, res, next) => {
  try {
    const short = await Short.findById(req.params.id)
      .populate('uploader', 'name email role')
      .populate('reviewedBy', 'name email');
    if (!short) return error(res, 'Short not found', 404);
    success(res, short);
  } catch (err) { next(err); }
};

// PATCH /api/shorts/admin/:id/approve
exports.adminApprove = async (req, res, next) => {
  try {
    const short = await Short.findById(req.params.id);
    if (!short) return error(res, 'Short not found', 404);
    if (short.status === 'approved') return success(res, short, 'Already approved');

    short.status = 'approved';
    short.rejectionReason = '';
    short.reviewedBy = req.user._id;
    short.reviewedAt = new Date();
    await short.save();

    // Notify the uploader
    createAndPush({
      userId:  short.uploader,
      title:   '🎉 Your short has been approved',
      message: `"${short.title}" is now live in the Shorts feed.`,
      type:    'shorts_approved',
      metadata:{ shortId: short._id },
    }).catch(() => {});

    emitGlobal('shorts:approved', { id: short._id });
    success(res, short, 'Short approved');
  } catch (err) { next(err); }
};

// PATCH /api/shorts/admin/:id/reject  { reason }
exports.adminReject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return error(res, 'A rejection reason is required', 400);

    const short = await Short.findById(req.params.id);
    if (!short) return error(res, 'Short not found', 404);

    short.status = 'rejected';
    short.rejectionReason = reason.trim();
    short.reviewedBy = req.user._id;
    short.reviewedAt = new Date();
    await short.save();

    createAndPush({
      userId:  short.uploader,
      title:   'Your short was not approved',
      message: `"${short.title}" — ${reason.trim()}`,
      type:    'shorts_rejected',
      metadata:{ shortId: short._id, reason: reason.trim() },
    }).catch(() => {});

    emitGlobal('shorts:rejected', { id: short._id });
    success(res, short, 'Short rejected');
  } catch (err) { next(err); }
};

// PATCH /api/shorts/admin/:id/feature — toggle the Trending This Week flag
exports.adminToggleFeature = async (req, res, next) => {
  try {
    const short = await Short.findById(req.params.id);
    if (!short) return error(res, 'Short not found', 404);
    if (short.status !== 'approved') return error(res, 'Only approved shorts can be featured', 400);
    short.featured = !short.featured;
    await short.save();
    emitGlobal('shorts:featured-changed', { id: short._id, featured: short.featured });
    success(res, { featured: short.featured }, short.featured ? 'Marked as Trending' : 'Removed from Trending');
  } catch (err) { next(err); }
};

// DELETE /api/shorts/admin/:id — wipe record + file
exports.adminDelete = async (req, res, next) => {
  try {
    const short = await Short.findByIdAndDelete(req.params.id);
    if (!short) return error(res, 'Short not found', 404);
    removeFile(short.videoUrl);
    emitGlobal('shorts:deleted', { id: short._id });
    success(res, null, 'Short deleted');
  } catch (err) { next(err); }
};
