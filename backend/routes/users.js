const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const mongoose = require('mongoose');
const { User, ROLES } = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint').Complaint;
const Assignment = require('../models/Assignment');
const ComplaintHistory = require('../models/ComplaintHistory');
const Notification = require('../models/Notification');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);
const admin = [authenticate, allowRoles('ADMIN')];

function safeUser(user) {
  return {
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    createdAt: user.createdAt
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}`;
}

router.get('/', ...admin, async (_req, res, next) => {
  try {
    const users = await User.find().sort({ name: 1 });
    return res.json(users.map(safeUser));
  } catch (error) { return next(error); }
});

router.get('/staff', authenticate, allowRoles('ADMIN'), async (_req, res, next) => {
  try {
    const staff = await User.find({ role: 'STAFF' }).sort({ name: 1 });
    return res.json(staff.map(safeUser));
  } catch (error) { return next(error); }
});

router.post('/', ...admin, async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (cleanName.length < 2 || cleanName.length > 100) return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 10 || password.length > 128) return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
    if (!ROLES.includes(role)) return res.status(400).json({ message: 'Role is not valid.' });
    let department = null;
    if (departmentId) {
      if (!mongoose.isValidObjectId(departmentId)) return res.status(400).json({ message: 'Invalid department ID.' });
      department = await Department.findById(departmentId);
      if (!department) return res.status(400).json({ message: 'Department not found.' });
    }
    const user = await User.create({ name: cleanName, email: cleanEmail, role, departmentId: department?._id || null, passwordHash: await hashPassword(password) });
    return res.status(201).json(safeUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.patch('/:id', ...admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user ID.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.id === req.user.id && req.body.role && req.body.role !== 'ADMIN') return res.status(409).json({ message: 'You cannot remove your own administrator access.' });
    const { name, email, role, departmentId, password } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
      user.name = name.trim();
    }
    if (email !== undefined) {
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
      user.email = cleanEmail;
    }
    if (role !== undefined) {
      if (!ROLES.includes(role)) return res.status(400).json({ message: 'Role is not valid.' });
      if (user.role === 'STAFF' && role !== 'STAFF' && await Assignment.exists({ assignedTo: user._id, status: 'ACTIVE' })) {
        return res.status(409).json({ message: 'Reassign this staff member’s active complaints before changing their role.' });
      }
      user.role = role;
    }
    if (departmentId !== undefined) {
      if (departmentId && !mongoose.isValidObjectId(departmentId)) return res.status(400).json({ message: 'Invalid department ID.' });
      if (departmentId && !(await Department.exists({ _id: departmentId }))) return res.status(400).json({ message: 'Department not found.' });
      user.departmentId = departmentId || null;
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 10 || password.length > 128) return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
      user.passwordHash = await hashPassword(password);
    }
    await user.save();
    return res.json(safeUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.delete('/:id', ...admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user ID.' });
    if (req.params.id === req.user.id) return res.status(409).json({ message: 'You cannot delete your own account.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const [reported, assignments, notifications, history] = await Promise.all([
      Complaint.exists({ reportedBy: user._id }),
      Assignment.exists({ $or: [{ assignedTo: user._id }, { assignedBy: user._id }] }),
      Notification.exists({ userId: user._id }),
      ComplaintHistory.exists({ changedBy: user._id })
    ]);
    if (reported || assignments || notifications || history) return res.status(409).json({ message: 'This user is referenced by complaint records. Deactivate or update related records before deletion.' });
    await user.deleteOne();
    return res.json({ message: 'User deleted.' });
  } catch (error) { return next(error); }
});

module.exports = router;
