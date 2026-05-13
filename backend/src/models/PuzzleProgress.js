const mongoose = require('mongoose');

// One document per student — tracks their cumulative puzzle stats
const puzzleProgressSchema = new mongoose.Schema({
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalSolved:   { type: Number, default: 0 },
  totalPoints:   { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastSolvedDate:{ type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PuzzleProgress', puzzleProgressSchema);
