const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const { Complaint } = require('./models/Complaint');

const sampleComplaints = [
  {
    title: 'Broken ceiling fan in Room 204',
    description:
      'The ceiling fan in classroom 204 makes a loud noise and stops rotating after a few minutes.',
    category: 'Electrical',
    location: 'Block A, Room 204',
    status: 'Pending'
  },
  {
    title: 'Water leakage near washroom',
    description:
      'Water is leaking from the tap area near the first-floor washroom and making the floor slippery.',
    category: 'Plumbing',
    location: 'Block B, First Floor Washroom',
    status: 'In Progress'
  },
  {
    title: 'Classroom not cleaned after lab',
    description:
      'Lab 3 was not cleaned after the afternoon session. Dust and paper waste are still on the desks.',
    category: 'Cleanliness',
    location: 'Science Block, Lab 3',
    status: 'Pending'
  },
  {
    title: 'Damaged wooden desk',
    description:
      'One student desk has a broken leg and is unsafe to sit on during lectures.',
    category: 'Furniture',
    location: 'Library Hall, Table 12',
    status: 'Resolved'
  },
  {
    title: 'Wi-Fi not working in hostel wing',
    description:
      'Students in Hostel Wing C cannot connect to campus Wi-Fi during evening study hours.',
    category: 'Internet',
    location: 'Hostel Wing C, Floor 2',
    status: 'In Progress'
  }
];

async function seed() {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    console.error(
      'Missing MONGODB_URI. Copy backend/.env.example to backend/.env before running the seed script.'
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongodbUri);
    const existingCount = await Complaint.countDocuments();

    if (existingCount > 0) {
      console.log(
        `Seed skipped. Database already has ${existingCount} complaint(s). Delete them first if you want a fresh demo set.`
      );
      await mongoose.disconnect();
      process.exit(0);
    }

    await Complaint.insertMany(sampleComplaints);
    console.log(`Inserted ${sampleComplaints.length} sample complaints.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed. Check your MongoDB Atlas connection string and network access.');
    console.error(error.message);
    process.exit(1);
  }
}

seed();
