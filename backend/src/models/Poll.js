const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
  {
    sessionId:     { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    question:      { type: String, required: true, trim: true },
    options:       { type: [String], validate: [(v) => v.length >= 2 && v.length <= 4, 'Polls need 2–4 options'] },
    correctOption: { type: Number, default: null },
    state:         { type: String, enum: ['DRAFT', 'ACTIVE', 'CLOSED'], default: 'DRAFT' },
    order:         { type: Number, default: 0 },
    releasedAt:    { type: Date },
    closedAt:      { type: Date },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);
