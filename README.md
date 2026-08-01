# Flowline — Full-Stack Task Management Web Application

A CRUD task manager with JWT authentication and role-based access control,
built with React, Node.js, Express, and MongoDB.

## Features

- **Authentication** — register/login with hashed passwords (bcrypt) and JWT-based sessions.
- **Role-based access** — `member` accounts see and manage only their own tasks; `admin` accounts see everyone's.
- **Task CRUD** — create, update (including moving between statuses), and delete tasks.
- **Kanban-style board** — tasks are grouped into To Do / In Progress / Done columns.
- **Responsive UI** — collapses to a single column on mobile.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18, React Router, Axios, Vite |
| Backend  | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Auth     | JSON Web Tokens (jsonwebtoken), bcryptjs for password hashing |

## Project structure

```
task-manager/
├── backend/
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/auth.js    # JWT verification + role guard
│   ├── models/User.js        # User schema, password hashing
│   ├── models/Task.js        # Task schema
│   ├── routes/authRoutes.js  # /api/auth/*
│   ├── routes/taskRoutes.js  # /api/tasks/*
│   └── server.js             # Express app entry point
└── frontend/
    └── src/
        ├── api/axios.js           # Axios instance, auto-attaches JWT
        ├── context/AuthContext.jsx # Global auth state
        ├── components/            # Navbar, TaskCard, TaskModal, PrivateRoute
        └── pages/                 # Login, Register, Dashboard
```

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set `MONGO_URI` to either:
- a local MongoDB instance (`mongodb://localhost:27017/taskmanager`), or
- a free MongoDB Atlas cluster (recommended if you don't want to install MongoDB locally — atlas.mongodb.com, free tier is enough).

Then start the API:

```bash
npm run dev     # requires nodemon, auto-restarts on changes
# or
npm start       # plain node
```

The API runs on `http://localhost:5000` by default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` and expects the API at
`http://localhost:5000/api` (override with a `VITE_API_URL` env variable
if you deploy the backend elsewhere).

## How auth + roles work (for interview prep)

1. On register/login, the backend signs a JWT containing the user's Mongo `_id` and returns it.
2. The frontend stores the token in `localStorage` and an Axios request interceptor
   (`src/api/axios.js`) attaches it as `Authorization: Bearer <token>` on every API call automatically.
3. On the backend, the `protect` middleware (`middleware/auth.js`) verifies the token on every
   protected route and loads the user onto `req.user`.
4. Task routes check `req.user.role`: if `admin`, the `GET /api/tasks` query has no owner filter
   (returns everyone's tasks); otherwise it's filtered to `{ owner: req.user._id }`.
5. Update/delete routes double-check ownership (`findAuthorizedTask` helper in `taskRoutes.js`)
   so a `member` can never modify another member's task even if they guess the task ID.
6. New accounts always register as `role: "member"` — nobody can self-promote to admin through
   the API. (To create an admin for testing, register normally, then update that user's `role`
   field to `"admin"` directly in the database.)

## Design notes

The UI intentionally avoids a generic SaaS-dashboard look. It's styled like a paper planner /
index-card corkboard: a warm paper background, a serif display face (Fraunces) paired with a
monospace body face (IBM Plex Mono) for a checklist feel, and each task card has a torn-perforation
top edge and a small hand-stamp-style status marker.
