const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
let _io = null;

const setIO = (io) => { _io = io; };
const getIO = () => _io;

const createAndPush = async ({ userId, title, message, type = 'system', broadcastId, metadata = {} }) => {
  const notif = await Notification.create({ userId, title, message, type, broadcastId, metadata });
  if (_io) {
    _io.to(`user:${userId}`).emit('notification:new', {
      _id: notif._id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      isRead: false,
      createdAt: notif.createdAt,
      metadata: notif.metadata,
    });
  }
  return notif;
};

// Persist + push the same notification to every student. Used by admin actions
// that affect everyone (new session, new challenge, etc.).
const broadcastToAllStudents = async ({ title, message, type = 'system', metadata = {} }) => {
  const broadcastId = new mongoose.Types.ObjectId();
  const students = await User.find({ role: 'student' }).select('_id').lean();
  await Promise.all(
    students.map((s) =>
      createAndPush({ userId: s._id, title, message, type, broadcastId, metadata }).catch(() => {})
    )
  );
  return { broadcastId, recipientCount: students.length };
};

// Fire-and-forget global socket event so mobile lists auto-refresh.
const emitGlobal = (event, payload = {}) => {
  try { if (_io) _io.emit(event, payload); } catch {}
};

module.exports = { setIO, getIO, createAndPush, broadcastToAllStudents, emitGlobal };
