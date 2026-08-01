const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const Expense = require('../models/Expense');
const Staff = require('../models/Staff');
const { generateFeeStructure, applyPaymentToHeads, recalcFeeTotals, receiptNo, number, roundMoney } = require('../utils/finance');
const { audit } = require('../utils/audit');

router.get('/search-student', asyncHandler(async (req, res) => {
  const { q, course, sem, batch } = req.query;
  const filterQuery = {};
  if (q && q.trim()) {
    filterQuery.$or = [
      { studentName: new RegExp(q, 'i') },
      { collegeRegNo: new RegExp(q, 'i') },
      { studentMobile: new RegExp(q, 'i') }
    ];
  }
  if (course) filterQuery.course = new RegExp(course, 'i');
  if (sem) filterQuery.semester = sem;
  if (batch) filterQuery.sessionBatch = new RegExp(batch, 'i');
  const students = await Student.find(filterQuery).select('_id studentName collegeRegNo course sessionBatch semester studentMobile');
  res.json({ success: true, data: students });
}));

router.get('/student-fee/:studentId', asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found!' });
  let feeRecord = await StudentFee.findOne({ studentId: student._id }).populate('studentId', 'studentName collegeRegNo course semester sessionBatch');
  if (!feeRecord) {
    feeRecord = await StudentFee.create({ studentId: student._id, ...generateFeeStructure(student.course || 'BCA') });
    feeRecord = await StudentFee.findOne({ studentId: student._id }).populate('studentId', 'studentName collegeRegNo course semester sessionBatch');
  } else {
    recalcFeeTotals(feeRecord);
    await feeRecord.save();
  }
  res.json({ success: true, data: feeRecord });
}));

router.post('/collect-fee', asyncHandler(async (req, res) => {
  const { studentId, headId, amount, mode, remarks, date, payerMobile } = req.body;
  const feeRecord = await StudentFee.findOne({ studentId });
  if (!feeRecord) return res.status(404).json({ success: false, message: 'Ledger not found!' });

  const paidAmount = number(amount);
  const headBefore = headId ? feeRecord.feeHeads.find(h => h._id.toString() === headId) : null;
  applyPaymentToHeads(feeRecord, paidAmount, headId || null);
  await feeRecord.save();

  const newTrans = await Transaction.create({
    receiptNo: receiptNo(),
    studentId,
    amount: paidAmount,
    mode: mode || 'Cash',
    date: date || new Date(),
    feeHeadName: headBefore ? headBefore.headName : 'Fee Collection',
    remarks,
    payerMobile
  });
  await audit('Fee collected', { actor: 'Accounts', module: 'Finance', meta: { studentId, amount: paidAmount } }, req);
  res.json({ success: true, message: 'Fee Collected Successfully!', receipt: newTrans, ledger: feeRecord });
}));

async function financeStats() {
  const [incomeAgg, expenseAgg, dueAgg, studentCount, staffCount] = await Promise.all([
    Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    StudentFee.aggregate([{ $group: { _id: null, total: { $sum: '$totalDue' } } }]),
    Student.countDocuments(),
    Staff.countDocuments()
  ]);
  const income = roundMoney(incomeAgg[0]?.total || 0);
  const expense = roundMoney(expenseAgg[0]?.total || 0);
  const due = roundMoney(dueAgg[0]?.total || 0);
  return { income, expense, due, balance: roundMoney(income - expense), students: studentCount, staff: staffCount };
}

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [stats, transactions, expenses] = await Promise.all([
    financeStats(),
    Transaction.find().populate('studentId', 'studentName collegeRegNo course').sort({ createdAt: -1 }).limit(50),
    Expense.find().sort({ createdAt: -1 }).limit(50)
  ]);
  res.json({ success: true, stats, transactions, expenses });
}));

router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await financeStats();
  res.json({ success: true, stats, data: stats });
}));

router.get('/transactions', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const transactions = await Transaction.find().populate('studentId', 'studentName collegeRegNo course').sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, data: transactions, transactions });
}));

router.get('/expenses', asyncHandler(async (req, res) => {
  const expenses = await Expense.find().sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, data: expenses, expenses });
}));

router.post('/expense', asyncHandler(async (req, res) => {
  const amount = number(req.body.amount || req.body.expAmt);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero.' });
  const expense = await Expense.create({
    voucherNo: req.body.voucherNo || receiptNo('VCH'),
    category: req.body.category || req.body.expCat || 'General',
    date: req.body.date || new Date(),
    mode: req.body.mode || 'Cash',
    amount,
    description: req.body.description || req.body.expDesc || ''
  });
  await audit('Expense added', { actor: 'Accounts', module: 'Finance', meta: { expenseId: expense._id, amount } }, req);
  res.status(201).json({ success: true, message: 'Expense saved successfully!', data: expense, expense });
}));

module.exports = router;
