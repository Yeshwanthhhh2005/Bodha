const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { escalateToTrainer, getEscalationQueue, respondToEscalation } = require('../controllers/escalation.controller');

router.post('/:sessionId/escalate', authenticate, requireRole('student'), escalateToTrainer);
router.get('/:sessionId/queue', authenticate, requireRole('instructor', 'admin'), getEscalationQueue);
router.patch('/:id/respond', authenticate, requireRole('instructor', 'admin'), respondToEscalation);

module.exports = router;
