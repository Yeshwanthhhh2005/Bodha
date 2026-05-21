const router = require('express').Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Short = require('../models/Short');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const { success, error } = require('../utils/response');
const {
  emitGlobal,
  broadcastToAllStudents,
  createAndPush,
} = require('../services/notification.service');

const CREATOR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFB347', '#A78BFA', '#F472B6'];

// ─── Multer storage for uploaded videos ──────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'shorts');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME = new Set([
  'video/mp4', 'video/quicktime', 'video/x-quicktime', 'video/mov',
  'video/x-matroska', 'video/webm', 'video/3gpp',
  // Some platforms send octet-stream for valid videos — accept by extension below
  'application/octet-stream',
]);
const ALLOWED_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm', '.mkv', '.3gp']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.mp4').toLowerCase();
    const safeExt = ALLOWED_EXT.has(ext) ? ext : '.mp4';
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    cb(null, `${stamp}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error('Unsupported video format. Use MP4, MOV, WEBM, or MKV.'));
  },
}).single('video');

// Wraps multer so size/format errors return JSON instead of crashing the route.
function uploadVideo(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, 'Video too large. Max 50MB.', 400);
    }
    return error(res, err.message || 'Video upload failed', 400);
  });
}

function buildVideoUrl(req, filename) {
  const proto = req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/uploads/shorts/${filename}`;
}

// ─── Public: GET trending (approved, sorted by views) ────────────────────────
router.get('/trending', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
    const list = await Short.find({ status: 'approved' })
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .populate('creator', 'name role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// ─── Public: GET trainer shorts (filtered by topic) ──────────────────────────
router.get('/trainer', authenticate, async (req, res, next) => {
  try {
    const { topic = 'All' } = req.query;
    const filter = { status: 'approved', creatorType: 'trainer' };
    if (topic && topic !== 'All') filter.topic = topic;
    const list = await Short.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate('creator', 'name role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// ─── Public: GET student shorts (filtered by topic) ──────────────────────────
router.get('/student', authenticate, async (req, res, next) => {
  try {
    const { topic = 'All' } = req.query;
    const filter = { status: 'approved', creatorType: 'student' };
    if (topic && topic !== 'All') filter.topic = topic;
    const list = await Short.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .populate('creator', 'name role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// ─── Public: GET vertical feed (all approved, newest-first or by popularity) ─
router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const sort = req.query.sort === 'popular'
      ? { likes: -1, views: -1, createdAt: -1 }
      : { publishedAt: -1, createdAt: -1 };
    const list = await Short.find({ status: 'approved' })
      .sort(sort)
      .populate('creator', 'name role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// ─── Public: GET top student creators ────────────────────────────────────────
router.get('/creators/top', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 30);
    const rows = await Short.aggregate([
      { $match: { status: 'approved', creatorType: 'student' } },
      { $group: {
          _id: '$creator',
          totalViews: { $sum: '$views' },
          followers:  { $sum: '$likes' },
          shorts:     { $sum: 1 },
        },
      },
      { $sort: { totalViews: -1, followers: -1 } },
      { $limit: limit },
      { $lookup: {
          from: 'users', localField: '_id', foreignField: '_id', as: 'user',
        },
      },
      { $unwind: '$user' },
      { $project: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email',
          totalViews: 1,
          followers: 1,
          shorts: 1,
        },
      },
    ]);
    const out = rows.map((r, i) => ({
      ...r,
      color: CREATOR_COLORS[i % CREATOR_COLORS.length],
    }));
    success(res, out);
  } catch (err) { next(err); }
});

// ─── Student: GET my uploads (any status) ────────────────────────────────────
router.get('/my-uploads', authenticate, async (req, res, next) => {
  try {
    const list = await Short.find({ creator: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// ─── Student: POST upload short (multipart with video file) ──────────────────
// Accepts both multipart (video file) and JSON-only (legacy / for future cloud-URL flow).
router.post('/upload', authenticate, uploadVideo, async (req, res, next) => {
  try {
    const { title, description = '', topic, videoUrl: bodyUrl = '', bgTop, bgBot } = req.body;
    const duration = parseFloat(req.body.duration);

    if (!title || !topic) return error(res, 'title and topic are required', 400);

    // Server-side duration validation (client validates, server enforces)
    if (Number.isFinite(duration) && duration > 31) {
      // Cleanup file if uploaded
      if (req.file) fs.unlink(req.file.path, () => {});
      return error(res, 'Video exceeds 30 seconds. Please trim and try again.', 400);
    }

    const videoUrl = req.file ? buildVideoUrl(req, req.file.filename) : bodyUrl;

    const creatorType = req.user.role === 'admin' || req.user.role === 'instructor' ? 'trainer' : 'student';
    const status = creatorType === 'trainer' ? 'approved' : 'pending';

    const short = await Short.create({
      title: String(title).trim(),
      description: String(description).trim(),
      topic,
      videoUrl,
      duration: Number.isFinite(duration) ? Math.min(duration, 30) : 30,
      bgTop: bgTop || '#7C3AED',
      bgBot: bgBot || '#4C1D95',
      creator: req.user._id,
      creatorType,
      status,
      publishedAt: status === 'approved' ? new Date() : undefined,
    });

    emitGlobal('shorts:updated');
    if (status === 'approved') {
      broadcastToAllStudents({
        title: '🎬 New 30-sec Short',
        message: `${short.title} — ${short.topic}`,
        type: 'new_content',
        metadata: { shortId: short._id, topic: short.topic },
      }).catch(() => {});
    }

    success(res, short, status === 'pending'
      ? 'Your short has been submitted and is pending admin approval'
      : 'Short published',
      201);
  } catch (err) {
    // Cleanup file on any DB error
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// ─── Student: POST like a short ──────────────────────────────────────────────
router.post('/:id/like', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const updated = await Short.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });
    if (!updated) return error(res, 'Short not found', 404);
    success(res, { likes: updated.likes });
  } catch (err) { next(err); }
});

// ─── Student: POST view (increment views) ────────────────────────────────────
router.post('/:id/view', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const updated = await Short.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    if (!updated) return error(res, 'Short not found', 404);
    success(res, { views: updated.views });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// GET all shorts (any status / type)
router.get('/admin', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type   && type   !== 'all') filter.creatorType = type;
    const list = await Short.find(filter)
      .sort({ createdAt: -1 })
      .populate('creator', 'name email role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// GET only pending submissions (admin approval queue)
router.get('/admin/pending', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const list = await Short.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('creator', 'name email role')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// POST create admin/trainer short — supports multipart video file
router.post('/admin', authenticate, requireRole('admin'), uploadVideo, async (req, res, next) => {
  try {
    const { title, description = '', topic, videoUrl: bodyUrl = '', bgTop, bgBot, creator } = req.body;
    if (!title || !topic) return error(res, 'title and topic are required', 400);

    const videoUrl = req.file ? buildVideoUrl(req, req.file.filename) : bodyUrl;
    const creatorId = creator || req.user._id;

    const short = await Short.create({
      title: String(title).trim(),
      description: String(description).trim(),
      topic,
      videoUrl,
      bgTop: bgTop || '#7C3AED',
      bgBot: bgBot || '#4C1D95',
      creator: creatorId,
      creatorType: 'trainer',
      status: 'approved',
      publishedAt: new Date(),
    });
    emitGlobal('shorts:updated');
    broadcastToAllStudents({
      title: '🎬 New 30-sec Short',
      message: `${short.title} — ${short.topic}`,
      type: 'new_content',
      metadata: { shortId: short._id, topic: short.topic },
    }).catch(() => {});
    success(res, short, 'Trainer short created', 201);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// PUT update any short
router.put('/admin/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const { title, description, topic, videoUrl, bgTop, bgBot } = req.body;
    const update = {};
    if (title       !== undefined) update.title       = String(title).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (topic       !== undefined) update.topic       = topic;
    if (videoUrl    !== undefined) update.videoUrl    = videoUrl;
    if (bgTop       !== undefined) update.bgTop       = bgTop;
    if (bgBot       !== undefined) update.bgBot       = bgBot;
    const short = await Short.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!short) return error(res, 'Short not found', 404);
    emitGlobal('shorts:updated');
    success(res, short, 'Short updated');
  } catch (err) { next(err); }
});

// PATCH approve a pending student short
router.patch('/admin/:id/approve', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const short = await Short.findByIdAndUpdate(
      id,
      { status: 'approved', publishedAt: new Date(), rejectionReason: '' },
      { new: true }
    ).populate('creator', 'name email');
    if (!short) return error(res, 'Short not found', 404);

    // Notify the student
    if (short.creator?._id) {
      createAndPush({
        userId: short.creator._id,
        title: '🎉 Your short has been approved!',
        message: `"${short.title}" is now live on the Shorts feed.`,
        type: 'short_approved',
        metadata: { shortId: short._id },
      }).catch(() => {});
    }

    emitGlobal('shorts:updated');
    success(res, short, 'Short approved');
  } catch (err) { next(err); }
});

// PATCH reject a pending student short
router.patch('/admin/:id/reject', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const { reason = '' } = req.body;
    const trimmedReason = String(reason).trim();
    const short = await Short.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: trimmedReason },
      { new: true }
    ).populate('creator', 'name email');
    if (!short) return error(res, 'Short not found', 404);

    if (short.creator?._id) {
      createAndPush({
        userId: short.creator._id,
        title: 'Your short was not approved',
        message: trimmedReason
          ? `"${short.title}" — Reason: ${trimmedReason}`
          : `"${short.title}" was not approved.`,
        type: 'short_rejected',
        metadata: { shortId: short._id, reason: trimmedReason },
      }).catch(() => {});
    }

    emitGlobal('shorts:updated');
    success(res, short, 'Short rejected');
  } catch (err) { next(err); }
});

// DELETE remove a short (cleans up file too)
router.delete('/admin/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return error(res, 'Invalid id', 400);
    const short = await Short.findByIdAndDelete(id);
    if (!short) return error(res, 'Short not found', 404);

    // Best-effort cleanup of uploaded file
    if (short.videoUrl && short.videoUrl.includes('/uploads/shorts/')) {
      const filename = short.videoUrl.split('/uploads/shorts/').pop();
      if (filename) {
        fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
      }
    }

    emitGlobal('shorts:updated');
    success(res, null, 'Short deleted');
  } catch (err) { next(err); }
});

module.exports = router;
