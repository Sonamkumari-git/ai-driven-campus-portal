const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');
const { asyncHandler } = require('../middleware/asyncHandler');

router.post('/routines', asyncHandler(async (req, res) => {
  const routine = await Routine.create(req.body);
  res.status(201).json({ success: true, message: 'Routine added successfully!', data: routine });
}));

router.get('/routines', asyncHandler(async (req, res) => {
  const { course, semester, teacherId, dayOfWeek } = req.query;
  const filter = {};
  if (course) filter.course = new RegExp(`^${course}$`, 'i');
  if (semester) filter.semester = semester;
  if (teacherId) filter.teacherId = teacherId;
  if (dayOfWeek) filter.dayOfWeek = new RegExp(`^${dayOfWeek}$`, 'i');
  const routines = await Routine.find(filter).populate('teacherId', 'name empId dept').sort({ dayOfWeek: 1, startTime: 1 });
  res.json({ success: true, data: routines });
}));

router.put('/routines/:id', asyncHandler(async (req, res) => {
  const routine = await Routine.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
  if (!routine) return res.status(404).json({ success: false, message: 'Routine not found!' });
  res.json({ success: true, message: 'Routine updated successfully!', data: routine });
}));

router.delete('/routines/:id', asyncHandler(async (req, res) => {
  const routine = await Routine.findByIdAndDelete(req.params.id);
  if (!routine) return res.status(404).json({ success: false, message: 'Routine not found!' });
  res.json({ success: true, message: 'Routine deleted permanently!' });
}));

module.exports = router;
