const mongoose = require('mongoose');

const ESCALATION_STATUS = ['pending', 'answered', 'dismissed'];

const trainerEscalationSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    question: { type: String, required: true },
    originalMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
    status: { type: String, enum: ESCALATION_STATUS, default: 'pending', index: true },
    trainerResponse: { type: String },
    priority: { type: Number, default: 0 },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

trainerEscalationSchema.index({ sessionId: 1, status: 1, priority: -1, createdAt: 1 });

module.exports = mongoose.model('TrainerEscalation', trainerEscalationSchema);
