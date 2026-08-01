/**
 * Admin / HOD / Staff routes for the Student Module.
 *
 * These endpoints let administrators view, add, edit and delete student
 * data — including photos, fee heads, attendance records and marks — that
 * feed the student-facing dashboard.
 *
 * Mounted at /api and locked to director/hod/staff via requireAuth below.
 *
 * NOTE: Base CRUD (add/update/delete/list student, photo upload, fee
 * collection, save-attendance, marks/upload) already live in the existing
 * routers. This file layers a few *admin-oriented* helpers on top so the
 * frontend admin screens can drive the student dashboard end-to-end.
 */

const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Leave = require('../models/Leave');

const { audit } = require('../utils/audit');
const {
  generateFeeStructure,
  applyPaymentToHeads,
  recalcFeeTotals,
  receiptNo,
  number
} = require('../utils/finance');

// All routes here require an administrator role
router.use(requireAuth(['director', 'hod', 'staff']));

/**
 * GET /api/admin/students-overview
 * Returns a compact per-student dashboard summary for admin listings.
 */
router.get('/manage-students/students-overview', asyncHandler(async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 }).lean();
  const ids = students.map(s => s._id);

  const [fees, attRecs, marks] = await Promise.all([
    StudentFee.find({ studentId: { $in: ids } }).lean(),
    Attendance.find({ 'records.studentId': { $in: ids } }).select('records').lean(),
    Mark.find({ 'studentsMarkList.studentId': { $in: ids }, status: 'Published' })
      .select('studentsMarkList maxMarks').lean()
  ]);

  const feeByStudent = new Map(fees.map(f => [f.studentId.toString(), f]));

  const attByStudent = new Map();
  for (const doc of attRecs) {
    for (const rec of doc.records) {
      const key = rec.studentId.toString();
      if (!attByStudent.has(key)) attByStudent.set(key, { total: 0, present: 0 });
      const s = attByStudent.get(key);
      s.total += 1;
      if (rec.status === 'P') s.present += 1;
    }
  }

  const markByStudent = new Map();
  for (const exam of marks) {
    for (const s of exam.studentsMarkList) {
      if (!s.studentId) continue;
      const key = s.studentId.toString();
      if (!markByStudent.has(key)) markByStudent.set(key, { got: 0, max: 0 });
      const cur = markByStudent.get(key);
      cur.got += Number(s.marksObtained) || 0;
      cur.max += Number(exam.maxMarks) || 0;
    }
  }

  const data = students.map(s => {
    const id = s._id.toString();
    const fee = feeByStudent.get(id);
    const att = attByStudent.get(id) || { total: 0, present: 0 };
    const mk  = markByStudent.get(id) || { got: 0, max: 0 };
    return {
      _id: s._id,
      studentName: s.studentName,
      email: s.email,
      collegeRegNo: s.collegeRegNo,
      course: s.course,
      semester: s.semester,
      profilePicUrl: s.profilePicUrl,
      status: s.status,
      attendancePct: att.total ? Math.round((att.present / att.total) * 10000) / 100 : 0,
      totalDue: fee ? fee.totalDue : 0,
      totalPaid: fee ? fee.totalPaid : 0,
      overallScorePct: mk.max ? Math.round((mk.got / mk.max) * 10000) / 100 : 0
    };
  });

  res.json({ success: true, data });
}));

/**
 * GET /api/admin/students/:id/full
 * Full 360° view of one student — used by admin "view details" screens
 * and by "edit student" forms.
 */
router.get('/manage-students/students/:id/full', asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const [fee, transactions, attRecs, marks, leaves] = await Promise.all([
    StudentFee.findOne({ studentId: student._id }),
    Transaction.find({ studentId: student._id }).sort({ createdAt: -1 }).lean(),
    Attendance.find({ 'records.studentId': student._id }).sort({ fullDate: -1 }).lean(),
    Mark.find({ 'studentsMarkList.studentId': student._id }).sort({ examDate: -1 }).lean(),
    Leave.find({ applicantId: student._id.toString() }).sort({ createdAt: -1 }).lean()
  ]);

  res.json({
    success: true,
    data: {
      student,
      fee,
      transactions,
      attendance: attRecs,
      marks,
      leaves
    }
  });
}));

/**
 * POST /api/admin/students/:id/fee-head
 * Add a fee head to a specific student (creates ledger if missing).
 */
router.post('/manage-students/students/:id/fee-head', asyncHandler(async (req, res) => {
  const { headName, amount, dueDate, discount } = req.body || {};
  if (!headName || !amount) return res.status(400).json({ success: false, message: 'headName and amount are required.' });

  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  let fee = await StudentFee.findOne({ studentId: student._id });
  if (!fee) fee = await StudentFee.create({ studentId: student._id, ...generateFeeStructure(student.course || 'BCA') });

  const amt = number(amount);
  const dsc = number(discount || 0);
  fee.feeHeads.push({
    headName,
    dueDate: dueDate || '',
    amount: amt,
    discount: dsc,
    fine: 0,
    paid: 0,
    due: Math.max(0, amt - dsc),
    status: 'Due'
  });
  recalcFeeTotals(fee);
  await fee.save();

  await audit('Admin added fee head', {
    actor: req.user.name || 'Admin',
    module: 'Finance',
    meta: { studentId: student._id, headName, amount: amt }
  }, req);

  res.json({ success: true, message: 'Fee head added.', data: fee });
}));

/**
 * POST /api/admin/students/:id/collect-fee
 * Admin-side quick fee collection targeting a specific student & optional
 * fee head. Mirrors /api/finance/collect-fee but is available to non-
 * accountant admin roles too (HOD/Staff cannot use /api/finance).
 */
router.post('/manage-students/students/:id/collect-fee', asyncHandler(async (req, res) => {
  const { headId, amount, mode, remarks, date, payerMobile } = req.body || {};

  const feeRecord = await StudentFee.findOne({ studentId: req.params.id });
  if (!feeRecord) return res.status(404).json({ success: false, message: 'Ledger not found.' });

  const paidAmount = number(amount);
  if (paidAmount <= 0) return res.status(400).json({ success: false, message: 'Amount must be > 0.' });

  const headBefore = headId ? feeRecord.feeHeads.find(h => h._id.toString() === headId) : null;
  applyPaymentToHeads(feeRecord, paidAmount, headId || null);
  await feeRecord.save();

  const receipt = await Transaction.create({
    receiptNo: receiptNo(),
    studentId: req.params.id,
    amount: paidAmount,
    mode: mode || 'Cash',
    date: date || new Date(),
    feeHeadName: headBefore ? headBefore.headName : 'Fee Collection',
    remarks,
    payerMobile
  });
  await audit('Admin fee collection', {
    actor: req.user.name || 'Admin',
    module: 'Finance',
    meta: { studentId: req.params.id, amount: paidAmount }
  }, req);

  res.json({ success: true, message: 'Payment recorded.', receipt, ledger: feeRecord });
}));

/**
 * POST /api/admin/students/:id/quick-attendance
 * Mark today's attendance for a single student on a given subject — for
 * ad-hoc admin corrections. Attaches to a single-record Attendance doc so
 * the student dashboard picks it up like any other class.
 */
router.post('/manage-students/students/:id/quick-attendance', asyncHandler(async (req, res) => {
  const { subject, status, startTime, endTime, date, course, semester } = req.body || {};
  if (!subject || !['P', 'A'].includes(status)) {
    return res.status(400).json({ success: false, message: 'subject and status (P/A) are required.' });
  }

  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

  const fullDate = date ? new Date(date) : new Date();

  const record = {
    studentId: student._id,
    rollNumber: student.collegeRegNo || 'N/A',
    studentName: student.studentName,
    status
  };

  const query = {
    fullDate,
    course: course || student.course,
    semester: semester || student.semester,
    subject
  };

  const existing = await Attendance.findOne(query);
  if (existing) {
    const idx = existing.records.findIndex(r => r.studentId.toString() === student._id.toString());
    if (idx >= 0) existing.records[idx].status = status;
    else existing.records.push(record);
    existing.summary.totalStudents = existing.records.length;
    existing.summary.presentCount = existing.records.filter(r => r.status === 'P').length;
    existing.summary.absentCount = existing.records.filter(r => r.status === 'A').length;
    existing.summary.attendancePercentage = existing.records.length
      ? Math.round((existing.summary.presentCount / existing.records.length) * 10000) / 100
      : 0;
    await existing.save();
    await audit('Admin quick attendance', { actor: req.user.name || 'Admin', module: 'Attendance' }, req);
    return res.json({ success: true, message: 'Attendance updated.', data: existing });
  }

  const doc = await Attendance.create({
    fullDate,
    day: fullDate.getDate(),
    month: String(fullDate.getMonth() + 1).padStart(2, '0'),
    year: fullDate.getFullYear(),
    course: query.course,
    semester: query.semester,
    subject,
    startTime: startTime || '09:00',
    endTime: endTime || '10:00',
    records: [record],
    summary: {
      totalStudents: 1,
      presentCount: status === 'P' ? 1 : 0,
      absentCount: status === 'A' ? 1 : 0,
      attendancePercentage: status === 'P' ? 100 : 0
    }
  });
  await audit('Admin quick attendance', { actor: req.user.name || 'Admin', module: 'Attendance' }, req);
  res.status(201).json({ success: true, message: 'Attendance recorded.', data: doc });
}));

/**
 * PUT /api/admin/students/:id/status
 * Toggle Active/Inactive/Alumni for a student.
 */
router.put('/manage-students/students/:id/status', asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  const allowed = ['Active', 'Inactive', 'Suspended', 'Alumni'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });

  const student = await Student.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
  await audit(`Student status → ${status}`, {
    actor: req.user.name || 'Admin',
    module: 'Student',
    meta: { studentId: student._id }
  }, req);
  res.json({ success: true, message: 'Status updated.', data: student });
}));

module.exports = router;
