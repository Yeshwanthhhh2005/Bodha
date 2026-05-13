const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title:       { type: String, required: true },
    message:     { type: String, required: true },
    type:        {
      type: String,
      enum: ['session_reminder', 'admin_broadcast', 'system', 'daily_reminder', 'new_content', 'achievement', 'points', 'assessment', 'shorts_approved', 'shorts_rejected'],
      default: 'system',
    },
    isRead:      { type: Boolean, default: false, index: true },
    broadcastId: { type: mongoose.Schema.Types.ObjectId, index: true }, // groups admin broadcasts
    metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
