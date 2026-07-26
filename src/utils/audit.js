const AuditLog = require('../models/AuditLog');

async function audit(action, details = {}, req = null) {
  try {
    await AuditLog.create({
      actor: details.actor || 'System',
      action,
      module: details.module || 'General',
      status: details.status || 'SUCCESS',
      ip: req ? req.ip : '',
      meta: details.meta || {}
    });
  } catch (error) {
    console.warn('Audit log skipped:', error.message);
  }
}

module.exports = { audit };
