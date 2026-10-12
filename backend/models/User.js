const crypto = require('crypto');
const mongoose = require('mongoose');

const ROLES = ['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'];

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    default: () => crypto.randomUUID()
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ROLES,
    default: 'STUDENT',
    required: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = { User: mongoose.model('User', userSchema), ROLES };
