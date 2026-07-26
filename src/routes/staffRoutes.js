const express = require('express');
const router = express.Router();
const Staff = require('../models/Staff');
const { uploads, localFileUrl } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/asyncHandler');
const { audit } = require('../utils/audit');
const { hashPassword } = require('../utils/password');
const { requireAuth } = require('../middleware/auth');

const staffFields = uploads.staff.fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
  { name: 'cert', maxCount: 1 }
]);

function staffPayload(req) {
  const payload = { ...req.body };
  if (payload.email) payload.email = String(payload.email).toLowerCase();
  if (payload.salary !== undefined) payload.salary = Number(payload.salary) || 0;
  const files = req.files || {};
  if (files.profilePic?.[0]) payload.profilePicUrl = localFileUrl(req, files.profilePic[0], 'ZhiStaffFiles');
  if (files.profileImage?.[0]) payload.profilePicUrl = localFileUrl(req, files.profileImage[0], 'ZhiStaffFiles');
  if (files.resume?.[0]) payload.resumeUrl = localFileUrl(req, files.resume[0], 'ZhiStaffFiles');
  if (files.certificate?.[0]) payload.certUrl = localFileUrl(req, files.certificate[0], 'ZhiStaffFiles');
  if (files.cert?.[0]) payload.certUrl = localFileUrl(req, files.cert[0], 'ZhiStaffFiles');
  if (payload.password) payload.password = hashPassword(payload.password);
  return payload;
}

router.post('/staff', requireAuth(['director']), staffFields, asyncHandler(async (req, res) => {
  const payload = staffPayload(req);
  if (!payload.password) payload.password = payload.mobile || payload.empId;
  const staff = await Staff.create(payload);
  await audit('Staff created', { actor: 'Director', module: 'Staff', meta: { staffId: staff._id, role: staff.role } }, req);
  res.status(201).json({ success: true, message: 'Staff added successfully!', data: staff });
}));

router.get('/staff', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = new RegExp(req.query.role, 'i');
  if (req.query.category) filter.category = new RegExp(req.query.category, 'i');
  if (req.query.dept) filter.dept = new RegExp(req.query.dept, 'i');
  const staff = await Staff.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: staff });
}));

router.get('/staff/:id', asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found!' });
  res.json({ success: true, data: staff });
}));

router.put('/staff/:id', requireAuth(['director']), staffFields, asyncHandler(async (req, res) => {
  const payload = staffPayload(req);
  if (!payload.password) delete payload.password;
  const staff = await Staff.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found!' });
  await audit('Staff updated', { actor: 'Director', module: 'Staff', meta: { staffId: staff._id } }, req);
  res.json({ success: true, message: 'Staff updated successfully!', data: staff });
}));

router.delete('/staff/:id', requireAuth(['director']), asyncHandler(async (req, res) => {
  const staff = await Staff.findByIdAndDelete(req.params.id);
  if (!staff) return res.status(404).json({ success: false, message: 'Staff not found!' });
  await audit('Staff deleted', { actor: 'Director', module: 'Staff', meta: { staffId: req.params.id } }, req);
  res.json({ success: true, message: 'Staff deleted successfully!' });
}));

module.exports = router;
