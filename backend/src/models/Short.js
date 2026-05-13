const mongoose = require('mongoose');

/**
 * NPT-020 — 30-Second Shorts
 *
 * Uploaded videos start as `pending`. The admin moderates them:
 *   pending  → approve  →  approved   (visible in feed)
 *   pending  → reject   →  rejected   (hidden, kept for audit)
 *   *        → delete                 (removed entirely)
 *
 * Engagement counters (views/likes/shares) are denormalised on the document so
 * the feed query stays a single index scan. `likedBy` tracks who liked it to
 * keep the like-toggle idempotent per user.
 */
const TOPICS = [
  'Data Structures', 'Algorithms', 'DBMS', 'OS', 'Computer Networks',
  'SQL', 'Web Development', 'System Design', 'Other',
];

const STATUSES = ['pending', 'approved', 'rejected'];

const shortSchema = new mongoose.Schema(
  {
    // ── Content ─────────────────────────────────────────────────────────────
    title:       { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 250, default: '' },
    topic:       { type: String, required: true, enum: TOPICS, index: true },

    // ── File metadata (file itself lives at `videoUrl`) ─────────────────────
    videoUrl:       { type: String, required: true },   // e.g. /uploads/shorts/abc.mp4
    videoSize:      { type: Number, default: 0 },       // bytes
    durationSec:    { type: Number, required: true, min: 1, max: 31 },
    format:         { type: String, enum: ['mp4', 'mov'], required: true },
    thumbnailColor: { type: String, default: '#4C1D95' }, // hex for placeholder card

    // ── Uploader (denormalised name/role for fast feed reads) ───────────────
    uploader:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    uploaderName: { type: String, required: true },
    uploaderRole: { type: String, enum: ['trainer', 'student'], required: true, index: true },

    // ── Moderation ──────────────────────────────────────────────────────────
    status:          { type: String, enum: STATUSES, default: 'pending', index: true },
    rejectionReason: { type: String, trim: true, default: '' },
    reviewedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:      { type: Date },

    // ── Engagement ──────────────────────────────────────────────────────────
    views:   { type: Number, default: 0 },
    likes:   { type: Number, default: 0 },
    shares:  { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Admin-controlled flag for the Trending This Week rail ──────────────
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Feed scan: status + role + topic, newest first
shortSchema.index({ status: 1, uploaderRole: 1, createdAt: -1 });
// Trending lookup: approved + featured | views, newest first
shortSchema.index({ status: 1, featured: -1, views: -1, createdAt: -1 });

shortSchema.statics.TOPICS   = TOPICS;
shortSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Short', shortSchema);
