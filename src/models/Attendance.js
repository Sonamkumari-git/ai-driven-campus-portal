const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  fullDate: { type: Date, required: true },
  day: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  batch: { type: String, default: '' },
  course: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, default: 'A' },
  subject: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  records: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    status: { type: String, enum: ['P', 'A'], required: true }
  }],
  summary: {
    totalStudents: { type: Number, required: true },
    presentCount: { type: Number, required: true },
    absentCount: { type: Number, required: true },
    attendancePercentage: { type: Number, required: true }
  }
}, { timestamps: true });

attendanceSchema.index({ 'records.studentId': 1, subject: 1, fullDate: 1 });
attendanceSchema.index({ batch: 1, course: 1, semester: 1, fullDate: 1 });
attendanceSchema.index({ fullDate: 1, course: 1, semester: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
