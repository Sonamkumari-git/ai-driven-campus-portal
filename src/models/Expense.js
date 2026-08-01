const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  voucherNo: { type: String, unique: true },
  category: String,
  date: { type: Date, default: Date.now },
  mode: { type: String, default: 'Cash' },
  amount: { type: Number, default: 0 },
  description: String
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
