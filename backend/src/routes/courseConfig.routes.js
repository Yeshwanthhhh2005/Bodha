const router  = require('express').Router();
const CourseConfig = require('../models/CourseConfig');
const { authenticate, requireRole } = require('../middleware/auth');
const { success } = require('../utils/response');
const { emitGlobal, broadcastToAllStudents } = require('../services/notification.service');

// Fetch or auto-create the singleton
async function getConfig() {
  let cfg = await CourseConfig.findOne().lean();
  if (!cfg) cfg = await CourseConfig.create({});
  return cfg;
}

// ─── Public: GET config (student app reads this) ──────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try { success(res, await getConfig()); }
  catch (err) { next(err); }
});

// ─── Admin: GET config ────────────────────────────────────────────────────────
router.get('/admin', authenticate, requireRole('admin'), async (req, res, next) => {
  try { success(res, await getConfig()); }
  catch (err) { next(err); }
});

// ─── Admin: PUT (upsert) config ───────────────────────────────────────────────
router.put('/admin', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { currentTechnology, startDate, totalClasses, completedClasses, techList } = req.body;
    const update = {};
    if (currentTechnology !== undefined) update.currentTechnology = currentTechnology;
    if (startDate          !== undefined) update.startDate         = startDate || null;
    if (totalClasses       !== undefined) update.totalClasses      = Number(totalClasses);
    if (completedClasses   !== undefined) update.completedClasses  = Number(completedClasses);
    if (techList           !== undefined) update.techList          = techList;

    const before = await CourseConfig.findOne().lean();
    const cfg = await CourseConfig.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true, runValidators: true });
    emitGlobal('course-config:updated');
    if (before?.currentTechnology !== cfg.currentTechnology && cfg.currentTechnology) {
      broadcastToAllStudents({
        title: '📚 New Technology Started',
        message: `Course is now teaching: ${cfg.currentTechnology}.`,
        type: 'new_content',
        metadata: { technology: cfg.currentTechnology },
      }).catch(() => {});
    }
    success(res, cfg, 'Course config updated');
  } catch (err) { next(err); }
});

module.exports = router;
