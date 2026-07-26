/**
 * aiRoutes.js
 * -----------
 * Thin Express router. All logic lives in controllers/aiController.js.
 * Mounted in src/app.js as:
 *     app.use('/api/ai', require('./routes/aiRoutes'));
 */
const express = require('express');
const multer = require('multer');
const ctrl = require('../controllers/aiController');

const router = express.Router();

// Memory storage — the file is forwarded straight to FastAPI, never persisted.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    const ok =
      (file.mimetype || '').startsWith('image/') ||
      file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Only image/* or application/pdf allowed'), ok);
  },
});

// Health
router.get('/health', ctrl.health);
router.get('/dashboard-insights', ctrl.dashboardInsights);

// 5 AI modules
router.post('/performance',      ctrl.performance);
router.post('/at-risk',          ctrl.atRisk);
router.post('/attendance-risk',  ctrl.attendanceRisk);
router.post('/finance-anomaly',  ctrl.financeAnomaly);
router.post('/document',         upload.single('file'), ctrl.document);

// Multer / general error trap for this router
router.use((err, _req, res, _next) => {
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'Bad request' });
  }
});

module.exports = router;
