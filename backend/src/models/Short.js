const mongoose = require('mongoose');

const TOPICS = [
  'Data Structures',
  'Algorithms',
  'DBMS',
  'OS',
  'Networking',
  'OOPs',
  'Other',
];

const shortSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    topic:       { type: String, enum: TOPICS, required: true },

    creatorType: { type: String, enum: ['trainer', 'student'], required: true },
    creator:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Optional uploaded video URL (file upload handled separately or later)
    videoUrl:    { type: String, default: '' },

    // Gradient thumbnail colors (used by both mobile UI and admin previews)
    bgTop:       { type: String, default: '#7C3AED' },
    bgBot:       { type: String, default: '#4C1D95' },

    duration:    { type: Number, default: 30 },

    views:       { type: Number, default: 0, min: 0 },
    likes:       { type: Number, default: 0, min: 0 },

    // Admin approval workflow — trainer uploads auto-approved, student uploads pending
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    publishedAt:     { type: Date },
  },
  { timestamps: true }
);

shortSchema.index({ status: 1, creatorType: 1, topic: 1, views: -1 });

module.exports = mongoose.model('Short', shortSchema);
module.exports.TOPICS = TOPICS;
