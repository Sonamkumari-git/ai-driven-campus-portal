const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Settings = require('../models/Settings');
const { sendMail } = require('../config/mailer');
const { audit } = require('../utils/audit');
const { sign } = require('../utils/jwt');
const { env } = require('../config/env');
const { verifyPassword, upgradePlainPassword } = require('../utils/password');

function lower(value) { return String(value || '').toLowerCase(); }

function staffMatchesRole(staff, requestedRole) {
  const role = lower(staff.role);
  const category = lower(staff.category);
  const requested = lower(requestedRole);
  if (requested === 'teacher') return category.includes('teacher') || role.includes('teacher') || role.includes('faculty');
  if (requested === 'hod') return role.includes('hod') || category.includes('hod') || role.includes('head');
  if (requested === 'accountant') return role.includes('account') || category.includes('account') || role.includes('finance');
  if (requested === 'staff') return !category.includes('teacher') || role.includes('staff') || category.includes('management');
  return false;
}

function staffPermissions(role) {
  const requested = lower(role);
  return {
    dashboard: requested,
    canManageStudents: ['director', 'hod', 'staff'].includes(requested),
    canManageFinance: ['director', 'accountant'].includes(requested),
    canManageAcademics: ['director', 'hod', 'teacher'].includes(requested),
    canManageStaff: ['director'].includes(requested),
    canApproveLeave: ['director', 'hod'].includes(requested)
  };
}

function setAuthCookie(res, token) {
  res.cookie(env.jwt.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: env.jwt.expiresInSeconds * 1000,
    path: '/'
  });
}

function sendLogin(res, payload, body) {
  const token = sign(payload);
  setAuthCookie(res, token);
  return res.json({ success: true, token, user: payload, ...body });
}

router.post('/login', asyncHandler(async (req, res) => {
  const { role, email, password } = req.body;
  const requestedRole = lower(role);

  const settings = await Settings.ensureDefault();
  if (settings.maintenanceMode && requestedRole !== 'director') {
    return res.status(503).json({ success: false, message: 'System maintenance mode is active. Please try later.' });
  }

  if (requestedRole === 'student') {
    const student = await Student.findOne({ email: lower(email) });
    if (!student || !verifyPassword(password, student.password)) return res.status(401).json({ success: false, message: 'Invalid Email or Password!' });
    await upgradePlainPassword(student, password);
    await audit('Student login', { actor: student.studentName, module: 'Auth' }, req);
    return sendLogin(res, {
      sub: student._id.toString(),
      role: 'student',
      name: student.studentName,
      email: student.email,
      studentId: student._id.toString(),
      profilePicUrl: student.profilePicUrl || '',
      permissions: { dashboard: 'student' }
    }, {
      message: 'Welcome Student!',
      role: 'student',
      studentId: student._id,
      studentName: student.studentName,
      course: student.course || 'N/A',
      semester: student.semester || 'N/A',
      email: student.email,
      registrationNo: student.collegeRegNo || 'N/A',
      regDate: student.registrationDate || 'N/A',
      dob: student.dob || 'N/A',
      gender: student.gender || 'N/A',
      bloodGroup: student.bloodGroup || 'N/A',
      category: student.category || 'N/A',
      religion: student.religion || 'N/A',
      profilePicUrl: student.profilePicUrl || ''
    });
  }

  if (requestedRole === 'director') {
    const user = await User.findOne({ email: lower(email), role: 'director' });
    if (!user || !verifyPassword(password, user.password)) return res.status(401).json({ success: false, message: 'Invalid Email or Password!' });
    await upgradePlainPassword(user, password);
    await audit('Director login', { actor: user.email, module: 'Auth' }, req);
    return sendLogin(res, {
      sub: user._id.toString(),
      role: 'director',
      name: user.name || 'Director',
      email: user.email,
      profilePicUrl: user.profilePicUrl || '',
      permissions: staffPermissions('director')
    }, { message: 'Welcome Admin!', role: 'director', permissions: staffPermissions('director') });
  }

  if (['hod', 'accountant', 'staff', 'teacher'].includes(requestedRole)) {
    const staffUser = await Staff.findOne({ email: lower(email) });
    if (!staffUser || !verifyPassword(password, staffUser.password) || !staffMatchesRole(staffUser, requestedRole)) {
      return res.status(401).json({ success: false, message: 'Invalid Email, Password or Role!' });
    }
    await upgradePlainPassword(staffUser, password);
    if (lower(staffUser.status) === 'disabled') {
      return res.status(403).json({ success: false, message: 'Your account is disabled. Please contact Director.' });
    }
    await audit(`${requestedRole} login`, { actor: staffUser.name, module: 'Auth' }, req);
    return sendLogin(res, {
      sub: staffUser._id.toString(),
      role: requestedRole,
      name: staffUser.name,
      email: staffUser.email,
      staffId: staffUser._id.toString(),
      staffRole: staffUser.role,
      category: staffUser.category,
      profilePicUrl: staffUser.profilePicUrl || '',
      permissions: staffPermissions(requestedRole)
    }, {
      message: `Welcome ${staffUser.name}`,
      role: requestedRole,
      staffId: staffUser._id,
      staffName: staffUser.name,
      staffRole: staffUser.role,
      category: staffUser.category,
      profilePicUrl: staffUser.profilePicUrl || '',
      permissions: staffPermissions(requestedRole)
    });
  }

  res.status(400).json({ success: false, message: 'Invalid role selected.' });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(env.jwt.cookieName, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/auth/me', requireAuth(), (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  let user = await Student.findOne({ email: lower(email) }) || await User.findOne({ email: lower(email) }) || await Staff.findOne({ email: lower(email) });
  if (!user) return res.status(404).json({ success: false, message: 'Email not found!' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendMail({ to: user.email, subject: 'ZHI App - OTP', text: `Aapka Password Reset OTP hai: ${otp}. Yeh 10 minutes tak valid hai.` });
  res.json({ success: true, message: 'OTP sent to your email!' });
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  let user = await Student.findOne({ email: lower(email) }) || await User.findOne({ email: lower(email) }) || await Staff.findOne({ email: lower(email) });
  if (!user || user.resetOtp !== otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or Expired OTP!' });
  }
  user.password = newPassword;
  user.resetOtp = undefined;
  user.otpExpiry = undefined;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully!' });
}));

module.exports = router;
