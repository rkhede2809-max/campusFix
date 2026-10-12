const crypto = require('crypto');
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentId: {
    type: String,
    unique: true,
    default: () => crypto.randomUUID()
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE',
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  }
});

assignmentSchema.index({ complaintId: 1, status: 1 });
assignmentSchema.index({ assignedTo: 1, status: 1 });
assignmentSchema.index(
  { complaintId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
