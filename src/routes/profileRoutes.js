const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { uploads, localFileUrl } = require('../middleware/upload');
const { audit } = require('../utils/audit');
const { verifyPassword, hashPassword } = require('../utils/password');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Student = require('../models/Student');

const profileUpload = uploads.staff.single('profilePic');

function lower(value) { return String(value || '').toLowerCase(); }

async function getAccount(authUser) {
  const role = lower(authUser.role);
  if (role === 'director') {
    const user = await User.findById(authUser.sub);
    return { role, model: 'User', doc: user };
  }
  if (role === 'student') {
    const student = await Student.findById(authUser.studentId || authUser.sub);
    return { role, model: 'Student', doc: student };
  }
  const staff = await Staff.findById(authUser.staffId || authUser.sub);
  return { role, model: 'Staff', doc: staff };
}

function publicProfile(account) {
  const doc = account.doc;
  if (!doc) return null;
  if (account.model === 'Student') {
    return {
      id: doc._id,
      role: account.role,
      name: doc.studentName,
      email: doc.email,
      mobile: doc.studentMobile,
      dept: doc.course,
      empId: doc.collegeRegNo,
      profilePicUrl: doc.profilePicUrl || '',
      raw: doc.toJSON()
    };
  }
  if (account.model === 'User') {
    return {
      id: doc._id,
      role: account.role,
      name: doc.name || 'Director',
      email: doc.email,
      mobile: doc.mobile || '',
      dept: 'Administration',
      empId: 'DIRECTOR',
      profilePicUrl: doc.profilePicUrl || '',
      raw: doc.toJSON()
    };
  }
  return {
    id: doc._id,
    role: account.role,
    name: doc.name,
    email: doc.email,
    mobile: doc.mobile,
    dept: doc.dept,
    empId: doc.empId,
    staffRole: doc.role,
    category: doc.category,
    profilePicUrl: doc.profilePicUrl || '',
    raw: doc.toJSON()
  };
}

function assignAllowed(doc, body, fields) {
  for (const field of fields) {
    if (body[field] !== undefined) doc[field] = body[field];
  }
}

router.use('/profile', requireAuth());

router.get('/profile/me', asyncHandler(async (req, res) => {
  const account = await getAccount(req.user);
  if (!account.doc) return res.status(404).json({ success: false, message: 'Profile not found.' });
  res.json({ success: true, data: publicProfile(account) });
}));

router.put('/profile/me', profileUpload, asyncHandler(async (req, res) => {
  const account = await getAccount(req.user);
  if (!account.doc) return res.status(404).json({ success: false, message: 'Profile not found.' });

  if (account.model === 'Student') {
    assignAllowed(account.doc, req.body, ['studentName', 'studentMobile', 'tempAddress', 'permanentAddress', 'city', 'state', 'pincode']);
    if (req.body.name !== undefined) account.doc.studentName = req.body.name;
    if (req.body.mobile !== undefined) account.doc.studentMobile = req.body.mobile;
  } else if (account.model === 'User') {
    assignAllowed(account.doc, req.body, ['name', 'mobile']);
  } else {
    assignAllowed(account.doc, req.body, ['name', 'mobile', 'address', 'qualification', 'skills', 'dept', 'shift']);
  }

  if (req.file) account.doc.profilePicUrl = localFileUrl(req, req.file, 'ZhiStaffFiles');
  await account.doc.save();
  await audit('Profile updated', { actor: publicProfile(account).email, module: 'Profile' }, req);
  res.json({ success: true, message: 'Profile updated successfully!', data: publicProfile(account) });
}));

router.post('/profile/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  const account = await getAccount(req.user);
  if (!account.doc) return res.status(404).json({ success: false, message: 'Profile not found.' });
  if (!verifyPassword(currentPassword, account.doc.password)) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  }
  account.doc.password = hashPassword(newPassword);
  await account.doc.save();
  await audit('Profile password updated', { actor: publicProfile(account).email, module: 'Profile' }, req);
  res.json({ success: true, message: 'Password updated successfully!' });
}));

module.exports = router;
