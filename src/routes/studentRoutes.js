const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/asyncHandler');
const { uploads, localFileUrl } = require('../middleware/upload');
const Student = require('../models/Student');
const StudentFee = require('../models/StudentFee');
const Transaction = require('../models/Transaction');
const { generateFeeStructure, applyPaymentToHeads, receiptNo, number } = require('../utils/finance');
const { audit } = require('../utils/audit');
const { hashPassword } = require('../utils/password');

router.post('/add-student', asyncHandler(async (req, res) => {
  const newStudent = new Student({ ...req.body, email: String(req.body.email || '').toLowerCase(), password: req.body.password || req.body.studentMobile });
  const savedStudent = await newStudent.save();

  const feeData = generateFeeStructure(savedStudent.course);
  const collected = number(req.body.amountCollected);
  const studentFee = new StudentFee({ studentId: savedStudent._id, ...feeData });

  if (collected > 0) {
    applyPaymentToHeads(studentFee, collected, null);
    await Transaction.create({
      receiptNo: receiptNo(),
      studentId: savedStudent._id,
      date: new Date(),
      mode: req.body.paymentMode || 'Cash',
      amount: collected,
      feeHeadName: 'Admission Fee (Auto Distributed)',
      remarks: req.body.transactionId || 'Admission Time Payment',
      payerMobile: req.body.studentMobile || req.body.fatherMobile
    });
  }

  await studentFee.save();
  await audit('Student added', { actor: 'Admin Desk', module: 'Student', meta: { studentId: savedStudent._id } }, req);
  res.status(201).json({ success: true, message: 'Student & Fee Record added successfully!', studentId: savedStudent._id });
}));

router.post('/upload-photo/:id', uploads.profile.single('profileImage'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded!' });
  const photoUrl = localFileUrl(req, req.file, 'ZhiStudentProfiles');
  const student = await Student.findByIdAndUpdate(req.params.id, { profilePicUrl: photoUrl }, { returnDocument: 'after' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found!' });
  res.json({ success: true, message: 'Photo Updated!', profilePicUrl: photoUrl });
}));

router.get('/students', asyncHandler(async (req, res) => {
  const students = await Student.find().sort({ createdAt: -1 });
  res.json({ success: true, data: students });
}));

router.get('/students/:id', asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found!' });
  res.json({ success: true, data: student });
}));

router.put('/students/:id', asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.email) payload.email = String(payload.email).toLowerCase();
  if (payload.password) payload.password = hashPassword(payload.password);
  if (!payload.password) delete payload.password;
  const updatedStudent = await Student.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after', runValidators: true });
  if (!updatedStudent) return res.status(404).json({ success: false, message: 'Student not found!' });
  await audit('Student updated', { actor: 'Admin Desk', module: 'Student', meta: { studentId: updatedStudent._id } }, req);
  res.json({ success: true, message: 'Student details updated!', data: updatedStudent });
}));

router.delete('/students/:id', asyncHandler(async (req, res) => {
  const deletedStudent = await Student.findByIdAndDelete(req.params.id);
  if (!deletedStudent) return res.status(404).json({ success: false, message: 'Student not found!' });
  await StudentFee.deleteOne({ studentId: req.params.id });
  await audit('Student deleted', { actor: 'Admin Desk', module: 'Student', meta: { studentId: req.params.id } }, req);
  res.json({ success: true, message: 'Student deleted successfully!' });
}));

module.exports = router;
