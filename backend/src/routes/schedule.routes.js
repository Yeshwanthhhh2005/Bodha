const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const LiveSession = require('../models/LiveSession');
const { success } = require('../utils/response');

/**
 * Returns ALL sessions sorted by priority:
 *   1. LIVE / DOUBT_SESSION  (happening now — float to top)
 *   2. UPCOMING              (soonest first)
 *   3. COMPLETED             (most recently completed first — for recording access)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const sessions = await LiveSession.aggregate([
      { $match: { isVisible: true } },
      {
        $addFields: {
          _sortPriority: {
            $switch: {
              branches: [
                { case: { $eq: ['$state', 'LIVE'] },          then: 0 },
                { case: { $eq: ['$state', 'DOUBT_SESSION'] }, then: 1 },
                { case: { $eq: ['$state', 'UPCOMING'] },      then: 2 },
                { case: { $eq: ['$state', 'COMPLETED'] },     then: 3 },
              ],
              default: 4,
            },
          },
          // COMPLETED: desc (most recent first) → negate scheduledAt ms
          // UPCOMING:  asc  (soonest first)     → use scheduledAt ms as-is
          _sortTime: {
            $cond: {
              if: { $eq: ['$state', 'COMPLETED'] },
              then: { $multiply: [{ $toLong: '$scheduledAt' }, -1] },
              else: { $toLong: '$scheduledAt' },
            },
          },
        },
      },
      { $sort: { _sortPriority: 1, _sortTime: 1 } },
      { $project: { _sortPriority: 0, _sortTime: 0 } },
    ]);

    success(res, sessions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
