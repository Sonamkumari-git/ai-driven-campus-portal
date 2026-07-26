// Mongoose Schema for Teacher Attendance
const teacherAttendanceSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Staff', 
        required: true 
    },
    teacherName: { 
        type: String, 
        required: true 
    },
    dateStr: { 
        type: String, 
        required: true 
        // Format: "YYYY-MM-DD" (e.g., "2026-03-31") Taaki specific day dhoondhna aasan ho
    },
    monthVal: { 
        type: String, 
        required: true 
        // Format: "YYYY-MM" (e.g., "2026-03") Taaki drop-down se pura mahina filter ho sake
    },
    dayName: { 
        type: String 
        // Format: "Monday", "Tuesday", etc.
    },
    punchIn: { 
        type: String, 
        default: "" 
        // Aane ka time (e.g., "09:15 AM")
    },
    punchOut: { 
        type: String, 
        default: "" 
        // Jaane ka time (e.g., "04:30 PM")
    },
    status: { 
        type: String, 
        default: "Present",
        enum: ["Present", "Absent", "Leave", "Half Day"]
    },
    remarks: { 
        type: String, 
        default: "On Time" 
    }
}, { timestamps: true });

// Ek teacher ek din mein sirf ek hi attendance record bana sake, isliye index laga diya
teacherAttendanceSchema.index({ teacherId: 1, dateStr: 1 }, { unique: true });

const TeacherAttendance = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
