const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
  course: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, default: 'A' },
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  teacherName: { type: String, required: true },
  date: { type: String, required: true },
  dayOfWeek: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  roomNumber: String
}, { timestamps: true });

module.exports = mongoose.model('Routine', routineSchema);
