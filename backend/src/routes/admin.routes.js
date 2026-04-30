const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  updateSessionState,
  updateWatcherCount,
  getAnalytics,
  notifySession,
  getSessionAdmin,
  getEscalationsAdmin,
  listUsers,
  createUser,
  deleteUser,
  updateUserRole,
} = require('../controllers/admin.controller');
const {
  listPolls, createPoll, updatePoll, deletePoll,
  releasePoll, closePoll, getPollResults,
} = require('../controllers/poll.controller');
const {
  sendAdminNotification, listBroadcasts, deleteBroadcast,
} = require('../controllers/notification.controller');

const isAdmin = requireRole('admin', 'instructor');

router.get('/sessions', authenticate, isAdmin, listSessions);
router.post('/sessions', authenticate, isAdmin, createSession);
router.get('/sessions/:id', authenticate, isAdmin, getSessionAdmin);
router.put('/sessions/:id', authenticate, isAdmin, updateSession);
router.delete('/sessions/:id', authenticate, requireRole('admin'), deleteSession);
router.patch('/sessions/:id/state', authenticate, isAdmin, updateSessionState);
router.patch('/sessions/:id/watchers', authenticate, isAdmin, updateWatcherCount);
router.post('/sessions/:id/notify', authenticate, isAdmin, notifySession);
router.get('/sessions/:sessionId/analytics', authenticate, isAdmin, getAnalytics);
router.get('/sessions/:sessionId/escalations', authenticate, isAdmin, getEscalationsAdmin);

// Poll management (admin)
router.get('/sessions/:sessionId/polls', authenticate, isAdmin, listPolls);
router.post('/sessions/:sessionId/polls', authenticate, isAdmin, createPoll);
router.put('/polls/:pollId', authenticate, isAdmin, updatePoll);
router.delete('/polls/:pollId', authenticate, requireRole('admin'), deletePoll);
router.patch('/polls/:pollId/release', authenticate, isAdmin, releasePoll);
router.patch('/polls/:pollId/close', authenticate, isAdmin, closePoll);
router.get('/polls/:pollId/results', authenticate, isAdmin, getPollResults);

// Admin notification management
router.post('/notifications/broadcast', authenticate, isAdmin, sendAdminNotification);
router.get('/notifications/broadcasts', authenticate, isAdmin, listBroadcasts);
router.delete('/notifications/broadcasts/:broadcastId', authenticate, requireRole('admin'), deleteBroadcast);

// User management
router.get('/users', authenticate, isAdmin, listUsers);
router.post('/users', authenticate, isAdmin, createUser);
router.patch('/users/:id/role', authenticate, requireRole('admin'), updateUserRole);
router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);

module.exports = router;
