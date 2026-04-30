const Poll = require('../models/Poll');
const PollResponse = require('../models/PollResponse');
const { success, error } = require('../utils/response');
const { getIO } = require('../services/socketHandlers');

// ─── helpers ──────────────────────────────────────────────────────────────────

const getResults = async (pollId, options) => {
  const responses = await PollResponse.find({ pollId });
  const counts = options.map((_, i) => responses.filter((r) => r.selectedOption === i).length);
  const total = responses.length;
  return { counts, total };
};

// ─── admin ────────────────────────────────────────────────────────────────────

const listPolls = async (req, res, next) => {
  try {
    const polls = await Poll.find({ sessionId: req.params.sessionId }).sort({ order: 1, createdAt: 1 });
    const withResults = await Promise.all(
      polls.map(async (p) => {
        const { counts, total } = await getResults(p._id, p.options);
        return { ...p.toObject(), counts, total };
      })
    );
    success(res, withResults);
  } catch (err) { next(err); }
};

const createPoll = async (req, res, next) => {
  try {
    const poll = await Poll.create({
      ...req.body,
      sessionId: req.params.sessionId,
      createdBy: req.user._id,
    });
    success(res, poll, 'Poll created', 201);
  } catch (err) { next(err); }
};

const updatePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    if (poll.state !== 'DRAFT') return error(res, 'Only DRAFT polls can be edited', 400);
    Object.assign(poll, req.body);
    await poll.save();
    success(res, poll);
  } catch (err) { next(err); }
};

const deletePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    if (poll.state !== 'DRAFT') return error(res, 'Only DRAFT polls can be deleted', 400);
    await poll.deleteOne();
    success(res, null, 'Poll deleted');
  } catch (err) { next(err); }
};

const releasePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    if (poll.state !== 'DRAFT') return error(res, 'Only DRAFT polls can be released', 400);

    // close any currently active poll for the same session first
    await Poll.updateMany(
      { sessionId: poll.sessionId, state: 'ACTIVE' },
      { state: 'CLOSED', closedAt: new Date() }
    );

    poll.state = 'ACTIVE';
    poll.releasedAt = new Date();
    await poll.save();

    getIO().to(`session:${poll.sessionId}`).emit('poll:released', {
      pollId: poll._id,
      question: poll.question,
      options: poll.options,
      releasedAt: poll.releasedAt,
    });

    success(res, poll, 'Poll released to students');
  } catch (err) { next(err); }
};

const closePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    if (poll.state !== 'ACTIVE') return error(res, 'Only ACTIVE polls can be closed', 400);

    poll.state = 'CLOSED';
    poll.closedAt = new Date();
    await poll.save();

    const { counts, total } = await getResults(poll._id, poll.options);

    getIO().to(`session:${poll.sessionId}`).emit('poll:closed', {
      pollId: poll._id,
      counts,
      total,
      options: poll.options,
      correctOption: poll.correctOption,
    });

    success(res, { ...poll.toObject(), counts, total }, 'Poll closed');
  } catch (err) { next(err); }
};

const getPollResults = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    const { counts, total } = await getResults(poll._id, poll.options);
    success(res, { pollId: poll._id, question: poll.question, options: poll.options, correctOption: poll.correctOption, state: poll.state, counts, total });
  } catch (err) { next(err); }
};

// ─── student-facing ───────────────────────────────────────────────────────────

const getActivePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findOne({ sessionId: req.params.sessionId, state: 'ACTIVE' });
    if (!poll) return success(res, null);

    // tell the student if they already answered
    const existing = await PollResponse.findOne({ pollId: poll._id, studentId: req.user._id });
    success(res, {
      pollId: poll._id,
      question: poll.question,
      options: poll.options,
      releasedAt: poll.releasedAt,
      answered: existing ? existing.selectedOption : null,
    });
  } catch (err) { next(err); }
};

const submitResponse = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return error(res, 'Poll not found', 404);
    if (poll.state !== 'ACTIVE') return error(res, 'Poll is not active', 400);

    const { selectedOption } = req.body;
    if (typeof selectedOption !== 'number' || selectedOption < 0 || selectedOption >= poll.options.length) {
      return error(res, 'Invalid option', 400);
    }

    await PollResponse.findOneAndUpdate(
      { pollId: poll._id, studentId: req.user._id },
      { pollId: poll._id, sessionId: poll.sessionId, studentId: req.user._id, selectedOption },
      { upsert: true, new: true }
    );

    const { counts, total } = await getResults(poll._id, poll.options);

    // push live results to the admin/trainer room
    getIO().to(`trainer:${poll.sessionId}`).emit('poll:results_update', {
      pollId: poll._id,
      counts,
      total,
    });

    success(res, { counts, total }, 'Response recorded');
  } catch (err) { next(err); }
};

module.exports = { listPolls, createPoll, updatePoll, deletePoll, releasePoll, closePoll, getPollResults, getActivePoll, submitResponse };
