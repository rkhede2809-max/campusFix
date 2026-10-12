const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const complaintRoutes = require('./routes/complaints');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    'Missing MONGODB_URI. Copy backend/.env.example to backend/.env and add your MongoDB Atlas connection string.'
  );
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

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled server error:', error.message);
  res.status(500).json({ message: 'Unexpected server error. Please try again.' });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    app.listen(PORT, () => {
      console.log(`CampusFix API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      'Could not connect to MongoDB. Check MONGODB_URI, database username/password, and Atlas Network Access (allow your IP).'
    );
    console.error(error.message);
    process.exit(1);
  }
}

start();
