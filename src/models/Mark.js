const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  course: { type: String, required: true },
  sessionBatch: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  examName: { type: String, required: true },
  examDate: { type: Date, required: true },
  maxMarks: { type: Number, required: true },
  studentsMarkList: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    rollNo: { type: String, required: true },
    studentName: { type: String, required: true },
    attendanceStatus: { type: String, enum: ['Present', 'Absent', 'Debarred'], default: 'Present' },
    marksObtained: { type: Number, default: 0 },
    rank: { type: Number, default: 0 },
    remarks: { type: String, default: '' }
  }],
  status: { type: String, enum: ['Draft', 'Published'], default: 'Published' }
}, { timestamps: true });

markSchema.index({ course: 1, sessionBatch: 1, semester: 1, subject: 1, examName: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
