const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const complaintRoutes = require('./routes/complaints');
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const { User } = require('./models/User');
const crypto = require('crypto');
const { promisify } = require('util');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const scrypt = promisify(crypto.scrypt);

if (!MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error(
    'MONGODB_URI and a JWT_SECRET of at least 32 characters are required. Configure backend/.env using backend/.env.example.'
  );
  process.exit(1);
}

if (!!process.env.BOOTSTRAP_ADMIN_EMAIL !== !!process.env.BOOTSTRAP_ADMIN_PASSWORD) {
  console.error('Set both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to bootstrap an administrator, or leave both empty.');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : 'not connected';

  res.json({
    status: 'ok',
    message: 'CampusFix API is running',
    database: dbStatus
  });
});

app.use('/api/complaints', complaintRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled server error:', error.message);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }
  res.status(500).json({ message: 'Unexpected server error. Please try again.' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    if (process.env.BOOTSTRAP_ADMIN_EMAIL && process.env.BOOTSTRAP_ADMIN_PASSWORD) {
      const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
      const existingUser = await User.findOne({ email }).select('role');
      if (existingUser && existingUser.role !== 'ADMIN') {
        throw new Error('BOOTSTRAP_ADMIN_EMAIL already belongs to a non-administrator account.');
      }
      if (!existingUser) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 10) {
          throw new Error('BOOTSTRAP_ADMIN_EMAIL must be valid and BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters.');
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = (await scrypt(process.env.BOOTSTRAP_ADMIN_PASSWORD, salt, 64)).toString('hex');
        await User.create({
          name: process.env.BOOTSTRAP_ADMIN_NAME || 'CampusFix Administrator',
          email,
          role: 'ADMIN',
          passwordHash: `${salt}:${hash}`
        });
        console.log(`Created initial administrator account for ${email}`);
      }
    }

    app.listen(PORT, () => {
      console.log(`CampusFix API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not start CampusFix. Check MongoDB configuration and bootstrap administrator settings.');
    if (error.message && error.message.toLowerCase().includes('option is not supported')) {
      console.error('MongoDB rejected a connection-string option. Use the URI from Atlas > Connect > Drivers; remove legacy options such as useNewUrlParser and useUnifiedTopology.');
    }
    console.error(`Startup error (${error.name || 'Error'}): ${error.message}`);
    process.exit(1);
  }
}

start();
