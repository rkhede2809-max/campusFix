const express = require('express');
const mongoose = require('mongoose');
const { Complaint, CATEGORIES, STATUSES } = require('../models/Complaint');
const Assignment = require('../models/Assignment');
const ComplaintHistory = require('../models/ComplaintHistory');
const Feedback = require('../models/Feedback');
const Department = require('../models/Department');
const { User } = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function validId(id) {
  return mongoose.isValidObjectId(id);
}

async function complaintAccessQuery(user) {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'STAFF') {
    const ids = await Assignment.distinct('complaintId', { assignedTo: user._id, status: 'ACTIVE' });
    return { _id: { $in: ids } };
  }
  return { reportedBy: user._id };
}

async function getCurrentAssignment(complaintId) {
  let assignment = await Assignment.findOne({ complaintId, status: 'ACTIVE' })
    .populate('assignedTo', 'name email role')
    .populate('assignedBy', 'name email role')
    .lean();
  if (!assignment) {
    assignment = await Assignment.findOne({ complaintId })
      .sort({ assignedAt: -1 })
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email role')
      .lean();
  }
  return assignment;
}

async function getComplaintDetails(complaint, user) {
  if (complaint.populate) {
    await complaint.populate([
      { path: 'departmentId', select: 'name' },
      { path: 'reportedBy', select: 'name role' }
    ]);
  }
  const [currentAssignment, assignments, history, feedback] = await Promise.all([
    getCurrentAssignment(complaint._id),
    Assignment.find({ complaintId: complaint._id })
      .sort({ assignedAt: -1 })
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name role')
      .lean(),
    ComplaintHistory.find({ complaintId: complaint._id })
      .sort({ changedAt: -1 })
      .populate('changedBy', 'name role')
      .lean(),
    Feedback.findOne({ complaintId: complaint._id })
      .populate('userId', 'name')
      .lean()
  ]);
  const details = complaint.toObject ? complaint.toObject() : complaint;
  if (feedback && user.role !== 'ADMIN' && !complaint.reportedBy?.equals(user._id)) {
    delete feedback.comment;
  }
  return { ...details, currentAssignment, assignments, history, feedback };
}

router.get('/', async (req, res, next) => {
  try {
    const query = await complaintAccessQuery(req.user);
    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate('departmentId', 'name')
      .populate('reportedBy', 'name role')
      .lean();
    const results = await Promise.all(complaints.map(async (complaint) => ({
      ...complaint,
      currentAssignment: await getCurrentAssignment(complaint._id)
    })));
    return res.json(results);
  } catch (error) { return next(error); }
});

router.post('/', allowRoles('STUDENT', 'FACULTY'), async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';
    if (title.length < 3 || title.length > 120) return res.status(400).json({ message: 'Title must be between 3 and 120 characters.' });
    if (description.length < 10 || description.length > 1000) return res.status(400).json({ message: 'Description must be between 10 and 1000 characters.' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: `Category must be one of: ${CATEGORIES.join(', ')}.` });
    if (location.length < 2 || location.length > 120) return res.status(400).json({ message: 'Location must be between 2 and 120 characters.' });
    if (req.body.departmentId && (!validId(req.body.departmentId) || !(await Department.exists({ _id: req.body.departmentId })))) {
      return res.status(400).json({ message: 'Select a valid department.' });
    }
    const complaint = await Complaint.create({
      title,
      description,
      category,
      location,
      departmentId: req.body.departmentId || null,
      reportedBy: req.user._id
    });
    await ComplaintHistory.create({
      complaintId: complaint._id,
      changedBy: req.user._id,
      oldStatus: null,
      newStatus: complaint.status,
      comment: 'Complaint submitted'
    });
    return res.status(201).json(await getComplaintDetails(complaint, req.user));
  } catch (error) { return next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findById(req.params.id)
      .populate('departmentId', 'name')
      .populate('reportedBy', 'name role');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    const query = await complaintAccessQuery(req.user);
    if (!(await Complaint.exists({ $and: [{ _id: complaint._id }, query] }))) return res.status(403).json({ message: 'You cannot view this complaint.' });
    return res.json(await getComplaintDetails(complaint, req.user));
  } catch (error) { return next(error); }
});

router.patch('/:id', allowRoles('ADMIN'), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    const { title, description, category, location, departmentId, priority } = req.body;
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) return res.status(400).json({ message: 'Title must be between 3 and 120 characters.' });
      complaint.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 10 || description.trim().length > 1000) return res.status(400).json({ message: 'Description must be between 10 and 1000 characters.' });
      complaint.description = description.trim();
    }
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Category is not valid.' });
      complaint.category = category;
    }
    if (location !== undefined) {
      if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 120) return res.status(400).json({ message: 'Location must be between 2 and 120 characters.' });
      complaint.location = location.trim();
    }
    if (departmentId !== undefined) {
      if (departmentId && (!validId(departmentId) || !(await Department.exists({ _id: departmentId })))) return res.status(400).json({ message: 'Select a valid department.' });
      complaint.departmentId = departmentId || null;
    }
    if (priority !== undefined) {
      if (!['Low', 'Medium', 'High'].includes(priority)) return res.status(400).json({ message: 'Priority must be Low, Medium, or High.' });
      complaint.priority = priority;
    }
    await complaint.save();
    return res.json(await getComplaintDetails(complaint, req.user));
  } catch (error) { return next(error); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be Pending, In Progress, or Resolved.' });
    if (comment.length > 1000) return res.status(400).json({ message: 'Comment cannot exceed 1000 characters.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (req.user.role !== 'ADMIN') {
      if (req.user.role !== 'STAFF' || !(await Assignment.exists({ complaintId: complaint._id, assignedTo: req.user._id, status: 'ACTIVE' }))) {
        return res.status(403).json({ message: 'Only an assigned staff member or administrator can update this complaint.' });
      }
    }
    if (complaint.status === status) {
      if (comment) {
        await ComplaintHistory.create({ complaintId: complaint._id, changedBy: req.user._id, oldStatus: status, newStatus: status, comment });
      }
      return res.json(await getComplaintDetails(complaint, req.user));
    }
    const oldStatus = complaint.status;
    const activeAssignment = await Assignment.findOne({ complaintId: complaint._id, status: 'ACTIVE' }).select('assignedTo');
    complaint.status = status;
    await complaint.save();
    await ComplaintHistory.create({ complaintId: complaint._id, changedBy: req.user._id, oldStatus, newStatus: status, comment });
    if (status === 'Resolved') {
      await Assignment.updateMany(
        { complaintId: complaint._id, status: 'ACTIVE' },
        { $set: { status: 'COMPLETED' } }
      );
    }
    if (complaint.reportedBy) {
      await Notification.create({
        userId: complaint.reportedBy,
        complaintId: complaint._id,
        type: status === 'Resolved' ? 'RESOLVED' : 'STATUS_CHANGED',
        message: `Your complaint "${complaint.title}" is now ${status}.`
      });
    }
    if (activeAssignment?.assignedTo && (!complaint.reportedBy || !activeAssignment.assignedTo.equals(complaint.reportedBy))) {
      await Notification.create({
        userId: activeAssignment.assignedTo,
        complaintId: complaint._id,
        type: status === 'Resolved' ? 'RESOLVED' : 'STATUS_CHANGED',
        message: `The status of "${complaint.title}" changed to ${status}.`
      });
    }
    return res.json(await getComplaintDetails(complaint, req.user));
  } catch (error) { return next(error); }
});

router.post('/:id/assignments', allowRoles('ADMIN'), async (req, res, next) => {
  try {
    if (!validId(req.params.id) || !validId(req.body.assignedTo)) return res.status(400).json({ message: 'Valid complaint and staff IDs are required.' });
    const [complaint, staff] = await Promise.all([
      Complaint.findById(req.params.id),
      User.findOne({ _id: req.body.assignedTo, role: 'STAFF' })
    ]);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (!staff) return res.status(400).json({ message: 'The selected user is not an existing staff member.' });
    if (complaint.status === 'Resolved') return res.status(409).json({ message: 'Resolved complaints cannot be assigned.' });
    if (complaint.departmentId && !staff.departmentId?.equals(complaint.departmentId)) {
      return res.status(400).json({ message: 'Assign this complaint to staff in the complaint’s department.' });
    }
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';
    if (notes.length > 1000) return res.status(400).json({ message: 'Assignment notes cannot exceed 1000 characters.' });
    await Assignment.updateMany(
      { complaintId: complaint._id, status: 'ACTIVE' },
      { $set: { status: 'CANCELLED' } }
    );
    const assignment = await Assignment.create({
      complaintId: complaint._id,
      assignedTo: staff._id,
      assignedBy: req.user._id,
      notes
    });
    await Notification.create({
      userId: staff._id,
      complaintId: complaint._id,
      type: 'ASSIGNED',
      message: `You were assigned "${complaint.title}".`
    });
    if (complaint.reportedBy) {
      await Notification.create({
        userId: complaint.reportedBy,
        complaintId: complaint._id,
        type: 'ASSIGNED',
        message: `A staff member was assigned to "${complaint.title}".`
      });
    }
    return res.status(201).json(await assignment.populate([
      { path: 'assignedTo', select: 'name email role' },
      { path: 'assignedBy', select: 'name email role' }
    ]));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This complaint was assigned by another administrator. Refresh and try again.' });
    return next(error);
  }
});

router.get('/:id/history', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    const query = await complaintAccessQuery(req.user);
    if (!(await Complaint.exists({ $and: [{ _id: complaint._id }, query] }))) return res.status(403).json({ message: 'You cannot view this complaint.' });
    return res.json(await ComplaintHistory.find({ complaintId: complaint._id })
      .sort({ changedAt: -1 }).populate('changedBy', 'name role'));
  } catch (error) { return next(error); }
});

router.post('/:id/feedback', allowRoles('STUDENT', 'FACULTY'), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (!complaint.reportedBy?.equals(req.user._id)) return res.status(403).json({ message: 'Only the original reporter can submit feedback.' });
    if (complaint.status !== 'Resolved') return res.status(409).json({ message: 'Feedback is available after the complaint is resolved.' });
    const rating = Number(req.body.rating);
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be a whole number from 1 to 5.' });
    if (comment.length > 1000) return res.status(400).json({ message: 'Feedback cannot exceed 1000 characters.' });
    const feedback = await Feedback.create({ complaintId: complaint._id, userId: req.user._id, rating, comment });
    return res.status(201).json(feedback);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Feedback has already been submitted for this complaint.' });
    return next(error);
  }
});

router.get('/:id/feedback', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    if (req.user.role !== 'ADMIN' && !complaint.reportedBy?.equals(req.user._id)) return res.status(403).json({ message: 'Only the reporter or an administrator can view feedback.' });
    const query = await complaintAccessQuery(req.user);
    if (!(await Complaint.exists({ $and: [{ _id: complaint._id }, query] }))) return res.status(403).json({ message: 'You cannot view this complaint.' });
    const feedback = await Feedback.findOne({ complaintId: complaint._id }).populate('userId', 'name');
    return res.json(feedback);
  } catch (error) { return next(error); }
});

router.delete('/:id', allowRoles('ADMIN'), async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid complaint ID.' });
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
    await Promise.all([
      Assignment.deleteMany({ complaintId: complaint._id }),
      ComplaintHistory.deleteMany({ complaintId: complaint._id }),
      Feedback.deleteMany({ complaintId: complaint._id }),
      Notification.deleteMany({ complaintId: complaint._id })
    ]);
    return res.json({ message: 'Complaint and related records deleted.', id: req.params.id });
  } catch (error) { return next(error); }
});

module.exports = router;
