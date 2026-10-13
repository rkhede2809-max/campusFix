const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const scrypt = promisify(crypto.scrypt);
const password = 'CampusFix-Test-Password-2026!';
const users = {};
const complaints = {};
let mongo;
let server;
let baseUrl;
let app;

async function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(value, salt, 64)).toString('hex')}`;
}

async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
}

async function signIn(email, role) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  assert.equal(response.status, 200, `${role} should be able to log in`);
  assert.equal(response.body.user.role, role);
  const account = users[role.toLowerCase()] || (users[role.toLowerCase()] = {});
  account.token = response.body.token;
  account.id = response.body.user._id;
  return response.body;
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('campusfix_test');
  if (!uri.includes('127.0.0.1') && !uri.includes('localhost')) {
    throw new Error('Refusing to run integration tests against a non-local MongoDB URI.');
  }
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'integration-test-secret-that-is-at-least-32-characters';
  app = require('../server').app;
  await mongoose.connect(uri);
  const admin = await mongoose.model('User').create({
    name: 'Test Administrator',
    email: 'admin@campusfix.test',
    role: 'ADMIN',
    passwordHash: await hashPassword(password)
  });
  users.admin = { id: admin.id };
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('CampusFix role-based end-to-end workflows', async (t) => {
  const adminLogin = await signIn('admin@campusfix.test', 'ADMIN');
  const adminToken = adminLogin.token;

  await t.test('Student: register, log in, submit complaints, and enforce ownership', async () => {
    const registration = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Student',
        email: 'student@campusfix.test',
        password,
        role: 'STUDENT'
      }
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.body.user.role, 'STUDENT');
    assert.equal('passwordHash' in registration.body.user, false);
    await signIn('student@campusfix.test', 'STUDENT');

    const submitted = await request('/complaints', {
      token: users.student.token,
      method: 'POST',
      body: {
        title: 'Broken library fan',
        description: 'The fan in the library reading room does not work.',
        category: 'Electrical',
        location: 'Library, Room 12'
      }
    });
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.status, 'Pending');
    assert.equal(submitted.body.reportedBy._id, users.student.id);
    complaints.student = submitted.body._id;

    const unassigned = await request('/complaints', {
      token: users.student.token,
      method: 'POST',
      body: {
        title: 'Broken classroom chair',
        description: 'A chair in the classroom is broken and unsafe to use.',
        category: 'Furniture',
        location: 'Block B, Room 5'
      }
    });
    assert.equal(unassigned.status, 201);
    complaints.unassigned = unassigned.body._id;

    const ownComplaints = await request('/complaints', { token: users.student.token });
    assert.equal(ownComplaints.status, 200);
    assert.equal(ownComplaints.body.length, 2);
    assert.equal((await request(`/complaints/${complaints.unassigned}`, { token: users.student.token })).status, 200);
    assert.equal((await request(`/complaints/${complaints.student}/status`, {
      token: users.student.token,
      method: 'PATCH',
      body: { status: 'In Progress' }
    })).status, 403);
    assert.equal((await request('/users', { token: users.student.token })).status, 403);
    assert.equal((await request('/auth/register', {
      method: 'POST',
      body: { name: 'Test Staff', email: 'public-staff@campusfix.test', password, role: 'STAFF' }
    })).status, 400);
  });

  await t.test('Faculty: register, log in, submit complaints, and enforce ownership', async () => {
    const registration = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test Faculty',
        email: 'faculty@campusfix.test',
        password,
        role: 'FACULTY'
      }
    });
    assert.equal(registration.status, 201);
    await signIn('faculty@campusfix.test', 'FACULTY');

    const submitted = await request('/complaints', {
      token: users.faculty.token,
      method: 'POST',
      body: {
        title: 'Lecture hall projector',
        description: 'The projector in the main lecture hall will not turn on.',
        category: 'Other',
        location: 'Main Hall'
      }
    });
    assert.equal(submitted.status, 201);
    complaints.faculty = submitted.body._id;
    assert.equal((await request('/complaints', { token: users.faculty.token })).body.length, 1);
    assert.equal((await request(`/complaints/${complaints.student}`, { token: users.faculty.token })).status, 403);
    assert.equal((await request('/users/staff', { token: users.faculty.token })).status, 403);
  });

  await t.test('Admin: manage accounts, view all reports, assign staff, and update status', async () => {
    const currentUser = await request('/auth/me', { token: adminToken });
    assert.equal(currentUser.status, 200);
    assert.equal(currentUser.body.user.role, 'ADMIN');

    const department = await request('/departments', {
      token: adminToken,
      method: 'POST',
      body: { name: 'Facilities', description: 'Campus maintenance', contactEmail: 'facilities@campusfix.test' }
    });
    assert.equal(department.status, 201);
    users.departmentId = department.body._id;

    const staff = await request('/users', {
      token: adminToken,
      method: 'POST',
      body: {
        name: 'Test Staff',
        email: 'staff@campusfix.test',
        password,
        role: 'STAFF',
        departmentId: users.departmentId
      }
    });
    assert.equal(staff.status, 201);
    assert.equal(staff.body.role, 'STAFF');
    assert.equal('passwordHash' in staff.body, false);
    await signIn('staff@campusfix.test', 'STAFF');
    assert.equal((await request('/users', { token: adminToken })).status, 200);
    assert.equal((await request('/users/staff', { token: adminToken })).body.length, 1);
    assert.equal((await request('/complaints', { token: adminToken })).body.length, 3);

    for (const complaintId of [complaints.student, complaints.faculty]) {
      const assignment = await request(`/complaints/${complaintId}/assignments`, {
        token: adminToken,
        method: 'POST',
        body: { assignedTo: users.staff.id, notes: 'Please investigate.' }
      });
      assert.equal(assignment.status, 201);
      assert.equal(assignment.body.assignedTo._id, users.staff.id);
    }
    assert.equal((await request(`/complaints/${complaints.unassigned}/assignments`, {
      token: users.student.token,
      method: 'POST',
      body: { assignedTo: users.staff.id }
    })).status, 403);

    const statusUpdate = await request(`/complaints/${complaints.faculty}/status`, {
      token: adminToken,
      method: 'PATCH',
      body: { status: 'In Progress', comment: 'Admin verified the report.' }
    });
    assert.equal(statusUpdate.status, 200);
    assert.equal(statusUpdate.body.status, 'In Progress');
    assert.equal((await request('/complaints', {
      token: adminToken,
      method: 'POST',
      body: { title: 'Admin complaint', description: 'Admins cannot submit complaints through this workflow.', category: 'Other', location: 'Office' }
    })).status, 403);
  });

  await t.test('Staff: view assigned work only, update status, and receive notifications', async () => {
    const currentUser = await request('/auth/me', { token: users.staff.token });
    assert.equal(currentUser.status, 200);
    assert.equal(currentUser.body.user.role, 'STAFF');

    const assigned = await request('/complaints', { token: users.staff.token });
    assert.equal(assigned.status, 200);
    assert.deepEqual(new Set(assigned.body.map((complaint) => complaint._id)), new Set([complaints.student, complaints.faculty]));
    assert.equal((await request(`/complaints/${complaints.unassigned}`, { token: users.staff.token })).status, 403);
    assert.equal((await request(`/complaints/${complaints.unassigned}/status`, {
      token: users.staff.token,
      method: 'PATCH',
      body: { status: 'In Progress' }
    })).status, 403);
    assert.equal((await request('/complaints', {
      token: users.staff.token,
      method: 'POST',
      body: { title: 'Staff complaint', description: 'Staff cannot submit complaints through this workflow.', category: 'Other', location: 'Office' }
    })).status, 403);
    assert.equal((await request('/users', { token: users.staff.token })).status, 403);

    const progress = await request(`/complaints/${complaints.student}/status`, {
      token: users.staff.token,
      method: 'PATCH',
      body: { status: 'In Progress', comment: 'Repair is underway.' }
    });
    assert.equal(progress.status, 200);
    const resolved = await request(`/complaints/${complaints.student}/status`, {
      token: users.staff.token,
      method: 'PATCH',
      body: { status: 'Resolved', comment: 'The fan has been repaired.' }
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.status, 'Resolved');
    assert.equal((await request('/complaints', { token: users.staff.token })).body.some((item) => item._id === complaints.student), false);

    const notifications = await request('/notifications', { token: users.staff.token });
    assert.equal(notifications.status, 200);
    assert.ok(notifications.body.notifications.some((item) => item.type === 'ASSIGNED' && item.complaintId._id === complaints.student));
    assert.ok(notifications.body.notifications.some((item) => item.type === 'RESOLVED' && item.complaintId._id === complaints.student));
    assert.ok(notifications.body.unreadCount >= 4);
  });

  await t.test('Student: receive assignment/status notifications and submit resolution feedback', async () => {
    const notifications = await request('/notifications', { token: users.student.token });
    assert.ok(notifications.body.notifications.some((item) => item.type === 'ASSIGNED'));
    assert.ok(notifications.body.notifications.some((item) => item.type === 'STATUS_CHANGED'));
    assert.ok(notifications.body.notifications.some((item) => item.type === 'RESOLVED'));
    const assignmentNotice = notifications.body.notifications.find((item) => item.type === 'ASSIGNED');
    assert.equal((await request(`/notifications/${assignmentNotice._id}/read`, {
      token: users.student.token,
      method: 'PATCH'
    })).body.isRead, true);
    assert.equal((await request('/notifications/read-all', {
      token: users.student.token,
      method: 'PATCH'
    })).status, 200);
    assert.equal((await request('/notifications', { token: users.student.token })).body.unreadCount, 0);

    const feedback = await request(`/complaints/${complaints.student}/feedback`, {
      token: users.student.token,
      method: 'POST',
      body: { rating: 5, comment: 'The issue was fixed quickly.' }
    });
    assert.equal(feedback.status, 201);
    assert.equal(feedback.body.rating, 5);
    assert.equal((await request(`/complaints/${complaints.student}/feedback`, {
      token: users.student.token,
      method: 'POST',
      body: { rating: 4 }
    })).status, 409);
  });

  await t.test('Faculty: receive admin status and assignment notifications', async () => {
    const notifications = await request('/notifications', { token: users.faculty.token });
    assert.equal(notifications.status, 200);
    assert.ok(notifications.body.notifications.some((item) => item.type === 'ASSIGNED'));
    assert.ok(notifications.body.notifications.some((item) => item.type === 'STATUS_CHANGED'));
    assert.equal((await request(`/complaints/${complaints.faculty}/status`, {
      token: users.faculty.token,
      method: 'PATCH',
      body: { status: 'Resolved' }
    })).status, 403);
    assert.equal((await request(`/complaints/${complaints.faculty}/feedback`, {
      token: users.faculty.token,
      method: 'POST',
      body: { rating: 5 }
    })).status, 409);
  });
});
