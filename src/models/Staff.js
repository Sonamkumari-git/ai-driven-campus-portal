const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');

const staffSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  empId: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  fatherName: String,
  dob: String,
  gender: String,
  mobile: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  address: String,
  contact: String,
  aadhaar: String,
  pan: String,
  qualification: String,
  university: String,
  experience: String,
  skills: String,
  joinDate: String,
  dept: String,
  shift: String,
  salary: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  bankName: String,
  accNumber: String,
  ifsc: String,
  profilePicUrl: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  certUrl: { type: String, default: '' }
}, { timestamps: true });

staffSchema.index({ email: 1 }, { sparse: true });

staffSchema.pre('save', function hashPasswordBeforeSave(next) {
  if (this.isModified('password')) this.password = hashPassword(this.password);
  next();
});

staffSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetOtp;
    delete ret.otpExpiry;
    return ret;
  }
});

module.exports = mongoose.model('Staff', staffSchema);
