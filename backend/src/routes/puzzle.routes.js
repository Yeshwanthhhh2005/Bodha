const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/puzzle.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ── Admin routes (declared before /:id so they don't get swallowed) ──────────
router.get('/admin/list',          authenticate, requireRole('admin'), ctrl.adminList);
router.get('/admin/stats',         authenticate, requireRole('admin'), ctrl.adminStats);
router.post('/admin/create',       authenticate, requireRole('admin'), ctrl.adminCreate);
router.patch('/admin/:id',         authenticate, requireRole('admin'), ctrl.adminUpdate);
router.delete('/admin/:id',        authenticate, requireRole('admin'), ctrl.adminDelete);
router.patch('/admin/:id/toggle',  authenticate, requireRole('admin'), ctrl.adminToggleStatus);
router.get('/admin/:id/attempts',  authenticate, requireRole('admin'), ctrl.adminAttempts);

// ── Student routes ────────────────────────────────────────────────────────────
router.get('/today',               authenticate, ctrl.getToday);
router.get('/history',             authenticate, ctrl.getHistory);
router.get('/my-progress',         authenticate, ctrl.getMyProgress);
router.get('/leaderboard',         authenticate, ctrl.getLeaderboard);
router.get('/:id',                 authenticate, ctrl.getPuzzle);
router.post('/:id/submit',         authenticate, ctrl.submitAnswer);

module.exports = router;
