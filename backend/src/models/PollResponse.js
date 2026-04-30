const mongoose = require('mongoose');

const pollResponseSchema = new mongoose.Schema(
  {
    pollId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    sessionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
    studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    selectedOption: { type: Number, required: true },
  },
  { timestamps: true }
);

// one response per student per poll
pollResponseSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('PollResponse', pollResponseSchema);
