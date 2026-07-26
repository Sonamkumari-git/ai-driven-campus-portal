const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { uploads, localFileUrl } = require('../middleware/upload');
const { asyncHandler } = require('../middleware/asyncHandler');
const { cloudinary, hasCloudinary } = require('../config/cloudinary');

router.post('/notes', uploads.note.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'File is required.' });
  const note = await Note.create({
    date: req.body.date || new Date().toISOString().slice(0, 10),
    semester: req.body.semester,
    subject: req.body.subject,
    title: req.body.title,
    fileUrl: localFileUrl(req, req.file, 'ZhiNotes'),
    cloudinaryId: req.file.filename || req.file.public_id || ''
  });
  res.status(201).json({ success: true, message: 'Note uploaded successfully!', data: note });
}));

router.get('/notes', asyncHandler(async (req, res) => {
  const { semester, subject } = req.query;
  const filter = {};
  if (semester) filter.semester = new RegExp(`^${semester}$`, 'i');
  if (subject) filter.subject = new RegExp(`^${subject}$`, 'i');
  const notes = await Note.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: notes });
}));

router.delete('/notes/:id', asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found!' });
  if (hasCloudinary && note.cloudinaryId) await cloudinary.uploader.destroy(note.cloudinaryId).catch(() => {});
  await Note.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Note deleted permanently!' });
}));

module.exports = router;
