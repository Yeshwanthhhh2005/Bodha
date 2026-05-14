const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/aiAssistant.controller');

router.post('/messages',  authenticate, ctrl.sendMessage);
router.get('/history',    authenticate, ctrl.getHistory);
router.delete('/history', authenticate, ctrl.clearHistory);

module.exports = router;
