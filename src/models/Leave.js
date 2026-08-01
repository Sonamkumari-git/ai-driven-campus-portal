const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  applicantId: { type: String, required: true },
  applicantName: { type: String, required: true },
  applicantRole: { type: String, required: true },
  course: { type: String, default: '' },
  semester: { type: String, default: '' },
  leaveType: { type: String, default: 'General' },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: true },
  documentUrl: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  hodRemark: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
