const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  priority: { type: String, default: 'info' },
  audience: [{ type: String }],
  fileUrl: { type: String, default: '' },
  postedBy: { type: String, default: 'Director Office' }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
