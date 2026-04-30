const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LiveSession = require('../models/LiveSession');
const modeSwitchService = require('./modeSwitch.service');
const notificationService = require('./notification.service');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  modeSwitchService.setIO(io);
  notificationService.setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select('-passwordHash');
      if (!socket.user) return next(new Error('User not found'));
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // User always joins their personal room for notifications/reminders
    socket.join(`user:${user._id}`);

    socket.on('join_session', async ({ sessionId }) => {
      try {
        const session = await LiveSession.findById(sessionId);
        if (!session) return socket.emit('error', { message: 'Session not found' });

        socket.join(`session:${sessionId}`);
        socket.join(`session:${sessionId}:student:${user._id}`);

        if (user.role === 'instructor' || user.role === 'admin') {
          socket.join(`trainer:${sessionId}`);
        }

        // Increment watcher count for LIVE sessions
        if (session.state === 'LIVE') {
          session.watcherCount = (session.watcherCount || 0) + 1;
          await session.save();
          io.to(`session:${sessionId}`).emit('session:watcher_count', { count: session.watcherCount });
        }

        socket.emit('session:joined', {
          sessionId,
          state: session.state,
          watcherCount: session.watcherCount,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('leave_session', async ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
      socket.leave(`session:${sessionId}:student:${user._id}`);

      try {
        const session = await LiveSession.findById(sessionId);
        if (session?.state === 'LIVE' && session.watcherCount > 0) {
          session.watcherCount -= 1;
          await session.save();
          io.to(`session:${sessionId}`).emit('session:watcher_count', { count: session.watcherCount });
        }
      } catch {}
    });

    socket.on('disconnect', () => {
      // Watcher count cleanup handled via leave_session event from client
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
