const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    // --- 📅 Date Details (Taki app me filtering aasan ho) ---
    fullDate: { 
        type: Date, 
        required: true 
    },
    day: { 
        type: Number, 
        required: true // e.g., 30
    },
    month: { 
        type: String, 
        required: true // e.g., "March" or "03"
    },
    year: { 
        type: Number, 
        required: true // e.g., 2026
    },

    // --- 🎓 Academic Details ---
    batch: {
        type: String,
        required: true // e.g., "2023-2026"
    },
    course: {
        type: String,
        required: true // e.g., "BCA"
    },
    semester: { 
        type: String, 
        required: true // e.g., "Sem 1"
    },
    section: { 
        type: String, 
        required: true // e.g., "A"
    },
    subject: { 
        type: String, 
        required: true // e.g., "C Programming"
    },

    // --- ⏰ Timing Details ---
    startTime: { 
        type: String, 
        required: true 
    },
    endTime: { 
        type: String, 
        required: true 
    },

    // --- 👨‍🏫 Teacher Reference ---
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Teacher', 
        required: true 
    },

    // --- 👨‍🎓 Students Record Array ---
    records: [{
        studentId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Student', 
            required: true 
        },
        rollNumber: {
            type: String,
            required: true
        },
        studentName: { // Name add kar diya
            type: String,
            required: true
        },
        status: { 
            type: String, 
            enum: ['P', 'A'], 
            required: true 
        }
    }],

    // --- 📊 Class Summary (Teacher Dashboard ke liye) ---
    summary: {
        totalStudents: { type: Number, required: true },
        presentCount: { type: Number, required: true },
        absentCount: { type: Number, required: true },
        attendancePercentage: { type: Number, required: true }
    }
}, { timestamps: true });

// 🚀 Database Indexing (Performance boost ke liye)
// Isse app me individual student ka record fast fetch hoga
attendanceSchema.index({ 'records.studentId': 1, subject: 1, fullDate: 1 });
attendanceSchema.index({ batch: 1, course: 1, semester: 1, fullDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
