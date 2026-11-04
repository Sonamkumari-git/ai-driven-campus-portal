const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    date: { type: String, required: true },
    semester: { 
        type: String, 
        required: true,
        enum: ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6'] 
    },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true }, 
    cloudinaryId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
