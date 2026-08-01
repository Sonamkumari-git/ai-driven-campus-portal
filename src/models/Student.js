const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');

const studentSchema = new mongoose.Schema({
  course: String,
  semester: String,
  sessionBatch: String,
  registrationDate: String,
  collegeRegNo: String,
  univRegNo: String,
  studentName: { type: String, required: true },
  dob: String,
  gender: String,
  bloodGroup: String,
  nationality: String,
  motherTongue: String,
  studentMobile: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  aadharNumber: String,
  category: String,
  religion: String,
  permanentAddress: String,
  city: String,
  state: String,
  pincode: String,
  district: String,
  tempAddress: String,
  fatherName: String,
  fatherMobile: String,
  motherName: String,
  motherMobile: String,
  guardianName: String,
  guardianRelation: String,
  guardianMobile: String,
  guardianAddress: String,
  amountCollected: { type: Number, default: 0 },
  paymentMode: String,
  transactionId: String,
  password: { type: String, required: true },
  resetOtp: String,
  otpExpiry: Date,
  profilePicUrl: { type: String, default: '' },
  aadharDocUrl: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

studentSchema.pre('save', function hashPasswordBeforeSave(next) {
  if (this.isModified('password')) this.password = hashPassword(this.password);
  next();
});

studentSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetOtp;
    delete ret.otpExpiry;
    return ret;
  }
});

module.exports = mongoose.model('Student', studentSchema);
