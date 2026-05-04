const router = require('express').Router();
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const ChallengeScore = require('../models/ChallengeScore');
const { authenticate, requireRole } = require('../middleware/auth');
const { success } = require('../utils/response');
const { createAndPush, emitGlobal, broadcastToAllStudents } = require('../services/notification.service');

// Compute total points for each team across ALL challenges (or active one if specified)
async function buildLeaderboard(challengeId = null) {
  const teams = await Team.find().lean();
  const match = challengeId ? { challenge: challengeId } : {};
  const scores = await ChallengeScore.find(match).lean();

  const pointsByTeam = {};
  scores.forEach((s) => {
    const k = s.team.toString();
    pointsByTeam[k] = (pointsByTeam[k] || 0) + (s.points || 0);
  });

  const ranked = teams
    .map((t) => ({
      _id: t._id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      memberCount: (t.members || []).length,
      points: pointsByTeam[t._id.toString()] || 0,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((t, i) => ({ ...t, rank: i + 1 }));

  return ranked;
}

// ─── Student: GET full leaderboard with active challenge ──────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const challenge = await Challenge.findOne({ isActive: true }).lean();
    const teams = await buildLeaderboard(challenge?._id || null);
    success(res, { challenge, totalTeams: teams.length, teams });
  } catch (err) {
    next(err);
  }
});

// ─── Student: GET all challenges ──────────────────────────────────────────────
router.get('/challenges', authenticate, async (req, res, next) => {
  try {
    const list = await Challenge.find().sort({ startDate: -1 }).lean();
    success(res, list);
  } catch (err) {
    next(err);
  }
});

// ═══ ADMIN: TEAMS ════════════════════════════════════════════════════════════
router.get('/admin/teams', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const teams = await Team.find().populate('members', 'name email').lean();
    success(res, teams);
  } catch (err) { next(err); }
});

router.post('/admin/teams', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, icon, color, members } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Team name is required' });
    const team = await Team.create({ name, icon, color, members: members || [] });
    emitGlobal('leaderboard:updated');
    success(res, team, 'Team created', 201);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A team with that name already exists' });
    next(err);
  }
});

router.put('/admin/teams/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, icon, color, members } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { name, icon, color, ...(members ? { members } : {}) },
      { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    emitGlobal('leaderboard:updated');
    success(res, team, 'Team updated');
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A team with that name already exists' });
    next(err);
  }
});

router.delete('/admin/teams/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    await ChallengeScore.deleteMany({ team: team._id });
    emitGlobal('leaderboard:updated');
    success(res, null, 'Team deleted');
  } catch (err) { next(err); }
});

// ═══ ADMIN: CHALLENGES ═══════════════════════════════════════════════════════
router.get('/admin/challenges', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const list = await Challenge.find().sort({ startDate: -1 }).lean();
    success(res, list);
  } catch (err) { next(err); }
});

router.post('/admin/challenges', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, startDate, endDate, isActive } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'name, startDate, and endDate are required' });
    }
    if (isActive) await Challenge.updateMany({}, { $set: { isActive: false } });
    const ch = await Challenge.create({ name, description, startDate, endDate, isActive: !!isActive });
    emitGlobal('challenges:updated');
    emitGlobal('leaderboard:updated');
    broadcastToAllStudents({
      title: '🎯 New Challenge!',
      message: `"${ch.name}" is now available. Join your team and earn points!`,
      type: 'achievement',
      metadata: { challengeId: ch._id },
    }).catch(() => {});
    success(res, ch, 'Challenge created', 201);
  } catch (err) { next(err); }
});

router.put('/admin/challenges/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, startDate, endDate, isActive } = req.body;
    if (isActive) await Challenge.updateMany({ _id: { $ne: req.params.id } }, { $set: { isActive: false } });
    const ch = await Challenge.findByIdAndUpdate(
      req.params.id,
      { name, description, startDate, endDate, isActive },
      { new: true, runValidators: true }
    );
    if (!ch) return res.status(404).json({ success: false, message: 'Challenge not found' });
    emitGlobal('challenges:updated');
    emitGlobal('leaderboard:updated');
    success(res, ch, 'Challenge updated');
  } catch (err) { next(err); }
});

router.patch('/admin/challenges/:id/activate', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    await Challenge.updateMany({}, { $set: { isActive: false } });
    const ch = await Challenge.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!ch) return res.status(404).json({ success: false, message: 'Challenge not found' });
    emitGlobal('challenges:updated');
    emitGlobal('leaderboard:updated');
    broadcastToAllStudents({
      title: '🚀 Challenge Activated',
      message: `"${ch.name}" is now live. Compete with your team!`,
      type: 'achievement',
      metadata: { challengeId: ch._id },
    }).catch(() => {});
    success(res, ch, 'Challenge activated');
  } catch (err) { next(err); }
});

router.delete('/admin/challenges/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const ch = await Challenge.findByIdAndDelete(req.params.id);
    if (!ch) return res.status(404).json({ success: false, message: 'Challenge not found' });
    await ChallengeScore.deleteMany({ challenge: ch._id });
    emitGlobal('challenges:updated');
    emitGlobal('leaderboard:updated');
    success(res, null, 'Challenge deleted');
  } catch (err) { next(err); }
});

// ═══ ADMIN: SCORES ═══════════════════════════════════════════════════════════
router.get('/admin/scores', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const filter = req.query.challenge ? { challenge: req.query.challenge } : {};
    const list = await ChallengeScore.find(filter)
      .populate('team', 'name icon color')
      .populate('challenge', 'name')
      .lean();
    success(res, list);
  } catch (err) { next(err); }
});

// Upsert: assign / update points for (team, challenge)
router.post('/admin/scores', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { team, challenge, points } = req.body;
    if (!team || !challenge) return res.status(400).json({ success: false, message: 'team and challenge are required' });

    const newPoints = Math.max(0, Number(points) || 0);
    const previous = await ChallengeScore.findOne({ team, challenge });
    const delta = newPoints - (previous?.points || 0);

    const score = await ChallengeScore.findOneAndUpdate(
      { team, challenge },
      { points: newPoints },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Notify team members when points increase
    if (delta > 0) {
      const teamDoc = await Team.findById(team).select('name members').lean();
      const challengeDoc = await Challenge.findById(challenge).select('name').lean();
      if (teamDoc && challengeDoc && (teamDoc.members || []).length) {
        await Promise.all(
          teamDoc.members.map((uid) =>
            createAndPush({
              userId: uid,
              title: '⭐ Points Earned!',
              message: `Your team "${teamDoc.name}" just earned ${delta} points in "${challengeDoc.name}".`,
              type: 'points',
              metadata: { teamId: team, challengeId: challenge, delta, total: newPoints },
            }).catch(() => {})
          )
        );
      }
    }

    emitGlobal('leaderboard:updated');
    success(res, score, 'Score saved');
  } catch (err) { next(err); }
});

router.delete('/admin/scores/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const s = await ChallengeScore.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Score not found' });
    emitGlobal('leaderboard:updated');
    success(res, null, 'Score deleted');
  } catch (err) { next(err); }
});

// ═══ ADMIN: VIEW LEADERBOARD ═════════════════════════════════════════════════
router.get('/admin/leaderboard', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const challenge = req.query.challenge
      ? await Challenge.findById(req.query.challenge).lean()
      : await Challenge.findOne({ isActive: true }).lean();
    const teams = await buildLeaderboard(challenge?._id || null);
    success(res, { challenge, totalTeams: teams.length, teams });
  } catch (err) { next(err); }
});

// ═══ ADMIN: RESET ════════════════════════════════════════════════════════════
router.post('/admin/reset', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const filter = req.body.challenge ? { challenge: req.body.challenge } : {};
    const r = await ChallengeScore.deleteMany(filter);
    emitGlobal('leaderboard:updated');
    success(res, { deleted: r.deletedCount }, 'Leaderboard reset');
  } catch (err) { next(err); }
});

// List all students (for assigning to teams)
router.get('/admin/students', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    const students = await User.find({ role: 'student' }).select('name email').lean();
    success(res, students);
  } catch (err) { next(err); }
});

module.exports = router;
