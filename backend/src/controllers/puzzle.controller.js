const Puzzle         = require('../models/Puzzle');
const PuzzleAttempt  = require('../models/PuzzleAttempt');
const PuzzleProgress = require('../models/PuzzleProgress');
const User           = require('../models/User');
const { success, error } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

// Get or create progress doc for a student
async function getProgress(studentId) {
  let p = await PuzzleProgress.findOne({ student: studentId });
  if (!p) p = await PuzzleProgress.create({ student: studentId });
  return p;
}

// ─── Student Controllers ──────────────────────────────────────────────────────

// GET /api/puzzles/today
exports.getToday = async (req, res) => {
  try {
    const puzzle = await Puzzle.findOne({
      releaseDate: { $gte: todayStart(), $lte: todayEnd() },
      status: 'active',
    }).select('-answer -explanation');

    if (!puzzle) return success(res, null, 'No puzzle today');

    // Attach student's attempt info
    const attempt = await PuzzleAttempt.findOne({
      puzzle: puzzle._id, student: req.user._id,
    }).sort({ attemptNumber: -1 });

    return success(res, {
      ...puzzle.toObject(),
      myAttempts:  attempt ? attempt.attemptNumber : 0,
      isSolved:    attempt?.isCorrect ?? false,
      pointsEarned:attempt?.pointsEarned ?? 0,
    });
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/history?page=1
exports.getHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip  = (page - 1) * limit;

    const puzzles = await Puzzle.find({
      releaseDate: { $lt: todayStart() },
      status: 'active',
    })
      .sort({ releaseDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('-answer -explanation');

    // Batch-fetch student's attempts for these puzzles
    const ids = puzzles.map(p => p._id);
    const attempts = await PuzzleAttempt.find({
      puzzle: { $in: ids }, student: req.user._id, isCorrect: true,
    }).select('puzzle pointsEarned');

    const solvedMap = {};
    attempts.forEach(a => { solvedMap[a.puzzle.toString()] = a.pointsEarned; });

    const data = puzzles.map(p => ({
      ...p.toObject(),
      isSolved:    !!solvedMap[p._id.toString()],
      pointsEarned:solvedMap[p._id.toString()] ?? 0,
    }));

    return success(res, data);
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/my-progress
exports.getMyProgress = async (req, res) => {
  try {
    const prog = await getProgress(req.user._id);
    return success(res, prog);
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const top = await PuzzleProgress.find()
      .sort({ totalPoints: -1, totalSolved: -1 })
      .limit(10)
      .populate('student', 'name email');

    const myProgress = await getProgress(req.user._id);
    const myRank = await PuzzleProgress.countDocuments({ totalPoints: { $gt: myProgress.totalPoints } });

    const list = top.map((p, i) => ({
      rank: i + 1,
      name: p.student?.name || 'Student',
      points: p.totalPoints,
      solved: p.totalSolved,
      streak: p.currentStreak,
      isMe: p.student?._id.toString() === req.user._id.toString(),
    }));

    return success(res, { leaderboard: list, myRank: myRank + 1, myProgress });
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/:id
exports.getPuzzle = async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id).select('-answer -explanation');
    if (!puzzle) return error(res, 'Puzzle not found', 404);

    const attempts = await PuzzleAttempt.find({
      puzzle: puzzle._id, student: req.user._id,
    }).sort({ attemptNumber: 1 });

    const isSolved = attempts.some(a => a.isCorrect);
    const totalAttempts = attempts.length;

    // If already solved, reveal explanation
    let explanation = '';
    if (isSolved) explanation = (await Puzzle.findById(req.params.id)).explanation || '';

    return success(res, {
      ...puzzle.toObject(),
      myAttempts: totalAttempts,
      isSolved,
      explanation,
      attemptsRemaining: Math.max(0, puzzle.maxAttempts - totalAttempts),
    });
  } catch (e) {
    return error(res, e.message);
  }
};

// POST /api/puzzles/:id/submit
exports.submitAnswer = async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer?.trim()) return error(res, 'Answer is required', 400);

    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) return error(res, 'Puzzle not found', 404);
    if (puzzle.status !== 'active') return error(res, 'Puzzle is not active', 400);

    // Check existing attempts
    const prevAttempts = await PuzzleAttempt.find({
      puzzle: puzzle._id, student: req.user._id,
    }).sort({ attemptNumber: 1 });

    if (prevAttempts.some(a => a.isCorrect))
      return error(res, 'Already solved!', 400);

    if (prevAttempts.length >= puzzle.maxAttempts)
      return error(res, 'No attempts remaining', 400);

    const attemptNumber = prevAttempts.length + 1;
    const isCorrect = answer.trim().toLowerCase() === puzzle.answer.trim().toLowerCase();
    const pointsEarned = isCorrect ? puzzle.pointsAwarded : 0;

    await PuzzleAttempt.create({
      puzzle: puzzle._id,
      student: req.user._id,
      answer: answer.trim(),
      isCorrect,
      attemptNumber,
      pointsEarned,
    });

    // Update puzzle counters
    await Puzzle.findByIdAndUpdate(puzzle._id, {
      $inc: { totalAttempts: 1, ...(isCorrect ? { solvedCount: 1 } : {}) },
    });

    // Update student progress
    if (isCorrect) {
      const prog = await getProgress(req.user._id);
      const lastDate = prog.lastSolvedDate ? new Date(prog.lastSolvedDate) : null;
      const todayD = new Date(); todayD.setHours(0, 0, 0, 0);

      let newStreak = prog.currentStreak;
      if (!lastDate || sameDay(lastDate, yesterday())) {
        newStreak = prog.currentStreak + 1;
      } else if (!sameDay(lastDate, todayD)) {
        newStreak = 1; // streak broken
      }

      const longestStreak = Math.max(newStreak, prog.longestStreak);

      await PuzzleProgress.findOneAndUpdate(
        { student: req.user._id },
        {
          $inc: { totalSolved: 1, totalPoints: pointsEarned },
          $set: { currentStreak: newStreak, longestStreak, lastSolvedDate: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    return success(res, {
      isCorrect,
      pointsEarned,
      attemptsUsed: attemptNumber,
      attemptsRemaining: Math.max(0, puzzle.maxAttempts - attemptNumber),
      correctAnswer: isCorrect || attemptNumber >= puzzle.maxAttempts ? puzzle.answer : null,
      explanation: isCorrect ? puzzle.explanation : '',
    });
  } catch (e) {
    return error(res, e.message);
  }
};

// ─── Admin Controllers ────────────────────────────────────────────────────────

// GET /api/puzzles/admin/list
exports.adminList = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const puzzles = await Puzzle.find()
      .sort({ releaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Puzzle.countDocuments();
    return success(res, { puzzles, total, page });
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/admin/stats
exports.adminStats = async (req, res) => {
  try {
    const total        = await Puzzle.countDocuments();
    const active       = await Puzzle.countDocuments({ status: 'active' });
    const totalAttempts= await PuzzleAttempt.countDocuments();
    const correctCount = await PuzzleAttempt.countDocuments({ isCorrect: true });
    const participants = await PuzzleAttempt.distinct('student');
    return success(res, {
      total, active,
      totalAttempts,
      correctCount,
      wrongCount: totalAttempts - correctCount,
      participants: participants.length,
      successRate: totalAttempts ? Math.round((correctCount / totalAttempts) * 100) : 0,
    });
  } catch (e) {
    return error(res, e.message);
  }
};

// POST /api/puzzles/admin/create
exports.adminCreate = async (req, res) => {
  try {
    const { title, hint, answer, explanation, releaseDate, status, pointsAwarded, maxAttempts } = req.body;
    if (!title || !answer || !releaseDate) return error(res, 'title, answer and releaseDate are required', 400);
    const puzzle = await Puzzle.create({ title, hint, answer, explanation, releaseDate: new Date(releaseDate), status, pointsAwarded, maxAttempts });
    return success(res, puzzle, 'Puzzle created', 201);
  } catch (e) {
    if (e.code === 11000) return error(res, 'A puzzle already exists for that date', 400);
    return error(res, e.message);
  }
};

// PATCH /api/puzzles/admin/:id
exports.adminUpdate = async (req, res) => {
  try {
    const puzzle = await Puzzle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!puzzle) return error(res, 'Not found', 404);
    return success(res, puzzle);
  } catch (e) {
    return error(res, e.message);
  }
};

// DELETE /api/puzzles/admin/:id
exports.adminDelete = async (req, res) => {
  try {
    await Puzzle.findByIdAndDelete(req.params.id);
    await PuzzleAttempt.deleteMany({ puzzle: req.params.id });
    return success(res, null, 'Deleted');
  } catch (e) {
    return error(res, e.message);
  }
};

// PATCH /api/puzzles/admin/:id/toggle-status
exports.adminToggleStatus = async (req, res) => {
  try {
    const puzzle = await Puzzle.findById(req.params.id);
    if (!puzzle) return error(res, 'Not found', 404);
    puzzle.status = puzzle.status === 'active' ? 'inactive' : 'active';
    await puzzle.save();
    return success(res, puzzle);
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/puzzles/admin/:id/attempts
exports.adminAttempts = async (req, res) => {
  try {
    const attempts = await PuzzleAttempt.find({ puzzle: req.params.id })
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    return success(res, attempts);
  } catch (e) {
    return error(res, e.message);
  }
};
