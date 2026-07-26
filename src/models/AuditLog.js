const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: String, default: 'System' },
  action: { type: String, required: true },
  module: { type: String, default: 'General' },
  status: { type: String, default: 'SUCCESS' },
  ip: String,
  meta: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
