const Notification = require('../models/Notification');
let _io = null;

const setIO = (io) => { _io = io; };

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

module.exports = { setIO, createAndPush };
