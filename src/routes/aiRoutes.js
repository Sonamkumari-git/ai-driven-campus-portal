/**
 * ============================================================================
 *  AI Bridge Routes  (/api/ai/*)
 * ----------------------------------------------------------------------------
 *  Thin Node.js proxy between the ZHI portal and the FastAPI inference server
 *  running out of `ai_engine/python_service/`.  If the AI service is
 *  unreachable (env AI_SERVICE_URL unset OR fetch failure), each endpoint
 *  falls back to an internal MOCK response computed from live MongoDB seed
 *  data — so the UI can be demoed end-to-end even before the ML teammate
 *  ships the .onnx / .pkl artefacts.
 *
 *  RBAC is enforced in `src/app.js` where this router is mounted (director +
 *  hod for risk / timetable, director + accountant for finance forecast,
 *  teacher/hod for face verification).
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');

const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');
const Routine = require('../models/Routine');
const Leave = require('../models/Leave');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || '';

// -------------------------------------------------------------------------- //
//  Utility: attempt to call FastAPI, otherwise return null (caller falls back)
// -------------------------------------------------------------------------- //
async function callAiService(path, method, body) {
  if (!AI_SERVICE_URL) return null;
  try {
    const url = `${AI_SERVICE_URL.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      // 3s cap so a dead python service never freezes the Node event loop
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  }
}

// -------------------------------------------------------------------------- //
//  Helper: compute per-student attendance % across all Attendance docs
// -------------------------------------------------------------------------- //
async function computeAttendancePct(studentId) {
  const docs = await Attendance.find({ 'records.studentId': studentId }).lean();
  let total = 0;
  let present = 0;
  for (const d of docs) {
    for (const r of d.records || []) {
      if (String(r.studentId) !== String(studentId)) continue;
      total += 1;
      if (r.status === 'P') present += 1;
    }
  }
  return total ? Math.round((present / total) * 10000) / 100 : 100;
}

async function computeAvgMarks(studentId) {
  const docs = await Mark.find({ 'studentsMarkList.studentId': studentId }).lean();
  const vals = [];
  for (const d of docs) {
    for (const m of d.studentsMarkList || []) {
      if (String(m.studentId) !== String(studentId)) continue;
      vals.push(Number(m.marksObtained || 0));
    }
  }
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
}

async function computeFeeDelayDays(studentId) {
  const fee = await StudentFee.findOne({ studentId }).lean();
  if (!fee) return 0;
  const totalDue = Number(fee.totalAmount || 0);
  const paid = Number(fee.totalPaid || 0);
  const pending = Math.max(0, totalDue - paid);
  if (pending <= 0) return 0;
  const lastTxn = await Transaction.findOne({ studentId }).sort({ date: -1 }).lean();
  if (!lastTxn) return 60;
  const days = Math.max(0, Math.floor((Date.now() - new Date(lastTxn.date).getTime()) / (1000 * 60 * 60 * 24)));
  return Math.min(days, 180);
}

function bandFromProbability(p) {
  if (p >= 0.66) return 'HIGH';
  if (p >= 0.33) return 'MEDIUM';
  return 'LOW';
}

function mockRiskScore({ attendancePct, avgMarks, feeDelayDays, leaveCount }) {
  // Logistic transform mirroring the FastAPI stub for parity
  const logit =
    -0.04 * attendancePct +
    -0.03 * avgMarks +
    0.02 * feeDelayDays +
    0.15 * (leaveCount || 0) +
    3.0;
  const p = 1 / (1 + Math.exp(-logit));
  return Math.round(p * 10000) / 10000;
}

// ========================================================================== //
//  1)  POST/GET  /api/ai/predict-risk
//      GET  -> risk table for all students (dashboard / matrix widgets)
//      POST -> risk score for a single student (studentId in body)
// ========================================================================== //
router.get('/ai/predict-risk', asyncHandler(async (req, res) => {
  const students = await Student.find({}).lean();
  const rows = [];
  for (const s of students) {
    const attendancePct = await computeAttendancePct(s._id);
    const avgMarks = await computeAvgMarks(s._id);
    const feeDelayDays = await computeFeeDelayDays(s._id);
    const leaveCount = await Leave.countDocuments({ applicantId: String(s._id), applicantRole: 'Student' });

    const remote = await callAiService('/predict/risk', 'POST', {
      studentId: String(s._id),
      attendancePct, avgMarks, feeDelayDays, leaveCount
    });

    const probability = remote ? remote.dropoutProbability : mockRiskScore({ attendancePct, avgMarks, feeDelayDays, leaveCount });
    rows.push({
      studentId: s._id,
      collegeRegNo: s.collegeRegNo,
      studentName: s.studentName,
      course: s.course,
      semester: s.semester,
      attendancePct,
      avgMarks,
      feeDelayDays,
      leaveCount,
      dropoutProbability: probability,
      riskBand: bandFromProbability(probability),
      source: remote ? 'ai-service' : 'mock'
    });
  }
  rows.sort((a, b) => b.dropoutProbability - a.dropoutProbability);
  res.json({
    success: true,
    model: 'xgboost-dropout-v0 (mock)',
    generatedAt: new Date().toISOString(),
    total: rows.length,
    highRisk: rows.filter(r => r.riskBand === 'HIGH').length,
    mediumRisk: rows.filter(r => r.riskBand === 'MEDIUM').length,
    lowRisk: rows.filter(r => r.riskBand === 'LOW').length,
    rows
  });
}));

router.post('/ai/predict-risk', asyncHandler(async (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId required' });
  const student = await Student.findById(studentId).lean();
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  const attendancePct = await computeAttendancePct(student._id);
  const avgMarks = await computeAvgMarks(student._id);
  const feeDelayDays = await computeFeeDelayDays(student._id);
  const leaveCount = await Leave.countDocuments({ applicantId: String(student._id), applicantRole: 'Student' });

  const remote = await callAiService('/predict/risk', 'POST', {
    studentId: String(student._id), attendancePct, avgMarks, feeDelayDays, leaveCount
  });
  const probability = remote ? remote.dropoutProbability : mockRiskScore({ attendancePct, avgMarks, feeDelayDays, leaveCount });

  res.json({
    success: true,
    student: { id: student._id, name: student.studentName, regNo: student.collegeRegNo },
    features: { attendancePct, avgMarks, feeDelayDays, leaveCount },
    dropoutProbability: probability,
    riskBand: bandFromProbability(probability),
    topFactors: remote ? remote.topFactors : [
      { feature: 'attendancePct', impact: Math.round(-0.04 * attendancePct * 1000) / 1000 },
      { feature: 'avgMarks',      impact: Math.round(-0.03 * avgMarks      * 1000) / 1000 },
      { feature: 'feeDelayDays',  impact: Math.round( 0.02 * feeDelayDays  * 1000) / 1000 }
    ],
    source: remote ? 'ai-service' : 'mock'
  });
}));

// ========================================================================== //
//  2)  GET/POST  /api/ai/generate-timetable
// ========================================================================== //
router.get('/ai/generate-timetable', asyncHandler(async (req, res) => {
  const routines = await Routine.find({}).lean();

  // Detect conflicts (teacher/room double-booking on same day+start)
  const seenTeacher = new Map();
  const seenRoom = new Map();
  const conflicts = [];
  for (const r of routines) {
    const tKey = `${r.teacherId}|${r.dayOfWeek}|${r.startTime}`;
    const rKey = `${r.roomNumber}|${r.dayOfWeek}|${r.startTime}`;
    if (seenTeacher.has(tKey)) conflicts.push({ type: 'teacher', with: seenTeacher.get(tKey), current: r._id });
    else seenTeacher.set(tKey, r._id);
    if (seenRoom.has(rKey)) conflicts.push({ type: 'room', with: seenRoom.get(rKey), current: r._id });
    else seenRoom.set(rKey, r._id);
  }

  const remote = await callAiService('/optimize/timetable', 'POST', {
    slots: routines.map(r => ({
      course: r.course,
      subject: r.subject,
      teacherId: String(r.teacherId),
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      roomNumber: r.roomNumber
    }))
  });

  // Mock CSP output — sort by (day, start) then reassign rooms round-robin
  const roomsPool = ['Room 101', 'Room 102', 'Room 204', 'Room 205', 'Room 301', 'Lab 1', 'Lab 2'];
  const optimised = routines.map((r, i) => ({
    course: r.course, semester: r.semester, section: r.section,
    subject: r.subject, teacherName: r.teacherName,
    dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime,
    originalRoom: r.roomNumber,
    assignedRoom: (remote && remote.optimisedSchedule && remote.optimisedSchedule[i])
      ? remote.optimisedSchedule[i].assignedRoom
      : roomsPool[i % roomsPool.length],
    colorClass: i % 5
  }));

  res.json({
    success: true,
    model: 'csp-graph-coloring-v0 (mock)',
    conflictsBefore: conflicts.length,
    conflictsAfter: 0,
    chromaticNumber: remote ? remote.chromaticNumber : 5,
    fitness: remote ? remote.fitness : Math.round((1 - conflicts.length / Math.max(routines.length, 1)) * 10000) / 10000,
    conflicts,
    optimisedSchedule: optimised,
    source: remote ? 'ai-service' : 'mock'
  });
}));

router.post('/ai/generate-timetable', asyncHandler(async (req, res) => {
  // Alias with same behaviour to allow HOD to POST filters later.
  req.method = 'GET';
  return router.handle(req, res);
}));

// ========================================================================== //
//  3)  POST  /api/ai/verify-face
// ========================================================================== //
router.post('/ai/verify-face', asyncHandler(async (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ success: false, message: 'studentId required' });

  const remote = await callAiService('/verify/face', 'POST', { studentId, imageB64: req.body.imageB64 });
  if (remote) return res.json({ success: true, ...remote, source: 'ai-service' });

  // Deterministic mock: hash-of-id -> confidence 65-99%
  let hash = 0;
  for (const ch of String(studentId)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const similarity = 0.65 + ((hash % 3400) / 10000);
  const threshold = 0.72;
  res.json({
    success: true,
    studentId,
    matchConfidence: Math.round(similarity * 10000) / 100,
    cosineSimilarity: Math.round(similarity * 10000) / 10000,
    threshold,
    verified: similarity >= threshold,
    model: 'facenet-resnet-mock',
    source: 'mock'
  });
}));

router.get('/ai/verify-face', (req, res) => {
  res.json({
    success: true,
    message: 'POST { studentId, imageB64 } to verify a face embedding.',
    model: 'facenet-resnet-mock'
  });
});

// ========================================================================== //
//  4)  GET/POST  /api/ai/financial-forecast
// ========================================================================== //
router.get('/ai/financial-forecast', asyncHandler(async (req, res) => {
  const horizonMonths = Math.max(1, Math.min(12, Number(req.query.horizon || 6)));

  // Baseline from actuals in the last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [txnAgg, expAgg] = await Promise.all([
    Transaction.aggregate([{ $match: { date: { $gte: since } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { date: { $gte: since } } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);
  const seedRevenue = (txnAgg[0]?.total || 850000) / 3; // monthly avg
  const seedExpense = (expAgg[0]?.total || 60000)  / 3;

  const remote = await callAiService('/forecast/finance', 'POST', { horizonMonths, seedRevenue, seedExpense });
  if (remote) return res.json({ success: true, ...remote, source: 'ai-service' });

  const revenue = [];
  const expense = [];
  const today = new Date();
  today.setDate(1);
  for (let m = 1; m <= horizonMonths; m++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    const month = d.toISOString().slice(0, 7);
    const r = seedRevenue * (1 + 0.04 * m) * (1 + 0.02 * Math.sin(m));
    const e = seedExpense * (1 + 0.03 * m) * (1 + 0.015 * Math.cos(m));
    revenue.push({ month, value: Math.round(r * 100) / 100 });
    expense.push({ month, value: Math.round(e * 100) / 100 });
  }
  const netProfit = revenue.map((r, i) => ({ month: r.month, value: Math.round((r.value - expense[i].value) * 100) / 100 }));

  res.json({
    success: true,
    model: 'ar2-timeseries-v0 (mock)',
    horizonMonths,
    seedRevenue: Math.round(seedRevenue),
    seedExpense: Math.round(seedExpense),
    revenue,
    expense,
    netProfit,
    source: 'mock'
  });
}));

router.post('/ai/financial-forecast', asyncHandler(async (req, res) => {
  req.query.horizon = req.body?.horizonMonths || req.query.horizon || 6;
  req.method = 'GET';
  return router.handle(req, res);
}));

// -------------------------------------------------------------------------- //
//  Health probe
// -------------------------------------------------------------------------- //
router.get('/ai/health', asyncHandler(async (req, res) => {
  const remote = await callAiService('/health', 'GET');
  res.json({
    success: true,
    node: 'ok',
    aiService: remote ? 'ok' : 'unreachable',
    aiServiceUrl: AI_SERVICE_URL || '(not configured)',
    fallback: remote ? 'not-used' : 'mock'
  });
}));

module.exports = router;
