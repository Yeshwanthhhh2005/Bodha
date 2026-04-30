const ChatMessage = require('../models/ChatMessage');
const LiveSession = require('../models/LiveSession');
const aiService = require('../services/ai.service');
const { success, error } = require('../utils/response');
const { getIO } = require('../services/socketHandlers');

const CHAT_RATE_LIMIT = new Map();
const MAX_MESSAGES_PER_MINUTE = 10;

const checkRateLimit = (userId) => {
  const key = userId.toString();
  const now = Date.now();
  const entry = CHAT_RATE_LIMIT.get(key) || { count: 0, resetAt: now + 60000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }

  entry.count++;
  CHAT_RATE_LIMIT.set(key, entry);
  return entry.count <= MAX_MESSAGES_PER_MINUTE;
};

const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    const sessionId = req.params.sessionId;

    if (!content?.trim()) return error(res, 'Message cannot be empty', 400);

    if (!checkRateLimit(req.user._id)) {
      return error(res, 'Too many messages. Please slow down.', 429);
    }

    const session = await LiveSession.findById(sessionId);
    if (!session) return error(res, 'Session not found', 404);

    const isDoubtSession = session.state === 'DOUBT_SESSION';
    const chatType = isDoubtSession ? 'DOUBT_SESSION_CHAT' : 'AI_CHAT';

    const studentMsg = await ChatMessage.create({
      sessionId,
      studentId: req.user._id,
      sender: 'student',
      content,
      chatType,
    });

    const io = getIO();
    io.to(`session:${sessionId}:student:${req.user._id}`).emit('chat:message', studentMsg);

    // AI only responds during AI_CHAT mode — never during DOUBT_SESSION
    if (!isDoubtSession && session.aiEnabled) {
      const aiResponse = await aiService.getResponse(content, session);

      const aiMsg = await ChatMessage.create({
        sessionId,
        studentId: req.user._id,
        sender: 'ai',
        content: aiResponse,
        chatType: 'AI_CHAT',
      });

      io.to(`session:${sessionId}:student:${req.user._id}`).emit('chat:message', aiMsg);
      return success(res, { studentMsg, aiMsg });
    }

    success(res, { studentMsg });
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.find({
      sessionId,
      studentId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    success(res, messages.reverse());
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, getHistory };
