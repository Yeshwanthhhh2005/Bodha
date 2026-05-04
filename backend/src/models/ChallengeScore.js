const mongoose = require('mongoose');

const challengeScoreSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
    points: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

challengeScoreSchema.index({ team: 1, challenge: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeScore', challengeScoreSchema);
