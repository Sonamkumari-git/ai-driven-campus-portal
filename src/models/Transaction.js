const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  receiptNo: { type: String, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  date: { type: Date, default: Date.now },
  mode: String,
  amount: { type: Number, default: 0 },
  feeHeadName: String,
  remarks: String,
  payerMobile: String
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
