const express = require('express');
const router = express.Router();
const TeacherAttendance = require('../models/TeacherAttendance');
const { asyncHandler } = require('../middleware/asyncHandler');

router.post('/teacher-attendance/punch', asyncHandler(async (req, res) => {
  const { teacherId, teacherName, action, timeStr, dateStr, monthVal, dayName } = req.body;
  if (!teacherId || !dateStr || !monthVal) return res.status(400).json({ success: false, message: 'teacherId, dateStr and monthVal are required.' });

  if (action === 'IN') {
    const log = await TeacherAttendance.findOneAndUpdate(
      { teacherId, dateStr },
      { teacherId, teacherName, dateStr, monthVal, dayName, punchIn: timeStr, status: 'Present', remarks: 'On Time' },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Punched In Successfully', data: log });
  }

  if (action === 'OUT') {
    const log = await TeacherAttendance.findOneAndUpdate({ teacherId, dateStr }, { punchOut: timeStr, remarks: 'Shift Completed' }, { returnDocument: 'after' });
    if (!log) return res.status(400).json({ success: false, message: 'Cannot punch out without punching in first!' });
    return res.json({ success: true, message: 'Punched Out Successfully', data: log });
  }

  res.status(400).json({ success: false, message: 'Invalid action type' });
}));

router.get('/teacher-attendance/:teacherId', asyncHandler(async (req, res) => {
  const logs = await TeacherAttendance.find({ teacherId: req.params.teacherId }).sort({ dateStr: 1 });
  res.json({ success: true, data: logs });
}));

router.get('/teacher-attendance', asyncHandler(async (req, res) => {
  const { dateStr, monthVal } = req.query;
  const filter = {};
  if (dateStr) filter.dateStr = dateStr;
  if (monthVal) filter.monthVal = monthVal;
  const logs = await TeacherAttendance.find(filter).populate('teacherId', 'name empId dept').sort({ dateStr: -1 });
  res.json({ success: true, data: logs });
}));

module.exports = router;
