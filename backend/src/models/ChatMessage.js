const mongoose = require('mongoose');

const CHAT_TYPES = ['AI_CHAT', 'TRAINER_ESCALATION', 'DOUBT_SESSION_CHAT'];
const SENDER_TYPES = ['student', 'ai', 'trainer'];

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: String, enum: SENDER_TYPES, required: true },
    content: { type: String, required: true },
    chatType: { type: String, enum: CHAT_TYPES, required: true },
    escalationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainerEscalation' },
    isHighlighted: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ sessionId: 1, studentId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
