const AIConversation = require('../models/AIConversation');
const { getReply } = require('../services/aiAssistant.service');
const { success, error } = require('../utils/response');

const MAX_STORED = 50;     // keep last 50 in DB so history isn't unbounded
const RATE_PER_MIN = 15;
const RATE_BUCKET = new Map();

const allowRate = (userId) => {
  const key = userId.toString();
  const now = Date.now();
  const e = RATE_BUCKET.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + 60_000; }
  e.count++;
  RATE_BUCKET.set(key, e);
  return e.count <= RATE_PER_MIN;
};

// POST /api/ai/messages   { content }
exports.sendMessage = async (req, res) => {
  try {
    const content = (req.body?.content || '').toString().trim();
    if (!content) return error(res, 'Message cannot be empty', 400);
    if (content.length > 4000) return error(res, 'Message too long', 400);
    if (!allowRate(req.user._id)) return error(res, 'Too many messages. Please slow down.', 429);

    let convo = await AIConversation.findOne({ student: req.user._id });
    if (!convo) convo = await AIConversation.create({ student: req.user._id, messages: [] });

    convo.messages.push({ role: 'user', content });

    let replyText;
    try {
      replyText = await getReply(convo.messages);
    } catch (e) {
      replyText = "I hit a hiccup answering that. Try again in a moment, or rephrase your question.";
    }

    convo.messages.push({ role: 'assistant', content: replyText });

    // Trim stored history
    if (convo.messages.length > MAX_STORED) {
      convo.messages = convo.messages.slice(-MAX_STORED);
    }
    convo.lastActiveAt = new Date();
    await convo.save();

    return success(res, {
      reply: replyText,
      messages: convo.messages.slice(-2), // last user + assistant
    });
  } catch (e) {
    return error(res, e.message);
  }
};

// GET /api/ai/history
exports.getHistory = async (req, res) => {
  try {
    const convo = await AIConversation.findOne({ student: req.user._id });
    return success(res, { messages: convo?.messages ?? [] });
  } catch (e) {
    return error(res, e.message);
  }
};

// DELETE /api/ai/history
exports.clearHistory = async (req, res) => {
  try {
    await AIConversation.updateOne(
      { student: req.user._id },
      { $set: { messages: [], lastActiveAt: new Date() } },
      { upsert: true }
    );
    return success(res, { messages: [] }, 'Conversation cleared');
  } catch (e) {
    return error(res, e.message);
  }
};
