const router = require('express').Router();
const ClassSchedule = require('../models/ClassSchedule');
const { authenticate, requireRole } = require('../middleware/auth');
const { success } = require('../utils/response');
const { emitGlobal, broadcastToAllStudents } = require('../services/notification.service');

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Student: GET all schedule entries (sorted Mon–Sun) ──────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const entries = await ClassSchedule.find().lean();
    entries.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    success(res, entries);
  } catch (err) {
    next(err);
  }
});

// ─── Admin: GET all entries ───────────────────────────────────────────────────
router.get('/admin', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const entries = await ClassSchedule.find().lean();
    entries.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    success(res, entries);
  } catch (err) {
    next(err);
  }
});

// ─── Admin: CREATE entry ──────────────────────────────────────────────────────
router.post('/admin', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { day, technology, topic, content } = req.body;
    if (!day || !technology || !topic) {
      return res.status(400).json({ success: false, message: 'day, technology, and topic are required' });
    }
    const entry = await ClassSchedule.create({ day, technology, topic, content: content || '' });
    emitGlobal('class-schedule:updated');
    broadcastToAllStudents({
      title: '📚 New Class Added',
      message: `${entry.day} • ${entry.technology} — ${entry.topic}`,
      type: 'new_content',
      metadata: { entryId: entry._id, day: entry.day },
    }).catch(() => {});
    success(res, entry, 'Schedule entry created', 201);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `A schedule entry for ${req.body.day} already exists` });
    }
    next(err);
  }
});

// ─── Admin: UPDATE entry ──────────────────────────────────────────────────────
router.put('/admin/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { day, technology, topic, content } = req.body;
    const entry = await ClassSchedule.findByIdAndUpdate(
      req.params.id,
      { day, technology, topic, content: content || '' },
      { new: true, runValidators: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    emitGlobal('class-schedule:updated');
    success(res, entry, 'Schedule entry updated');
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: `A schedule entry for that day already exists` });
    }
    next(err);
  }
});

// ─── Admin: DELETE entry ──────────────────────────────────────────────────────
router.delete('/admin/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const entry = await ClassSchedule.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    emitGlobal('class-schedule:updated');
    success(res, null, 'Schedule entry deleted');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
