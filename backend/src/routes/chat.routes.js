const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { sendMessage, getHistory } = require('../controllers/chat.controller');

router.post('/:sessionId/messages', authenticate, sendMessage);
router.get('/:sessionId/messages', authenticate, getHistory);

module.exports = router;
