const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { createAndPush } = require('../services/notification.service');
const { success, error } = require('../utils/response');

// ── Student endpoints ────────────────────────────────────────────────────────

const getMyNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 30;
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    success(res, notifications);
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    success(res, { count });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Notification.updateOne({ _id: id, userId: req.user._id }, { isRead: true });
    success(res, null, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

// ── Admin endpoints ──────────────────────────────────────────────────────────

const sendAdminNotification = async (req, res, next) => {
  try {
    const { title, message, targetUserIds } = req.body;
    if (!title?.trim() || !message?.trim()) return error(res, 'Title and message required', 400);

    const broadcastId = new mongoose.Types.ObjectId();

    let userIds = targetUserIds;
    if (!userIds || userIds.length === 0) {
      const students = await User.find({ role: 'student' }).select('_id').lean();
      userIds = students.map((s) => s._id);
    }

    await Promise.all(
      userIds.map((uid) =>
        createAndPush({ userId: uid, title, message, type: 'admin_broadcast', broadcastId })
      )
    );

    success(res, { broadcastId, recipientCount: userIds.length }, 'Notification sent', 201);
  } catch (err) {
    next(err);
  }
};

const listBroadcasts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;

    const broadcasts = await Notification.aggregate([
      { $match: { type: 'admin_broadcast', broadcastId: { $exists: true, $ne: null } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$broadcastId',
          title: { $first: '$title' },
          message: { $first: '$message' },
          createdAt: { $first: '$createdAt' },
          recipientCount: { $sum: 1 },
          readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    success(res, broadcasts);
  } catch (err) {
    next(err);
  }
};

const deleteBroadcast = async (req, res, next) => {
  try {
    const { broadcastId } = req.params;
    await Notification.deleteMany({ broadcastId: new mongoose.Types.ObjectId(broadcastId) });
    success(res, null, 'Broadcast deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendAdminNotification,
  listBroadcasts,
  deleteBroadcast,
};
