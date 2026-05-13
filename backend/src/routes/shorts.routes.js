const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/shorts.controller');

// ─── Multer storage (disk) ───────────────────────────────────────────────────
// Files live at backend/uploads/shorts/ and are served back at /uploads/shorts/.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'shorts');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },   // 50 MB — generous for 30s clips
  fileFilter: (_req, file, cb) => {
    const ok = /\.(mp4|mov)$/i.test(file.originalname) ||
               ['video/mp4', 'video/quicktime'].includes(file.mimetype);
    cb(ok ? null : new Error('Only MP4 or MOV videos are allowed'), ok);
  },
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES — declared BEFORE the `/:id/...` user routes so /admin/* doesn't
// accidentally match the `:id` param.
// ════════════════════════════════════════════════════════════════════════════
router.get('/admin/stats',  authenticate, requireRole('admin'), ctrl.adminStats);
router.get('/admin/:id',    authenticate, requireRole('admin'), ctrl.adminGet);
router.get('/admin',        authenticate, requireRole('admin'), ctrl.adminList);
router.patch('/admin/:id/approve', authenticate, requireRole('admin'), ctrl.adminApprove);
router.patch('/admin/:id/reject',  authenticate, requireRole('admin'), ctrl.adminReject);
router.patch('/admin/:id/feature', authenticate, requireRole('admin'), ctrl.adminToggleFeature);
router.delete('/admin/:id',        authenticate, requireRole('admin'), ctrl.adminDelete);

// ════════════════════════════════════════════════════════════════════════════
// USER-FACING ROUTES
// ════════════════════════════════════════════════════════════════════════════
router.get('/feed',         authenticate, ctrl.feed);
router.get('/trending',     authenticate, ctrl.trending);
router.get('/top-creators', authenticate, ctrl.topCreators);
router.get('/mine',         authenticate, ctrl.mine);

router.post('/upload', authenticate, (req, res, next) => {
  // Wrap multer so its errors become 400s with the standard JSON envelope
  upload.single('video')(req, res, (mErr) => {
    if (mErr) {
      const msg = mErr.code === 'LIMIT_FILE_SIZE' ? 'Video must be 50 MB or smaller' : mErr.message;
      return res.status(400).json({ success: false, message: msg });
    }
    ctrl.upload(req, res, next);
  });
});

router.post('/:id/view',  authenticate, ctrl.recordView);
router.post('/:id/like',  authenticate, ctrl.toggleLike);
router.post('/:id/share', authenticate, ctrl.recordShare);

router.post('/creators/:creatorId/follow',   authenticate, ctrl.followNoop);
router.delete('/creators/:creatorId/follow', authenticate, ctrl.unfollowNoop);

module.exports = router;
