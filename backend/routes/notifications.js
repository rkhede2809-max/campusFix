const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('complaintId', 'title status');
    return res.json({
      notifications,
      unreadCount: await Notification.countDocuments({ userId: req.user._id, isRead: false })
    });
  } catch (error) { return next(error); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID.' });
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    return res.json(notification);
  } catch (error) { return next(error); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
    return res.json({ message: 'Notifications marked as read.' });
  } catch (error) { return next(error); }
});

module.exports = router;
