const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { uploads, localFileUrl } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/asyncHandler');
const { audit } = require('../utils/audit');

function parseAudience(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed; } catch (_) {}
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

router.post('/notices', uploads.notice.single('attachment'), asyncHandler(async (req, res) => {
  const notice = await Notice.create({
    title: req.body.title,
    message: req.body.message,
    priority: req.body.priority || 'info',
    audience: parseAudience(req.body.audience),
    postedBy: req.body.postedBy || 'Director Office',
    fileUrl: localFileUrl(req, req.file, 'ZhiNotices')
  });
  await audit('Notice created', { actor: notice.postedBy, module: 'Notice', meta: { noticeId: notice._id } }, req);
  res.status(201).json({ success: true, message: 'Notice posted successfully!', data: notice });
}));

router.get('/notices', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.audience) filter.audience = { $in: [req.query.audience, 'All', 'all'] };
  const notices = await Notice.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: notices });
}));

router.put('/notices/:id', uploads.notice.single('attachment'), asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (req.body.audience) update.audience = parseAudience(req.body.audience);
  if (req.file) update.fileUrl = localFileUrl(req, req.file, 'ZhiNotices');
  const notice = await Notice.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' });
  if (!notice) return res.status(404).json({ success: false, message: 'Notice not found!' });
  res.json({ success: true, message: 'Notice updated successfully!', data: notice });
}));

router.delete('/notices/:id', asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) return res.status(404).json({ success: false, message: 'Notice not found!' });
  res.json({ success: true, message: 'Notice deleted successfully!' });
}));

module.exports = router;
