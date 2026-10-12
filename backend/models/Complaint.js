const mongoose = require('mongoose');

const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Cleanliness',
  'Furniture',
  'Internet',
  'Other'
];

const STATUSES = ['Pending', 'In Progress', 'Resolved'];

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [120, 'Title cannot be longer than 120 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [1000, 'Description cannot be longer than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: CATEGORIES,
      message: 'Category is not valid'
    }
  },
  location: {
    type: String,
    required: [true, 'Campus location is required'],
    trim: true,
    minlength: [2, 'Location must be at least 2 characters'],
    maxlength: [120, 'Location cannot be longer than 120 characters']
  },
  status: {
    type: String,
    enum: {
      values: STATUSES,
      message: 'Status must be Pending, In Progress, or Resolved'
    },
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = {
  Complaint,
  CATEGORIES,
  STATUSES
};
