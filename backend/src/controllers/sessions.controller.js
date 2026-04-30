const LiveSession = require('../models/LiveSession');
const Reminder = require('../models/Reminder');
const { success, error } = require('../utils/response');
const { getIO } = require('../services/socketHandlers');

const getSession = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) return error(res, 'Session not found', 404);
    success(res, session);
  } catch (err) {
    next(err);
  }
};

const getWeeklySchedule = async (req, res, next) => {
  try {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const sessions = await LiveSession.find({
      scheduledAt: { $gte: now, $lte: weekEnd },
    }).sort({ scheduledAt: 1 });

    success(res, sessions);
  } catch (err) {
    next(err);
  }
};

const setReminder = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.id);
    if (!session) return error(res, 'Session not found', 404);

    const reminderTime = new Date(session.scheduledAt.getTime() - 15 * 60000);

    const reminder = await Reminder.findOneAndUpdate(
      { userId: req.user._id, sessionId: session._id },
      { userId: req.user._id, sessionId: session._id, scheduledFor: reminderTime, sent: false },
      { upsert: true, new: true }
    );

    success(res, reminder, 'Reminder set');
  } catch (err) {
    next(err);
  }
};

const removeReminder = async (req, res, next) => {
  try {
    await Reminder.findOneAndDelete({ userId: req.user._id, sessionId: req.params.id });
    success(res, null, 'Reminder removed');
  } catch (err) {
    next(err);
  }
};

const getUserReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id }).select('sessionId');
    const sessionIds = reminders.map((r) => r.sessionId.toString());
    success(res, sessionIds);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSession, getWeeklySchedule, setReminder, removeReminder, getUserReminders };
