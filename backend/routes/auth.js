const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const { User } = require('../models/User');
const { authenticate, signToken } = require('../middleware/auth');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function passwordMatches(password, encoded) {
  const [salt, hash] = encoded.split(':');
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function publicUser(user) {
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

router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = typeof req.body.role === 'string' ? req.body.role : 'STUDENT';
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: 'Name must be between 2 and 100 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 10 and 128 characters.' });
    }
    if (!['STUDENT', 'FACULTY'].includes(role)) {
      return res.status(400).json({ message: 'Public registration is limited to STUDENT and FACULTY accounts.' });
    }
    const user = await User.create({ name, email, role, passwordHash: await hashPassword(password) });
    return res.status(201).json({ user: publicUser(user), token: signToken(user.id) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await passwordMatches(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({ user: publicUser(user), token: signToken(user.id) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
