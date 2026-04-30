const TrainerEscalation = require('../models/TrainerEscalation');
const ChatMessage = require('../models/ChatMessage');
const LiveSession = require('../models/LiveSession');
const { success, error } = require('../utils/response');
const { getIO } = require('../services/socketHandlers');

const MAX_PENDING_PER_USER = 3;

const escalateToTrainer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { question, originalMessageId } = req.body;

    if (!question?.trim()) return error(res, 'Question cannot be empty', 400);

    const session = await LiveSession.findById(sessionId);
    if (!session) return error(res, 'Session not found', 404);

    if (session.state === 'UPCOMING') {
      return error(res, 'Trainer chat not available yet', 400);
    }

    const pendingCount = await TrainerEscalation.countDocuments({
      sessionId,
      studentId: req.user._id,
      status: 'pending',
    });

    if (pendingCount >= MAX_PENDING_PER_USER) {
      return error(res, `You have ${pendingCount} pending questions. Wait for replies.`, 429);
    }

    const escalation = await TrainerEscalation.create({
      sessionId,
      studentId: req.user._id,
      question,
      originalMessageId,
      priority: 0,
    });

    const waitingMsg = await ChatMessage.create({
      sessionId,
      studentId: req.user._id,
      sender: 'ai',
      content: 'Your question has been sent to the trainer. Waiting for response...',
      chatType: 'TRAINER_ESCALATION',
      escalationId: escalation._id,
    });

    const io = getIO();
    io.to(`session:${sessionId}:student:${req.user._id}`).emit('chat:message', waitingMsg);
    io.to(`trainer:${sessionId}`).emit('escalation:new', {
      escalation,
      student: { id: req.user._id, name: req.user.name, avatar: req.user.avatar },
    });

    success(res, { escalation, waitingMsg }, 'Question sent to trainer');
  } catch (err) {
    next(err);
  }
};

// Trainer: get escalation queue for a session
const getEscalationQueue = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const escalations = await TrainerEscalation.find({
      sessionId,
      status: 'pending',
      ...(req.query.trainerId && { trainerId: req.query.trainerId }),
    })
      .sort({ priority: -1, createdAt: 1 })
      .populate('studentId', 'name avatar');

    success(res, escalations);
  } catch (err) {
    next(err);
  }
};

// Trainer: respond to escalation
const respondToEscalation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const escalation = await TrainerEscalation.findById(id);
    if (!escalation) return error(res, 'Escalation not found', 404);

    escalation.status = 'answered';
    escalation.trainerResponse = response;
    escalation.trainerId = req.user._id;
    escalation.answeredAt = new Date();
    await escalation.save();

    const trainerMsg = await ChatMessage.create({
      sessionId: escalation.sessionId,
      studentId: escalation.studentId,
      sender: 'trainer',
      content: response,
      chatType: 'TRAINER_ESCALATION',
      escalationId: escalation._id,
      isHighlighted: true,
    });

    const io = getIO();
    io.to(`session:${escalation.sessionId}:student:${escalation.studentId}`).emit('chat:trainer_response', {
      message: trainerMsg,
      escalationId: escalation._id,
    });

    success(res, { escalation, trainerMsg }, 'Response sent');
  } catch (err) {
    next(err);
  }
};

module.exports = { escalateToTrainer, getEscalationQueue, respondToEscalation };
