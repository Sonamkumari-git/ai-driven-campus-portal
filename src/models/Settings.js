const mongoose = require('mongoose');

const defaultSettings = {
  key: 'default',
  collegeName: 'Zakir Husain Institute',
  collegeShortName: 'ZHI College',
  portalSubtitle: 'Admin & Faculty Portal',
  activeSession: '2025 - 2026',
  contactEmail: 'admin@zhi.edu.in',
  supportEmail: 'support@zhi.edu.in',
  logoUrl: '/zhi_logo.png',
  loginBackgroundUrl: '',
  timezone: 'Asia/Kolkata',
  currencySymbol: '₹',
  dateFormat: 'DD-MM-YYYY',
  maintenanceMode: false
};

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  collegeName: String,
  collegeShortName: String,
  portalSubtitle: String,
  activeSession: String,
  contactEmail: String,
  supportEmail: String,
  logoUrl: String,
  loginBackgroundUrl: String,
  timezone: String,
  currencySymbol: String,
  dateFormat: String,
  maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

settingsSchema.statics.ensureDefault = async function ensureDefault() {
  return this.findOneAndUpdate({ key: 'default' }, { $setOnInsert: defaultSettings }, { upsert: true, returnDocument: 'after' });
};

settingsSchema.statics.getPublic = async function getPublic() {
  const doc = await this.ensureDefault();
  return doc.toObject();
};

module.exports = mongoose.model('Settings', settingsSchema);
