const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // Academic Details
    course: String,
    semester: String,
    sessionBatch: String,       
    registrationDate: String,
    collegeRegNo: String,
    univRegNo: String,
    
    // Personal Details
    studentName: { type: String, required: true },
    dob: String,
    gender: String,
    bloodGroup: String,
    nationality: String,
    motherTongue: String,
    studentMobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    aadharNumber: String,       
    category: String,           
    religion: String,           
    
    // Address Details
    permanentAddress: String,
    city: String,
    state: String,
    pincode: String,            
    district: String,           
    tempAddress: String,
    
    // Guardian Details
    fatherName: String,
    fatherMobile: String,
    motherName: String,
    motherMobile: String,
    guardianName: String,
    guardianRelation: String,
    guardianMobile: String,
    guardianAddress: String,
    
    // Fee Details
    amountCollected: Number,
    paymentMode: String,
    transactionId: String,
    
    // 🔴 PHOTO AND DOCUMENTS LINK (Naya Add Kiya Gaya Hai)
    // Cloudinary ka URL yahan save hoga
    profilePicUrl: { type: String, default: "" }, 
    aadharDocUrl: { type: String, default: "" }, 
    
    // Credentials
    password: { type: String, required: true },

    // OTP and Security (Forgot Password ke liye zaroori hai)
    resetOtp: { type: String },
    otpExpiry: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
