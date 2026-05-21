const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/auth.routes');
const sessionRoutes = require('./src/routes/sessions.routes');
const chatRoutes = require('./src/routes/chat.routes');
const escalationRoutes = require('./src/routes/escalation.routes');
const adminRoutes = require('./src/routes/admin.routes');
const scheduleRoutes = require('./src/routes/schedule.routes');
const playerRoutes = require('./src/routes/player.routes');
const pollRoutes = require('./src/routes/poll.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const classScheduleRoutes = require('./src/routes/classSchedule.routes');
const courseConfigRoutes  = require('./src/routes/courseConfig.routes');
const leaderboardRoutes   = require('./src/routes/leaderboard.routes');
const shortsRoutes        = require('./src/routes/shorts.routes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve uploaded videos (and any other static uploads) directly.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/class-schedule', classScheduleRoutes);
app.use('/api/course-config',  courseConfigRoutes);
app.use('/api/leaderboard',    leaderboardRoutes);
app.use('/api/shorts',         shortsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/', (req, res) => {
  res.json({
    name: 'Bodha LMS API',
    status: 'running',
    health: '/api/health',
    endpoints: [
      '/api/auth', '/api/sessions', '/api/chat', '/api/escalations',
      '/api/admin', '/api/schedule', '/api/player', '/api/polls',
      '/api/notifications', '/api/class-schedule', '/api/course-config',
      '/api/leaderboard', '/api/shorts',
    ],
  });
});

app.use(errorHandler);

module.exports = app;
