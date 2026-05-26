# 🎫 SLA Support Ticket System — MERN Monorepo

A full-stack support ticket management system built with **React + Vite** (frontend) and **Node.js + Express + MongoDB** (backend), structured as a clean monorepo for independent deployment.

---

## 📁 Project Structure

```
bajaj/
├── backend/                    ← Express / MongoDB API
│   ├── src/
│   │   ├── config/db.js        # MongoDB connection
│   │   ├── controllers/        # Route handler logic
│   │   ├── middleware/         # Error handler
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API route definitions
│   │   ├── app.js              # Express app + CORS setup
│   │   └── server.js           # Server entry point
│   ├── tests/
│   │   └── api.test.js         # In-memory MongoDB integration tests
│   ├── .env                    # Local environment variables (not committed)
│   ├── .env.example            # Template for required env vars
│   └── package.json
│
├── frontend/                   ← React + Vite SPA
│   ├── src/
│   │   ├── App.jsx             # Main app (Kanban board)
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env                    # Local environment variables (not committed)
│   ├── .env.example            # Template for required env vars
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚡ Local Development Setup

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (or a MongoDB Atlas URI)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Create your `.env` file (copy from example):
```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/support-tickets
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Start the dev server (auto-reload via Nodemon):
```bash
npm run dev
```

Backend runs at: **http://localhost:5000**

Run the automated test suite:
```bash
npm test
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create your `.env` file:
```bash
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

Start the Vite dev server:
```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🚀 Deployment

### Backend → Render

1. Push your code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables in the Render dashboard:

| Variable | Value |
|---|---|
| `PORT` | `5000` (Render sets this automatically) |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your Vercel frontend URL (e.g. `https://your-app.vercel.app`) |

> 💡 MongoDB Atlas: Whitelist `0.0.0.0/0` in Network Access for Render's dynamic IPs.

---

### Frontend → Vercel

1. Import your GitHub repo on [Vercel](https://vercel.com).
2. Set the following:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
3. Add environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render backend URL (e.g. `https://your-api.onrender.com`) |

> ⚠️ Vite requires env vars to be prefixed with `VITE_` to be accessible in the browser.

---

## 🛜 API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/tickets` | Create a new ticket |
| `GET` | `/tickets` | List all tickets (supports `?status=`, `?priority=`, `?breached=`) |
| `PATCH` | `/tickets/:id` | Update a ticket (status transition, fields) |
| `DELETE` | `/tickets/:id` | Delete a ticket |
| `GET` | `/tickets/stats` | Dashboard analytics |
| `POST` | `/tickets/seed` | Seed dummy data (`?clear=true` to wipe first) |

---

## 🔐 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `NODE_ENV` | No | `development` or `production` |
| `CLIENT_URL` | No | Frontend origin for CORS (default: http://localhost:5173) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend base URL (default: http://localhost:5000) |

---

## ✨ Features

- **Kanban Board** — drag tickets across Open → In Progress → Resolved → Closed
- **SLA Tracking** — per-priority targets (Urgent: 1h, High: 4h, Medium: 24h, Low: 72h)
- **State Machine** — validated status transitions (only 1 step forward/backward)
- **Dashboard Stats** — live counts, breach count, avg open age, avg resolution time
- **Filter** — by priority and SLA breach status
- **Seed Data** — one-click demo data seeding with realistic historical tickets
- **100% Test Coverage** — in-memory MongoDB integration test suite
