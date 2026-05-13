const mongoose = require('mongoose');

const puzzleSchema = new mongoose.Schema({
  title:        { type: String, required: true },          // the question
  hint:         { type: String, default: '' },
  answer:       { type: String, required: true },          // correct answer (case-insensitive match)
  explanation:  { type: String, default: '' },             // shown after solving
  imageUrl:     { type: String, default: '' },
  releaseDate:  { type: Date, required: true, unique: true }, // one per day
  status:       { type: String, enum: ['active', 'inactive'], default: 'active' },
  pointsAwarded:{ type: Number, default: 20 },
  maxAttempts:  { type: Number, default: 3 },
  // aggregated counters (updated on each submission)
  totalAttempts:{ type: Number, default: 0 },
  solvedCount:  { type: Number, default: 0 },
}, { timestamps: true });

// Index for today's puzzle lookup
puzzleSchema.index({ releaseDate: -1, status: 1 });

module.exports = mongoose.model('Puzzle', puzzleSchema);
