const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getPlayerToken, servePlayerHtml } = require('../controllers/player.controller');

// Student fetches a short-lived player token (auth required)
router.get('/:sessionId/token', authenticate, getPlayerToken);

// Backend renders the HTML page — token IS the auth, no JWT middleware needed
router.get('/embed/:token', servePlayerHtml);

module.exports = router;
