const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: logs });
}));

module.exports = router;
