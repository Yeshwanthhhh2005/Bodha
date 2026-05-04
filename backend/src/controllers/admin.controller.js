const LiveSession = require('../models/LiveSession');
const ChatMessage = require('../models/ChatMessage');
const TrainerEscalation = require('../models/TrainerEscalation');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const { getIO } = require('../services/socketHandlers');
const { broadcastToAllStudents } = require('../services/notification.service');

const listSessions = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.state) filter.state = req.query.state;

    const sessions = await LiveSession.find(filter).sort({ scheduledAt: -1 });
    success(res, sessions);
  } catch (err) {
    next(err);
  }
};

const broadcastSessionsUpdated = () => {
  try { getIO().emit('sessions:updated'); } catch {}
};

const createSession = async (req, res, next) => {
  try {
    const session = await LiveSession.create({ ...req.body, createdBy: req.user._id });
    broadcastSessionsUpdated();
    const dateStr = new Date(session.scheduledAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    broadcastToAllStudents({
      title: '📅 New Session Scheduled',
      message: `"${session.title}" — ${dateStr}`,
      type: 'new_content',
      metadata: { sessionId: session._id, scheduledAt: session.scheduledAt },
    }).catch(() => {});
    success(res, session, 'Session created', 201);
  } catch (err) {
    next(err);
  }
};

const updateSession = async (req, res, next) => {
  try {
    const before = await LiveSession.findById(req.params.id).select('scheduledAt title');
    const session = await LiveSession.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .select('+youtubeUrl +recordingUrl');
    if (!session) return error(res, 'Session not found', 404);
    broadcastSessionsUpdated();
    // Only notify when something user-visible (time / title) changes
    const timeChanged = before && new Date(before.scheduledAt).getTime() !== new Date(session.scheduledAt).getTime();
    const titleChanged = before && before.title !== session.title;
    if (timeChanged || titleChanged) {
      const dateStr = new Date(session.scheduledAt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      broadcastToAllStudents({
        title: '🔄 Session Updated',
        message: `"${session.title}" — ${dateStr}`,
        type: 'new_content',
        metadata: { sessionId: session._id, scheduledAt: session.scheduledAt },
      }).catch(() => {});
    }
    success(res, session, 'Session updated');
  } catch (err) {
    next(err);
  }
};

const deleteSession = async (req, res, next) => {
  try {
    const session = await LiveSession.findByIdAndDelete(req.params.id).select('title');
    broadcastSessionsUpdated();
    if (session) {
      broadcastToAllStudents({
        title: '❌ Session Cancelled',
        message: `"${session.title}" has been cancelled.`,
        type: 'system',
        metadata: { sessionId: session._id },
      }).catch(() => {});
    }
    success(res, null, 'Session deleted');
  } catch (err) {
    next(err);
  }
};

const updateSessionState = async (req, res, next) => {
  try {
    const { state } = req.body;
    const session = await LiveSession.findById(req.params.id);
    if (!session) return error(res, 'Session not found', 404);

    const validTransitions = {
      UPCOMING: ['LIVE'],
      LIVE: ['COMPLETED', 'DOUBT_SESSION'],
      DOUBT_SESSION: ['COMPLETED'],
      COMPLETED: [],
    };

    if (!validTransitions[session.state]?.includes(state)) {
      return error(res, `Cannot transition from ${session.state} to ${state}`, 400);
    }

    session.state = state;

    if (state === 'DOUBT_SESSION') {
      session.doubtSessionStartedAt = new Date();
      session.doubtSessionEndsAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    await session.save();

    const io = getIO();
    io.to(`session:${session._id}`).emit('session:state_change', { state, session });
    io.emit('sessions:updated');

    if (state === 'LIVE') {
      broadcastToAllStudents({
        title: '🔴 Session is LIVE',
        message: `"${session.title}" has started — join now!`,
        type: 'session_reminder',
        metadata: { sessionId: session._id },
      }).catch(() => {});
    } else if (state === 'DOUBT_SESSION') {
      broadcastToAllStudents({
        title: '🎓 Doubt Session Open',
        message: `Ask your trainer questions in "${session.title}".`,
        type: 'session_reminder',
        metadata: { sessionId: session._id },
      }).catch(() => {});
    }

    success(res, session, `Session state updated to ${state}`);
  } catch (err) {
    next(err);
  }
};

const updateWatcherCount = async (req, res, next) => {
  try {
    const { count } = req.body;
    const session = await LiveSession.findByIdAndUpdate(req.params.id, { watcherCount: count }, { new: true });
    if (!session) return error(res, 'Session not found', 404);
    const io = getIO();
    io.to(`session:${session._id}`).emit('session:watcher_count', { count });
    success(res, { count });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [aiMsgCount, totalEscalations, respondedEscalations, doubtMsgCount, reminderCount, totalMessages, session] = await Promise.all([
      ChatMessage.countDocuments({ sessionId, chatType: 'AI_CHAT', sender: 'student' }),
      TrainerEscalation.countDocuments({ sessionId }),
      TrainerEscalation.countDocuments({ sessionId, status: 'answered' }),
      ChatMessage.countDocuments({ sessionId, chatType: 'DOUBT_SESSION_CHAT' }),
      Reminder.countDocuments({ sessionId }),
      ChatMessage.countDocuments({ sessionId }),
      LiveSession.findById(sessionId),
    ]);

    success(res, {
      sessionId,
      totalJoins: session?.watcherCount || 0,
      peakWatchers: session?.watcherCount || 0,
      totalMessages,
      aiUsage: aiMsgCount,
      totalEscalations,
      respondedEscalations,
      responseRate: totalEscalations > 0 ? Math.round((respondedEscalations / totalEscalations) * 100) : 0,
      doubtSessionEngagement: doubtMsgCount,
      remindersSet: reminderCount,
    });
  } catch (err) {
    next(err);
  }
};

const notifySession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, type = 'info' } = req.body;
    if (!message?.trim()) return error(res, 'Message required', 400);

    const session = await LiveSession.findById(id);
    if (!session) return error(res, 'Session not found', 404);

    const io = getIO();
    io.to(`session:${id}`).emit('admin:notification', { message, type, sessionId: id, sentAt: new Date() });

    success(res, null, 'Notification sent');
  } catch (err) {
    next(err);
  }
};

const getSessionAdmin = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.id).select('+youtubeUrl +recordingUrl');
    if (!session) return error(res, 'Session not found', 404);
    success(res, session);
  } catch (err) {
    next(err);
  }
};

const getEscalationsAdmin = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const filter = { sessionId };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const escalations = await TrainerEscalation.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'name avatar');

    success(res, escalations);
  } catch (err) {
    next(err);
  }
};

// ── User management ──────────────────────────────────────────────────────────

const listUsers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    success(res, users);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return error(res, 'name, email and password required', 400);
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return error(res, 'Email already registered', 409);

    const user = await User.create({ name, email, passwordHash: password, role: role || 'student' });
    success(res, user.toSafeObject(), 'User created', 201);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return error(res, 'User not found', 404);
    if (user._id.toString() === req.user._id.toString()) {
      return error(res, 'Cannot delete your own account', 400);
    }
    await User.findByIdAndDelete(req.params.id);
    success(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'instructor', 'admin'].includes(role)) {
      return error(res, 'Invalid role', 400);
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-passwordHash');
    if (!user) return error(res, 'User not found', 404);
    success(res, user, 'Role updated');
  } catch (err) {
    next(err);
  }
};

module.exports = { listSessions, createSession, updateSession, deleteSession, updateSessionState, updateWatcherCount, getAnalytics, notifySession, getSessionAdmin, getEscalationsAdmin, listUsers, createUser, deleteUser, updateUserRole };
