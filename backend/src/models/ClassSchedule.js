const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
      unique: true, // only one schedule entry per day
    },
    technology: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional comma-separated or newline-separated subtopics shown as bullets
    content: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);
