const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
    course: { type: String, required: true }, // e.g., BCA, BBA
    semester: { type: String, required: true }, // e.g., 1st, 2nd
    section: { type: String, required: true }, // 🔥 Naya Section field add kiya (e.g., A, B)
    subject: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    teacherName: { type: String, required: true }, // 🔥 Naya Teacher Name field add kiya gaya
    date: { type: String, required: true }, 
    dayOfWeek: { type: String, required: true }, 
    startTime: { type: String, required: true }, 
    endTime: { type: String, required: true },   
    roomNumber: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('Routine', routineSchema);
