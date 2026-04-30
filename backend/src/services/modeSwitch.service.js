const cron = require('node-cron');
const LiveSession = require('../models/LiveSession');
const User = require('../models/User');

let io = null;

const setIO = (socketIO) => { io = socketIO; };

const startCronJobs = () => {
  // Auto-transition LIVE sessions to DOUBT_SESSION when duration ends
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const liveSessions = await LiveSession.find({ state: 'LIVE' });
      for (const session of liveSessions) {
        const endTime = new Date(session.scheduledAt.getTime() + session.durationMinutes * 60000);
        if (now >= endTime) {
          session.state = 'DOUBT_SESSION';
          session.doubtSessionStartedAt = now;
          session.doubtSessionEndsAt = new Date(now.getTime() + 60 * 60 * 1000);
          await session.save();
          if (io) io.to(`session:${session._id}`).emit('session:state_change', { state: 'DOUBT_SESSION', session });
          console.log(`Session ${session._id} → DOUBT_SESSION`);
        }
      }

      const doubtSessions = await LiveSession.find({
        state: 'DOUBT_SESSION',
        doubtSessionEndsAt: { $lte: now },
      });
      for (const session of doubtSessions) {
        session.state = 'COMPLETED';
        await session.save();
        if (io) io.to(`session:${session._id}`).emit('session:state_change', { state: 'COMPLETED', session });
        console.log(`Session ${session._id} → COMPLETED`);
      }
    } catch (err) {
      console.error('Mode switch cron error:', err.message);
    }
  });

  // Reminders: fire 15 min before session + create notification record
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const Reminder = require('../models/Reminder');
      const { createAndPush } = require('./notification.service');

      const due = await Reminder.find({ sent: false, scheduledFor: { $lte: now } })
        .populate('sessionId', 'title scheduledAt')
        .populate('userId', 'fcmToken email');

      for (const reminder of due) {
        const sessionTitle = reminder.sessionId?.title ?? 'your session';
        console.log(`REMINDER → user ${reminder.userId._id}: session "${sessionTitle}" starting soon`);

        reminder.sent = true;
        reminder.sentAt = now;
        await reminder.save();

        if (io) {
          io.to(`user:${reminder.userId._id}`).emit('reminder:session', {
            sessionId: reminder.sessionId._id,
            title: sessionTitle,
            message: `"${sessionTitle}" starts in 15 minutes!`,
          });
        }

        await createAndPush({
          userId: reminder.userId._id,
          title: 'Session Starting Soon',
          message: `"${sessionTitle}" starts in 15 minutes!`,
          type: 'session_reminder',
          metadata: { sessionId: reminder.sessionId._id },
        });
      }
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });

  // Daily reminder at 8:00 AM — sent to all students
  cron.schedule('0 8 * * *', async () => {
    try {
      const { createAndPush } = require('./notification.service');
      const students = await User.find({ role: 'student' }).select('_id').lean();
      const upcoming = await LiveSession.find({ state: 'UPCOMING' })
        .sort({ scheduledAt: 1 })
        .limit(3)
        .select('title scheduledAt')
        .lean();

      const sessionLine = upcoming.length
        ? `Upcoming today: ${upcoming.map((s) => s.title).join(', ')}.`
        : 'Check your schedule for today.';

      await Promise.all(
        students.map((s) =>
          createAndPush({
            userId: s._id,
            title: 'Good Morning! 🌅',
            message: `Ready to learn today? ${sessionLine}`,
            type: 'daily_reminder',
          })
        )
      );
      console.log(`Daily reminder sent to ${students.length} students`);
    } catch (err) {
      console.error('Daily reminder cron error:', err.message);
    }
  });

  console.log('Mode switch & reminder cron jobs started');
};

module.exports = { startCronJobs, setIO };
