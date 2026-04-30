const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getSession,
  getWeeklySchedule,
  setReminder,
  removeReminder,
  getUserReminders,
} = require('../controllers/sessions.controller');

router.get('/schedule/weekly', authenticate, getWeeklySchedule);
router.get('/reminders/mine', authenticate, getUserReminders);
router.get('/:id', authenticate, getSession);
router.post('/:id/remind', authenticate, setReminder);
router.delete('/:id/remind', authenticate, removeReminder);

module.exports = router;
