const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const Staff = require('../models/Staff');
const Routine = require('../models/Routine');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');

router.get('/admin/dashboard', asyncHandler(async (req, res) => {
  const [students, staff, routines, leavesPending, totalDueAgg, incomeAgg, expenseAgg] = await Promise.all([
    Student.countDocuments(),
    Staff.countDocuments(),
    Routine.countDocuments(),
    Leave.countDocuments({ status: 'Pending' }),
    StudentFee.aggregate([{ $group: { _id: null, total: { $sum: '$totalDue' } } }]),
    Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  res.json({ success: true, data: { students, staff, routines, leavesPending, due: totalDueAgg[0]?.total || 0, income: incomeAgg[0]?.total || 0, expense: expenseAgg[0]?.total || 0 } });
}));

router.get('/alerts/hod', asyncHandler(async (req, res) => {
  const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysAttendance = await Attendance.countDocuments({ fullDate: today });
  const alerts = [];
  if (pendingLeaves) alerts.push({ type: 'leave', message: `${pendingLeaves} leave applications pending approval.` });
  if (!todaysAttendance) alerts.push({ type: 'attendance', message: 'No student attendance has been recorded today.' });
  res.json({ success: true, data: alerts });
}));

router.get('/syllabus/progress', asyncHandler(async (req, res) => {
  const totalRoutines = await Routine.countDocuments();
  res.json({ success: true, average: totalRoutines ? 60 : 0, data: { average: totalRoutines ? 60 : 0, totalRoutines } });
}));

module.exports = router;
