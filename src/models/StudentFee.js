const mongoose = require('mongoose');

const feeHeadSchema = new mongoose.Schema({
  headName: String,
  dueDate: String,
  amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },
  status: { type: String, default: 'Due', enum: ['Due', 'Partial', 'Paid'] }
});

const studentFeeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  totalAmount: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 },
  feeHeads: [feeHeadSchema]
}, { timestamps: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
