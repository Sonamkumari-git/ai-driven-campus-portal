const express = require('express');
const router = express.Router();
const Mark = require('../models/Mark');
const { asyncHandler } = require('../middleware/asyncHandler');

router.post('/marks/upload', asyncHandler(async (req, res) => {
  const payload = req.body;
  const existingExam = await Mark.findOne({
    course: payload.course,
    sessionBatch: payload.sessionBatch,
    semester: payload.semester,
    subject: payload.subject,
    examName: new RegExp(`^${payload.examName}$`, 'i')
  });
  if (existingExam) {
    const updated = await Mark.findByIdAndUpdate(existingExam._id, payload, { returnDocument: 'after' });
    return res.json({ success: true, message: 'Marks updated successfully!', data: updated });
  }
  const marks = await Mark.create(payload);
  res.status(201).json({ success: true, message: 'Marks & Ranks saved successfully!', data: marks });
}));

router.get('/marks/check', asyncHandler(async (req, res) => {
  const { course, sessionBatch, semester, subject, examName } = req.query;
  const examRecord = await Mark.findOne({ course: new RegExp(`^${course}$`, 'i'), sessionBatch, semester, subject, examName: new RegExp(`^${examName}$`, 'i') });
  res.json(examRecord ? { success: true, exists: true, data: examRecord } : { success: true, exists: false });
}));

router.get('/marks/student', asyncHandler(async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ success: false, message: 'Student ID is required' });
  const allExams = await Mark.find({ 'studentsMarkList.studentId': studentId, status: 'Published' }).populate('teacherId', 'name').sort({ examDate: -1 });
  const formattedMarks = allExams.map(exam => {
    const studentRecord = exam.studentsMarkList.find(s => s.studentId && s.studentId.toString() === studentId.toString());
    if (!studentRecord) return null;
    return { _id: exam._id, examName: exam.examName, subject: exam.subject, course: exam.course, semester: exam.semester, date: exam.examDate, teacher: exam.teacherId ? exam.teacherId.name : 'Faculty', maxMarks: exam.maxMarks, attendanceStatus: studentRecord.attendanceStatus, marksObtained: studentRecord.marksObtained, rank: studentRecord.rank, remarks: studentRecord.remarks };
  }).filter(Boolean);
  res.json({ success: true, data: formattedMarks });
}));

module.exports = router;
