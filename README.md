# CampusFix – Campus Problem Reporting System

CampusFix is a beginner-friendly MERN project. College students can report campus maintenance problems and track whether each complaint is Pending, In Progress, or Resolved.

This project uses:

- HTML, CSS, and JavaScript
- React with Vite for the frontend
- Node.js and Express for the REST API
- MongoDB Atlas with Mongoose for the database
- Fetch API for frontend-backend communication

There is no login, payment, maps, or image upload in this first version.

## Folder structure

```text
campusfix/
  frontend/                 React + Vite app
    src/
      components/           Reusable UI pieces such as cards and form
      pages/                Dashboard page
      services/             Fetch API calls
      App.jsx
      main.jsx
      index.css
    index.html
    package.json
    .env.example
    vite.config.js          Needed so Vite runs React on port 5173
  backend/                  Express API
    models/                 Complaint schema
    routes/                 Complaint endpoints
    server.js
    seed.js                 Optional sample data, run only when you want it
    package.json
    .env.example
  README.md
  .gitignore
```

## How the request flow works

1. Student fills the complaint form in React.
2. React calls `frontend/src/services/api.js`.
3. Fetch sends JSON to Express, for example `POST http://localhost:5000/api/complaints`.
4. Express validates the data and uses Mongoose to save it in MongoDB Atlas.
5. MongoDB returns the saved complaint.
6. Express sends that JSON back to React.
7. The dashboard updates totals, cards, and filters.

React never talks to MongoDB directly. All database work goes through Express.

## 1. Install required tools

Install these before starting:

- [Node.js LTS](https://nodejs.org/) (this also installs npm)
- A code editor such as Cursor or VS Code
- A free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account

Open **Windows PowerShell** and check Node.js:

```powershell
node -v
npm -v
```

## 2. Create environment files

Copy the example files. Do not commit real passwords.

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix"
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Then open `backend/.env` and replace the placeholder with **your own** Atlas URI.

`frontend/.env` should stay:

```env
VITE_API_URL=http://localhost:5000/api
```

`backend/.env` should look like this shape (use your values, not this password):

```env
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_DB_USERNAME:YOUR_DB_PASSWORD@YOUR_CLUSTER.mongodb.net/campusfix?retryWrites=true&w=majority
```

If your Atlas password contains special characters such as `@`, `#`, or `/`, URL-encode them in the URI.

Never paste your real database password into chat or into Git.

## 3. Create a MongoDB Atlas database

1. Sign in at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0** cluster if you do not have one.
3. Open **Database Access** and create a database user with a password you will remember.
4. Open **Network Access** and add your current IP address. For a college demo on your laptop, you can also allow access from anywhere (`0.0.0.0/0`), but understand that this is less strict.
5. Open **Database**, click **Connect**, choose **Drivers**, and copy the connection string.
6. Replace `<password>` with your database user password.
7. Add a database name before the `?`, for example `/campusfix?retryWrites=true&w=majority`.
8. Paste that string into `backend/.env` as `MONGODB_URI`.

## 4. Install frontend dependencies

The frontend is already a Vite + React JavaScript app. You do not need to run `npm create vite` again unless you start over.

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\frontend"
npm install
```

If you ever recreate it from scratch, the command is:

```powershell
npm create vite@latest frontend -- --template react
```

Then replace the generated TypeScript/demo files with the JavaScript files from this project.

## 5. Install backend dependencies

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\backend"
npm install
```

## 6. Optional: add sample complaints

Run this **once** after MongoDB is configured. The script does not insert duplicates if complaints already exist.

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\backend"
npm run seed
```

## 7. Start the backend (Terminal 1)

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\backend"
npm start
```

You should see:

- `Connected to MongoDB Atlas`
- `CampusFix API listening on http://localhost:5000`

If connection fails, the server prints a clear error and exits. Check `MONGODB_URI`, the Atlas username/password, and Network Access.

## 8. Start the frontend (Terminal 2)

```powershell
cd "C:\Users\RACHANA'S LAPPY\OneDrive\Desktop\campusFix\frontend"
npm run dev
```

Open this URL in your browser:

[http://localhost:5173](http://localhost:5173)

## 9. Verify the API

Keep the backend running, then test in PowerShell:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5000/api/complaints
```

Create a complaint:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/complaints -ContentType "application/json" -Body '{"title":"Broken light in Lab 1","description":"Tube light is flickering and needs replacement.","category":"Electrical","location":"Lab 1"}'
```

Update status by replacing `COMPLAINT_ID`:

```powershell
Invoke-RestMethod -Method Patch -Uri http://localhost:5000/api/complaints/COMPLAINT_ID/status -ContentType "application/json" -Body '{"status":"In Progress"}'
```

Delete by replacing `COMPLAINT_ID`:

```powershell
Invoke-RestMethod -Method Delete -Uri http://localhost:5000/api/complaints/COMPLAINT_ID
```

## 10. Test the website

1. Open [http://localhost:5173](http://localhost:5173).
2. Confirm dashboard cards show totals.
3. Submit a new complaint.
4. Filter by category and status.
5. Change a complaint from Pending to In Progress, then Resolved.
6. Delete a complaint and confirm the dialog.
7. Stop the backend and refresh to see the friendly “server unavailable” message.

## Important files for viva

- `backend/server.js`: starts Express only after MongoDB connects.
- `backend/models/Complaint.js`: complaint fields and allowed status values.
- `backend/routes/complaints.js`: GET, POST, PATCH, DELETE APIs.
- `frontend/src/services/api.js`: all Fetch calls live here.
- `frontend/src/pages/Dashboard.jsx`: loads data, updates stats, handles create/update/delete.

## Hinglish explanation for viva

CampusFix ek college complaint system hai. Student frontend pe form fill karta hai. React Fetch API se Express backend ko data bhejta hai. Express data check karta hai, phir Mongoose us complaint ko MongoDB Atlas mein save karta hai. Dashboard MongoDB se latest complaints nikal ke cards aur statistics dikhata hai. Status change ya delete bhi same flow se hota hai: React -> Express -> MongoDB -> React UI update.

Aap yeh points bol sakte ho:

- Frontend sirf UI hai, database se directly connect nahi hota.
- Backend REST API `/api/complaints` handle karta hai.
- Status sirf Pending, In Progress, aur Resolved ho sakta hai.
- `.env` mein secret URI rakha hai, code ke andar password nahi likha.

## Ports used

- Backend API: `http://localhost:5000`
- Frontend Vite app: `http://localhost:5173`
- Frontend talks to: `http://localhost:5000/api`
