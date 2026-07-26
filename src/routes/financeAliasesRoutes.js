const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { asyncHandler } = require('../middleware/asyncHandler');
const { receiptNo, number } = require('../utils/finance');

router.get('/expenses', asyncHandler(async (req, res) => {
  const expenses = await Expense.find().sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, data: expenses, expenses });
}));

router.post('/expenses', asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    voucherNo: req.body.voucherNo || receiptNo('VCH'),
    category: req.body.category || req.body.expCat || 'General',
    date: req.body.date || new Date(),
    mode: req.body.mode || 'Cash',
    amount: number(req.body.amount || req.body.expAmt),
    description: req.body.description || req.body.expDesc || ''
  });
  res.status(201).json({ success: true, message: 'Expense saved successfully!', data: expense, expense });
}));

module.exports = router;
