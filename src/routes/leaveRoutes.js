const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const { uploads, localFileUrl } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/asyncHandler');
const { audit } = require('../utils/audit');

router.get('/leaves', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.applicantId) filter.applicantId = req.query.applicantId;
  const leaves = await Leave.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: leaves });
}));

router.post('/leaves/apply', uploads.leave.single('document'), asyncHandler(async (req, res) => {
  const leave = await Leave.create({
    applicantId: req.body.applicantId,
    applicantName: req.body.applicantName,
    applicantRole: req.body.applicantRole,
    leaveType: req.body.leaveType || 'General',
    course: req.body.course || '',
    semester: req.body.semester || '',
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    totalDays: Number(req.body.totalDays),
    reason: req.body.reason,
    documentUrl: localFileUrl(req, req.file, 'ZhiLeaves')
  });
  await audit('Leave applied', { actor: leave.applicantName, module: 'Leave', meta: { leaveId: leave._id } }, req);
  res.status(201).json({ success: true, message: 'Leave application submitted successfully!', data: leave });
}));

router.post('/leaves/update-status', asyncHandler(async (req, res) => {
  const { id, status, remark } = req.body;
  const leave = await Leave.findByIdAndUpdate(id, { status, hodRemark: remark || '' }, { returnDocument: 'after' });
  if (!leave) return res.status(404).json({ success: false, message: 'Leave record not found!' });
  await audit(`Leave ${status}`, { actor: 'HOD/Admin', module: 'Leave', meta: { leaveId: id } }, req);
  res.json({ success: true, message: `Leave ${status} successfully!`, data: leave });
}));

module.exports = router;
