const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    scheduledFor: { type: Date, required: true },
    channels: { type: [String], enum: ['push', 'email'], default: ['push'] },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
reminderSchema.index({ scheduledFor: 1, sent: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
