const express = require('express');
const mongoose = require('mongoose');
const { Complaint, CATEGORIES, STATUSES } = require('../models/Complaint');

const router = express.Router();

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function validationMessage(error) {
  if (error.name === 'ValidationError') {
    return Object.values(error.errors)
      .map((item) => item.message)
      .join('. ');
  }
  return 'Something went wrong. Please try again.';
}

router.get('/', async (_req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    console.error('GET /api/complaints failed:', error.message);
    res.status(500).json({
      message: 'Could not load complaints. Please check the server and try again.'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description =
      typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    const location =
      typeof req.body.location === 'string' ? req.body.location.trim() : '';

    const errors = [];
    if (!title) errors.push('Title is required');
    if (!description) errors.push('Description is required');
    if (!category) errors.push('Category is required');
    if (category && !CATEGORIES.includes(category)) {
      errors.push(`Category must be one of: ${CATEGORIES.join(', ')}`);
    }
    if (!location) errors.push('Campus location is required');

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join('. ') });
    }

    const complaint = await Complaint.create({
      title,
      description,
      category,
      location
    });

    res.status(201).json(complaint);
  } catch (error) {
    console.error('POST /api/complaints failed:', error.message);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: validationMessage(error)
    });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        message: 'Status must be Pending, In Progress, or Resolved.'
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('PATCH /api/complaints/:id/status failed:', error.message);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: validationMessage(error)
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    const complaint = await Complaint.findByIdAndDelete(id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json({ message: 'Complaint deleted successfully.', id });
  } catch (error) {
    console.error('DELETE /api/complaints/:id failed:', error.message);
    res.status(500).json({
      message: 'Could not delete the complaint. Please try again.'
    });
  }
});

module.exports = router;
