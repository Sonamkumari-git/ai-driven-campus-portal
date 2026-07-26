const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Staff', // 🟢 Fixed: 'User' ki jagah 'Staff' hoga
        required: true 
    },
    course: { 
        type: String, 
        required: true // e.g., "BCA", "BBA"
    }, 
    sessionBatch: { 
        type: String, 
        required: true // 🟢 NEW: e.g., "2025-2028" (Batches alag rakhne ke liye)
    },
    semester: { 
        type: String, 
        required: true // e.g., "Semester 1", "Semester 6"
    }, 
    subject: { 
        type: String, 
        required: true 
    },
    examName: { 
        type: String, 
        required: true // e.g., "First Mid-Term"
    }, 
    examDate: { 
        type: Date, 
        required: true 
    },
    maxMarks: { 
        type: Number, 
        required: true 
    },
    studentsMarkList: [{
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // 🟢 Fixed: 'User' ki jagah 'Student'
        rollNo: { type: String, required: true },
        studentName: { type: String, required: true },
        attendanceStatus: { 
            type: String, 
            enum: ['Present', 'Absent', 'Debarred'], 
            default: 'Present' // 🟢 NEW: Exam me baccha absent tha ya present
        },
        marksObtained: { type: Number, default: 0 }, // Agar absent hai toh 0
        rank: { type: Number, default: 0 }, 
        remarks: { type: String, default: "" }
    }],
    status: {
        type: String,
        enum: ['Draft', 'Published'],
        default: 'Published' // 🟢 NEW: Future me agar marks hide karne ho result date tak
    }
}, { timestamps: true }); // 🟢 NEW: Ye automatically createdAt aur updatedAt handle karega

// 🟢 NEW: Prevent duplicate uploads for the same class and exam
markSchema.index({ course: 1, sessionBatch: 1, semester: 1, subject: 1, examName: 1 }, { unique: true });

module.exports = mongoose.model('Mark', markSchema);
