const crypto = require('crypto');
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  historyId: {
    type: String,
    unique: true,
    default: () => crypto.randomUUID()
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true,
    index: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  oldStatus: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: null
  },
  newStatus: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  }
});

historySchema.index({ complaintId:  1, changedAt: 1 });

module.exports = mongoose.model('ComplaintHistory', historySchema);
