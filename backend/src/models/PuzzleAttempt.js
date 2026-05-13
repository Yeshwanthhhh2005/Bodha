const mongoose = require('mongoose');

const puzzleAttemptSchema = new mongoose.Schema({
  puzzle:       { type: mongoose.Schema.Types.ObjectId, ref: 'Puzzle', required: true },
  student:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  answer:       { type: String, required: true },
  isCorrect:    { type: Boolean, required: true },
  attemptNumber:{ type: Number, default: 1 },
  pointsEarned: { type: Number, default: 0 },
}, { timestamps: true });

// One compound index for fast "did this student attempt this puzzle?" lookups
puzzleAttemptSchema.index({ puzzle: 1, student: 1 });
puzzleAttemptSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('PuzzleAttempt', puzzleAttemptSchema);
