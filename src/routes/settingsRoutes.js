const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const { uploads, localFileUrl } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/asyncHandler');
const { audit } = require('../utils/audit');
const { requireAuth } = require('../middleware/auth');
const { verifyPassword, hashPassword } = require('../utils/password');

const settingsUpload = uploads.settings.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'loginBackground', maxCount: 1 }
]);

router.get('/settings/public', asyncHandler(async (req, res) => {
  const settings = await Settings.getPublic();
  res.json({ success: true, data: settings });
}));

router.use('/settings', requireAuth(['director']));

router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await Settings.getPublic();
  res.json({ success: true, data: settings });
}));

router.put('/settings', settingsUpload, asyncHandler(async (req, res) => {
  const update = { ...req.body };
  if (update.maintenanceMode !== undefined) update.maintenanceMode = ['true', 'on', true, '1'].includes(update.maintenanceMode);
  if (req.files?.logo?.[0]) update.logoUrl = localFileUrl(req, req.files.logo[0], 'ZhiSettings');
  if (req.files?.loginBackground?.[0]) update.loginBackgroundUrl = localFileUrl(req, req.files.loginBackground[0], 'ZhiSettings');
  const settings = await Settings.findOneAndUpdate({ key: 'default' }, update, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true });
  await audit('System settings updated', { actor: 'Director', module: 'Settings' }, req);
  res.json({ success: true, message: 'Settings saved successfully!', data: settings });
}));

router.post('/settings/password', asyncHandler(async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase(), role: 'director' });
  if (!user || !verifyPassword(currentPassword, user.password)) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
  user.password = hashPassword(newPassword);
  await user.save();
  await audit('Director password updated', { actor: user.email, module: 'Settings' }, req);
  res.json({ success: true, message: 'Password updated successfully!' });
}));

module.exports = router;
