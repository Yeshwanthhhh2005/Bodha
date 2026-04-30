const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getActivePoll, submitResponse } = require('../controllers/poll.controller');

// Student: get current active poll for a session
router.get('/sessions/:sessionId/active', authenticate, getActivePoll);

// Student: submit answer
router.post('/:pollId/respond', authenticate, submitResponse);

module.exports = router;
