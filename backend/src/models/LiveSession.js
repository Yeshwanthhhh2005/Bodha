const mongoose = require('mongoose');

const SESSION_STATES = ['UPCOMING', 'LIVE', 'COMPLETED', 'DOUBT_SESSION'];

const liveSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    instructor: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, required: true },
      avatar: { type: String },
      department: { type: String },
    },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 60 },
    state: { type: String, enum: SESSION_STATES, default: 'UPCOMING' },
    // Never returned in default queries — only via the secure player endpoint
    youtubeUrl: { type: String, select: false },
    recordingUrl: { type: String, select: false },
    watcherCount: { type: Number, default: 0 },
    aiEnabled: { type: Boolean, default: true },
    aiTopicContext: { type: String },
    aiResponseTone: { type: String, default: 'friendly and educational' },
    doubtSessionStartedAt: { type: Date },
    doubtSessionEndsAt: { type: Date },
    isVisible: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

liveSessionSchema.virtual('scheduledEndAt').get(function () {
  return new Date(this.scheduledAt.getTime() + this.durationMinutes * 60000);
});

liveSessionSchema.methods.computedState = function () {
  const now = new Date();
  const end = this.scheduledEndAt;

  if (this.state === 'DOUBT_SESSION') {
    if (this.doubtSessionEndsAt && now > this.doubtSessionEndsAt) return 'COMPLETED';
    return 'DOUBT_SESSION';
  }
  if (this.state === 'LIVE') return 'LIVE';
  if (this.state === 'COMPLETED') return 'COMPLETED';
  if (now < this.scheduledAt) return 'UPCOMING';
  return 'UPCOMING';
};

module.exports = mongoose.model('LiveSession', liveSessionSchema);
