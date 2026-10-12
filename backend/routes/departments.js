const express = require('express');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint').Complaint;
const User = require('../models/User').User;
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
const admin = [authenticate, allowRoles('ADMIN')];

router.get('/', authenticate, async (_req, res, next) => {
  try {
    return res.json(await Department.find().sort({ name: 1 }));
  } catch (error) { return next(error); }
});

router.post('/', ...admin, async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const contactEmail = typeof req.body.contactEmail === 'string' ? req.body.contactEmail.trim().toLowerCase() : '';
    if (name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Department name must be between 2 and 100 characters.' });
    if (description.length > 500) return res.status(400).json({ message: 'Description cannot exceed 500 characters.' });
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ message: 'Enter a valid contact email.' });
    const department = await Department.create({ name, description, contactEmail });
    return res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A department with this name already exists.' });
    return next(error);
  }
});

router.patch('/:id', ...admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid department ID.' });
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    const { name, description, contactEmail } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ message: 'Department name must be between 2 and 100 characters.' });
      department.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length > 500) return res.status(400).json({ message: 'Description cannot exceed 500 characters.' });
      department.description = description.trim();
    }
    if (contactEmail !== undefined) {
      if (typeof contactEmail !== 'string' || (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))) return res.status(400).json({ message: 'Enter a valid contact email.' });
      department.contactEmail = contactEmail.trim().toLowerCase();
    }
    await department.save();
    return res.json(department);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A department with this name already exists.' });
    return next(error);
  }
});

router.delete('/:id', ...admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid department ID.' });
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    const [complaint, user] = await Promise.all([
      Complaint.exists({ departmentId: department._id }),
      User.exists({ departmentId: department._id })
    ]);
    if (complaint || user) return res.status(409).json({ message: 'Department is still referenced by complaints or users. Reassign those records before deleting it.' });
    await department.deleteOne();
    return res.json({ message: 'Department deleted.' });
  } catch (error) { return next(error); }
});

module.exports = router;
