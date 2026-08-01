/**
 * Student Self-Service Routes
 * ---------------------------
 * All endpoints under this router are protected by requireAuth(['student']).
 * Every query uses req.user.sub (the JWT-derived student _id) as the filter,
 * so a student can ONLY access their own data. Route params like :studentId
 * are ignored; the token is the single source of truth for identity.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/auth');

const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Routine = require('../models/Routine');
const Leave = require('../models/Leave');
const Notice = require('../models/Notice');

const { uploads, localFileUrl } = require('../middleware/upload');
const { audit } = require('../utils/audit');
const { hashPassword, verifyPassword } = require('../utils/password');

// Enforce student role for every route in this module
router.use(requireAuth(['student']));

/**
 * Helper: safely resolve the current student's ObjectId from the token.
 * We never trust :id/:studentId parameters from the URL.
 */
function currentStudentId(req) {
  const id = req.user && req.user.sub;
  if (!id || !mongoose.isValidObjectId(id)) return null;
  return id;
}

/* ---------------------------------------------------------------------------
 * PROFILE
 * ------------------------------------------------------------------------- */

// GET /api/student/me — full profile of the logged-in student
router.get('/student/me', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const student = await Student.findById(id);
  if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });
  res.json({ success: true, data: student });
}));

// PUT /api/student/me — allow limited self-updates (contact info only)
router.put('/student/me', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const allowed = ['studentMobile', 'tempAddress', 'city', 'state', 'pincode', 'district', 'guardianMobile'];
  const payload = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key];
  }
  const updated = await Student.findByIdAndUpdate(id, payload, { returnDocument: 'after', runValidators: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Profile not found.' });
  await audit('Student self-profile update', { actor: updated.studentName, module: 'Student' }, req);
  res.json({ success: true, message: 'Profile updated!', data: updated });
}));

// POST /api/student/change-password — self password change
router.post('/student/change-password', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Old & new password required (min 6 chars).' });
  }
  const student = await Student.findById(id);
  if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });
  if (!verifyPassword(oldPassword, student.password)) {
    return res.status(401).json({ success: false, message: 'Old password is incorrect.' });
  }
  student.password = newPassword; // pre-save hook hashes it
  await student.save();
  await audit('Student password change', { actor: student.studentName, module: 'Auth' }, req);
  res.json({ success: true, message: 'Password updated successfully!' });
}));

// POST /api/student/upload-photo — self profile picture upload
router.post('/student/upload-photo',
  uploads.profile.single('profileImage'),
  asyncHandler(async (req, res) => {
    const id = currentStudentId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const photoUrl = localFileUrl(req, req.file, 'ZhiStudentProfiles');
    const updated = await Student.findByIdAndUpdate(id, { profilePicUrl: photoUrl }, { returnDocument: 'after' });
    if (!updated) return res.status(404).json({ success: false, message: 'Profile not found.' });
    res.json({ success: true, message: 'Photo updated!', profilePicUrl: photoUrl });
  })
);

/* ---------------------------------------------------------------------------
 * DASHBOARD SUMMARY
 * ------------------------------------------------------------------------- */

router.get('/student/dashboard-summary', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const student = await Student.findById(id).lean();
  if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });

  // Attendance % (across every attendance record the student appears in)
  const attRecords = await Attendance.find({ 'records.studentId': id }).select('records').lean();
  let totalClasses = 0;
  let presentClasses = 0;
  for (const doc of attRecords) {
    const rec = doc.records.find(r => r.studentId.toString() === id.toString());
    if (!rec) continue;
    totalClasses += 1;
    if (rec.status === 'P') presentClasses += 1;
  }
  const attendancePct = totalClasses ? Math.round((presentClasses / totalClasses) * 10000) / 100 : 0;

  // Fee totals
  const fee = await StudentFee.findOne({ studentId: id }).lean();
  const feeSummary = fee ? {
    totalAmount: fee.totalAmount || 0,
    totalPaid: fee.totalPaid || 0,
    totalDue: fee.totalDue || 0
  } : { totalAmount: 0, totalPaid: 0, totalDue: 0 };

  // Latest exam results (any of the mark rows containing this student)
  const marks = await Mark.find({ 'studentsMarkList.studentId': id, status: 'Published' })
    .sort({ examDate: -1 }).limit(5).lean();
  const latestExams = marks.map(m => {
    const r = m.studentsMarkList.find(s => s.studentId && s.studentId.toString() === id.toString());
    return {
      examName: m.examName,
      subject: m.subject,
      date: m.examDate,
      maxMarks: m.maxMarks,
      marksObtained: r ? r.marksObtained : 0,
      rank: r ? r.rank : 0
    };
  });

  // Pending leaves
  const pendingLeaves = await Leave.countDocuments({ applicantId: id.toString(), status: 'Pending' });

  res.json({
    success: true,
    data: {
      profile: {
        name: student.studentName,
        email: student.email,
        course: student.course,
        semester: student.semester,
        collegeRegNo: student.collegeRegNo,
        profilePicUrl: student.profilePicUrl || ''
      },
      attendance: { totalClasses, presentClasses, percentage: attendancePct },
      fees: feeSummary,
      latestExams,
      pendingLeaves
    }
  });
}));

/* ---------------------------------------------------------------------------
 * ATTENDANCE
 * ------------------------------------------------------------------------- */

router.get('/student/attendance', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const rows = await Attendance.find({ 'records.studentId': id })
    .populate('teacherId', 'name')
    .sort({ fullDate: -1 })
    .lean();

  const data = rows.map(row => {
    const rec = row.records.find(r => r.studentId.toString() === id.toString());
    return {
      date: row.fullDate,
      course: row.course,
      semester: row.semester,
      subject: row.subject,
      startTime: row.startTime,
      endTime: row.endTime,
      teacher: row.teacherId ? row.teacherId.name : 'N/A',
      status: rec ? rec.status : 'A'
    };
  });

  // Group by subject for a small chart
  const bySubject = {};
  for (const r of data) {
    if (!bySubject[r.subject]) bySubject[r.subject] = { total: 0, present: 0 };
    bySubject[r.subject].total += 1;
    if (r.status === 'P') bySubject[r.subject].present += 1;
  }
  const subjectStats = Object.entries(bySubject).map(([subject, v]) => ({
    subject,
    total: v.total,
    present: v.present,
    percentage: v.total ? Math.round((v.present / v.total) * 10000) / 100 : 0
  }));

  res.json({ success: true, data, subjectStats });
}));

/* ---------------------------------------------------------------------------
 * TIMETABLE
 * ------------------------------------------------------------------------- */

router.get('/student/timetable', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const student = await Student.findById(id).select('course semester').lean();
  if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });

  const filter = {};
  if (student.course) filter.course = new RegExp(`^${student.course}$`, 'i');
  if (student.semester) filter.semester = student.semester;

  const routines = await Routine.find(filter).populate('teacherId', 'name').sort({ dayOfWeek: 1, startTime: 1 }).lean();
  res.json({ success: true, data: routines, meta: { course: student.course, semester: student.semester } });
}));

/* ---------------------------------------------------------------------------
 * ASSIGNMENTS / NOTES (uses Note model — teachers upload notes/assignments)
 * ------------------------------------------------------------------------- */

router.get('/student/assignments', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const student = await Student.findById(id).select('course semester').lean();
  if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });

  const Note = require('../models/Note');
  // Note schema is keyed on `semester` + `subject`. Filter by semester only.
  const filter = {};
  if (student.semester) filter.semester = student.semester;

  const notes = await Note.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: notes });
}));

/* ---------------------------------------------------------------------------
 * EXAM RESULTS
 * ------------------------------------------------------------------------- */

router.get('/student/results', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const exams = await Mark.find({ 'studentsMarkList.studentId': id, status: 'Published' })
    .populate('teacherId', 'name')
    .sort({ examDate: -1 })
    .lean();

  const data = exams.map(exam => {
    const rec = exam.studentsMarkList.find(s => s.studentId && s.studentId.toString() === id.toString());
    if (!rec) return null;
    return {
      _id: exam._id,
      examName: exam.examName,
      subject: exam.subject,
      course: exam.course,
      semester: exam.semester,
      date: exam.examDate,
      teacher: exam.teacherId ? exam.teacherId.name : 'Faculty',
      maxMarks: exam.maxMarks,
      attendanceStatus: rec.attendanceStatus,
      marksObtained: rec.marksObtained,
      rank: rec.rank,
      remarks: rec.remarks
    };
  }).filter(Boolean);

  // CGPA-ish summary: overall percentage across published exams
  const totals = data.reduce((acc, cur) => {
    acc.max += Number(cur.maxMarks) || 0;
    acc.got += Number(cur.marksObtained) || 0;
    return acc;
  }, { max: 0, got: 0 });
  const overallPct = totals.max ? Math.round((totals.got / totals.max) * 10000) / 100 : 0;

  res.json({ success: true, data, summary: { ...totals, percentage: overallPct } });
}));

/* ---------------------------------------------------------------------------
 * FEES
 * ------------------------------------------------------------------------- */

router.get('/student/fees', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

  const fee = await StudentFee.findOne({ studentId: id }).lean();
  const transactions = await Transaction.find({ studentId: id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: fee || null, transactions });
}));

/* ---------------------------------------------------------------------------
 * LEAVES
 * ------------------------------------------------------------------------- */

router.get('/student/leaves', asyncHandler(async (req, res) => {
  const id = currentStudentId(req);
  if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });
  const leaves = await Leave.find({ applicantId: id.toString() }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: leaves });
}));

router.post('/student/leaves',
  uploads.leave.single('document'),
  asyncHandler(async (req, res) => {
    const id = currentStudentId(req);
    if (!id) return res.status(401).json({ success: false, message: 'Invalid session.' });

    const student = await Student.findById(id).lean();
    if (!student) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const { leaveType, startDate, endDate, totalDays, reason } = req.body || {};
    if (!startDate || !endDate || !totalDays || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate, totalDays, reason are required.' });
    }

    const leave = await Leave.create({
      applicantId: id.toString(),
      applicantName: student.studentName,
      applicantRole: 'student',
      course: student.course || '',
      semester: student.semester || '',
      leaveType: leaveType || 'General',
      startDate,
      endDate,
      totalDays: Number(totalDays),
      reason,
      documentUrl: localFileUrl(req, req.file, 'ZhiLeaves')
    });
    await audit('Student leave applied', { actor: student.studentName, module: 'Leave', meta: { leaveId: leave._id } }, req);
    res.status(201).json({ success: true, message: 'Leave application submitted!', data: leave });
  })
);

/* ---------------------------------------------------------------------------
 * NOTICES (global — no student-specific filter, read-only)
 * ------------------------------------------------------------------------- */

router.get('/student/notices', asyncHandler(async (req, res) => {
  const notices = await Notice.find({}).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, data: notices });
}));

module.exports = router;
