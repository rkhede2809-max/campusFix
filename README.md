# CampusFix – Campus Problem Reporting System

CampusFix is an existing React + Vite frontend backed by an Express REST API and MongoDB/Mongoose. It lets students and faculty report campus issues, staff work on assigned issues, and administrators manage departments, users, assignments, and complaint progress.

## Project structure

```text
campusFix/
  backend/
    middleware/             Authentication and role authorization
    models/                  Mongoose schemas and relationships
    routes/                  Authentication, complaints, users, departments, notifications
    server.js
    seed.js                  Optional legacy sample complaints
    .env.example
  frontend/
    src/
      components/            Dashboard, complaint, auth, admin, and notification UI
      pages/Dashboard.jsx
      services/api.js
    .env.example
```

## Requirements and setup

- Node.js LTS and npm
- A MongoDB database (Atlas or a reachable MongoDB server)

Install dependencies in the existing frontend and backend directories:

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\frontend"
npm install
cd ..\backend
npm install
```

Configure `backend/.env` using [backend/.env.example](./backend/.env.example). The existing local `.env` is not tracked and is intentionally not populated with credentials. Set:

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/campusfix?retryWrites=true&w=majority
JWT_SECRET=use_a_random_secret_at_least_32_characters_long
BOOTSTRAP_ADMIN_NAME=CampusFix Administrator
BOOTSTRAP_ADMIN_EMAIL=admin@example.edu
BOOTSTRAP_ADMIN_PASSWORD=choose_a_unique_password_at_least_10_characters
```

Use your own MongoDB URI and URL-encode special characters in the database password. Generate a `JWT_SECRET` rather than reusing the database password (for example, `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Never commit either secret.

On the first backend startup, the optional bootstrap variables create an administrator account using a scrypt password hash. Choose a unique admin email and a password of at least 10 characters. After the account is created, you may clear the bootstrap email/password; the account remains in MongoDB. Public sign-up only permits STUDENT and FACULTY. ADMIN accounts can create STAFF, ADMIN, and other user accounts from the administration panel.

If desired, copy `frontend/.env.example` to `frontend/.env`; its default API URL is `http://localhost:5000/api`.

Start the existing API and UI in separate PowerShell terminals:

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\backend"
npm start
```

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\frontend"
npm run dev
```

Open <http://localhost:5173>. The backend requires both `MONGODB_URI` and a `JWT_SECRET` of at least 32 characters and will stop with a configuration error if either is missing.

## Roles and access

| Role | Capabilities |
| --- | --- |
| STUDENT | Submit complaints, view own complaints and history, rate own resolved complaints, view own notifications |
| FACULTY | Submit complaints, view own complaints, history, and notifications |
| STAFF | View assigned complaints, update their status with progress comments, view relevant notifications |
| ADMIN | View all complaints, assign/reassign staff, update/delete complaints, manage users and departments, view dashboard statistics and history |

The backend enforces these permissions for every protected route. Password hashes are excluded from regular User queries and are never included in API responses. Access tokens expire after eight hours. Departments and users referenced by complaints, history, assignments, or notifications cannot be deleted in a way that would orphan records.

## Data model overview

- `User`: unique email, generated `userId`, hashed password, role, optional department.
- `Department`: unique case-insensitive name and service contact details.
- `Complaint`: preserves title, description, category, location, status, and timestamps; includes reporter, optional department, and priority.
- `Assignment`: immutable assignment history; reassignment cancels the previous active record and creates a new record.
- `ComplaintHistory`: status changes and staff progress comments, with actor and time.
- `Feedback`: one 1–5 rating per reporter per resolved complaint.
- `Notification`: in-app assignment and status/resolution updates, with read state.

Complaint statuses remain `Pending`, `In Progress`, and `Resolved`; categories remain `Electrical`, `Plumbing`, `Cleanliness`, `Furniture`, `Internet`, and `Other`.

## REST API

Requests and responses use JSON. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access / purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Public; register STUDENT or FACULTY |
| POST | `/api/auth/login` | Public; sign in |
| GET | `/api/auth/me` | Signed-in user profile |
| GET, POST | `/api/users` | ADMIN; list users / create an account |
| PATCH, DELETE | `/api/users/:id` | ADMIN; update / safely delete a user |
| GET | `/api/users/staff` | ADMIN; list staff for assignment |
| GET | `/api/departments` | Signed-in users; list departments |
| POST | `/api/departments` | ADMIN; create a department |
| PATCH, DELETE | `/api/departments/:id` | ADMIN; update / safely delete a department |
| GET | `/api/complaints` | ADMIN all, STAFF assigned, reporters own complaints |
| POST | `/api/complaints` | STUDENT or FACULTY; submit a complaint |
| GET | `/api/complaints/:id` | Authorized complaint viewers; details, assignment, history, feedback |
| PATCH | `/api/complaints/:id` | ADMIN; edit complaint fields |
| PATCH | `/api/complaints/:id/status` | ADMIN or assigned STAFF; update status and optional comment |
| POST | `/api/complaints/:id/assignments` | ADMIN; assign or reassign a STAFF user |
| GET | `/api/complaints/:id/history` | Authorized complaint viewers |
| POST, GET | `/api/complaints/:id/feedback` | Reporter submits after resolution; authorized viewers retrieve |
| DELETE | `/api/complaints/:id` | ADMIN; delete complaint and its dependent history/assignment/feedback/notifications |
| GET | `/api/notifications` | Signed-in user; own notifications and unread count |
| PATCH | `/api/notifications/:id/read` | Mark own notification as read |
| PATCH | `/api/notifications/read-all` | Mark all own notifications as read |
| GET | `/api/health` | API/database health |

Invalid data is rejected with a client error, unauthorized requests return 401/403, duplicate/conflicting records return 409, and missing records return 404.

## Existing data and seed script

Existing complaint records are retained and remain visible to ADMIN accounts. Older records without a `reportedBy` cannot be shown to a student/faculty account; assign ownership through an intentional data migration before enabling those records for reporters. Optional `backend/seed.js` creates legacy demo complaints without reporter accounts and is not needed for normal use.

## Verification

Build the frontend:

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\frontend"
npm run build
```

Check backend startup and MongoDB access:

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\backend"
npm start
```

Then request `http://localhost:5000/api/health`. A database status of `connected` confirms the configured MongoDB connection.
