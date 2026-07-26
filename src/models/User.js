const mongoose = require('mongoose');
const { hashPassword } = require('../utils/password');

const userSchema = new mongoose.Schema({
  role: { type: String, required: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Director', trim: true },
  mobile: { type: String, default: '' },
  profilePicUrl: { type: String, default: '' },
  resetOtp: String,
  otpExpiry: Date
}, { timestamps: true });

userSchema.pre('save', function hashPasswordBeforeSave(next) {
  if (this.isModified('password')) this.password = hashPassword(this.password);
  next();
});

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetOtp;
    delete ret.otpExpiry;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
