const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/asyncHandler');

router.get('/get-courses', asyncHandler(async (req, res) => {
  const courses = await Student.distinct('course');
  res.json({ success: true, courses: courses.filter(Boolean) });
}));

router.get('/get-batches', asyncHandler(async (req, res) => {
  const { course } = req.query;
  const query = course ? { course: new RegExp(`^${course}$`, 'i') } : {};
  const batches = await Student.distinct('sessionBatch', query);
  res.json({ success: true, batches: batches.filter(Boolean) });
}));

router.get('/get-teacher-skills', asyncHandler(async (req, res) => {
  const { staffId } = req.query;
  if (!staffId) return res.status(400).json({ success: false, message: 'Staff ID required' });
  const teacher = await Staff.findById(staffId);
  if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found' });
  const skills = teacher.skills ? teacher.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  res.json({ success: true, skills });
}));

router.get('/get-students', asyncHandler(async (req, res) => {
  const { course, batch, sessionBatch, semester, date, isEdit, subject } = req.query;
  const filter = {};
  if (course) filter.course = new RegExp(`^${course}$`, 'i');
  if (semester) filter.semester = semester;
  const actualBatch = sessionBatch || batch;
  if (actualBatch) filter.sessionBatch = actualBatch;

  const students = await Student.find(filter).select('_id studentName collegeRegNo');
  let studentsData = students.map(s => ({ _id: s._id, roll: s.collegeRegNo || 'N/A', name: s.studentName, prevAtt: 100 }));

  if (isEdit === 'true') {
    const existingAtt = await Attendance.findOne({ course, semester, subject, fullDate: new Date(date) });
    if (existingAtt) {
      studentsData = studentsData.map(s => {
        const record = existingAtt.records.find(r => r.studentId.toString() === s._id.toString());
        return { ...s, recordedStatus: record ? record.status : 'A' };
      });
    }
  }

  res.json({ success: true, students: studentsData });
}));

router.get('/attendances/subject', asyncHandler(async (req, res) => {
  const { course, semester, subject } = req.query;
  const filter = {};
  if (course) filter.course = new RegExp(`^${course}$`, 'i');
  if (semester) filter.semester = semester;
  if (subject) filter.subject = new RegExp(`^${subject}$`, 'i');
  const records = await Attendance.find(filter);
  res.json({ success: true, data: records });
}));

function normalizeAttendancePayload(payload) {
  const date = payload.fullDate ? new Date(payload.fullDate) : new Date();
  payload.fullDate = date;
  payload.day = payload.day || date.getDate();
  payload.month = payload.month || String(date.getMonth() + 1).padStart(2, '0');
  payload.year = payload.year || date.getFullYear();
  const records = payload.records || [];
  const presentCount = records.filter(r => r.status === 'P').length;
  const absentCount = records.filter(r => r.status === 'A').length;
  payload.summary = payload.summary || {
    totalStudents: records.length,
    presentCount,
    absentCount,
    attendancePercentage: records.length ? Math.round((presentCount / records.length) * 10000) / 100 : 0
  };
  return payload;
}

router.post('/save-attendance', asyncHandler(async (req, res) => {
  const payload = normalizeAttendancePayload({ ...req.body });
  const query = { fullDate: payload.fullDate, course: payload.course, semester: payload.semester, subject: payload.subject };

  if (payload.mode === 'UPDATE') {
    const updated = await Attendance.findOneAndUpdate(query, payload, { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true });
    return res.json({ success: true, message: 'Attendance updated!', data: updated });
  }

  const existing = await Attendance.findOne(query);
  if (existing) return res.status(400).json({ success: false, message: "Attendance already exists for this Date & Subject. Use 'Edit Existing' button." });
  const attendance = await Attendance.create(payload);
  res.status(201).json({ success: true, message: 'Attendance saved!', data: attendance });
}));

router.get('/attendance', asyncHandler(async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: 'Student ID is required' });
  const attendanceData = await Attendance.find({ 'records.studentId': studentId }).populate('teacherId', 'name').sort({ fullDate: -1 });
  const formattedData = attendanceData.map(record => {
    const studentRecord = record.records.find(r => r.studentId.toString() === studentId);
    return { _id: record._id, course: record.course, semester: record.semester, subject: record.subject, date: record.fullDate, teacher: record.teacherId ? record.teacherId.name : 'N/A', studentStatus: studentRecord ? studentRecord.status : 'A' };
  });
  res.json({ success: true, data: formattedData });
}));

router.get('/attendance/student-history/:studentId', asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { course, semester } = req.query;
  const filter = { 'records.studentId': studentId };
  if (course) filter.course = new RegExp(`^${course}$`, 'i');
  if (semester) filter.semester = semester;
  const rows = await Attendance.find(filter).sort({ fullDate: -1 });
  const data = rows.map(row => {
    const record = row.records.find(r => r.studentId.toString() === studentId);
    return { date: row.fullDate, subject: row.subject, status: record ? record.status : 'A', course: row.course, semester: row.semester };
  });
  res.json({ success: true, data });
}));

module.exports = router;
