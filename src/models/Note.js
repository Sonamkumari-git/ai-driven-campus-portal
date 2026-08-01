const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  date: { type: String, required: true },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  cloudinaryId: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
