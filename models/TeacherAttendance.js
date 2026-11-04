
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
       
    },
    monthVal: { 
        type: String, 
        required: true 
        
    },
    dayName: { 
        type: String 
       
    },
    punchIn: { 
        type: String, 
        default: "" 
      
    },
    punchOut: { 
        type: String, 
        default: "" 
       
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
