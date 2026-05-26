# MERN Support Ticket System Backend

A production-ready, interview-friendly Node.js, Express, and MongoDB (Mongoose) backend for a support ticket management system.

---

## ✨ Features

- **Robust State Transition Validation**: Prevents invalid status jumps using a pre-save Mongoose hook.
  - Forward transitions follow the logical path: `open` ➔ `in_progress` ➔ `resolved` ➔ `closed`.
  - Backward transitions are restricted to **exactly one step** (e.g., `closed` ➔ `resolved` is allowed; `closed` ➔ `in_progress` is rejected with `400 Bad Request`).
- **Dynamic SLA Calculations**:
  - Urgent: **1 hour**
  - High: **4 hours**
  - Medium: **24 hours**
  - Low: **72 hours**
- **Dynamic Virtual Fields**:
  - `ageMinutes`: Active duration since creation (if unresolved) or total resolution duration (if resolved/closed).
  - `slaBreached`: Dynamic boolean comparing `ageMinutes` with the SLA targets.
- **Index-Friendly MongoDB Querying**: Real-time server-side filtering for dynamic virtuals (e.g., fetching only `breached=true` tickets instantly).
- **CORS Enabled** & Centralized Error Handling.
- **100% Automated Testing Suite**: Runs an in-memory database integration test suite in seconds without requiring a local/Atlas MongoDB install!

---

## 🛠️ Project Structure

```text
bajaj/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection manager
│   ├── controllers/
│   │   └── ticketController.js # API Controller actions and analytics
│   ├── middleware/
│   │   └── errorHandler.js    # Centralized validation & route error catcher
│   ├── models/
│   │   └── Ticket.js          # Mongoose Schema, Virtuals & Pre-Save Hooks
│   ├── routes/
│   │   └── ticketRoutes.js    # API Endpoint mappings
│   ├── app.js                 # Express Application setup
│   └── server.js              # Server entry point
├── tests/
│   └── api.test.js            # Automated In-Memory MongoDB Integration Tests
├── .env                       # Environment variables configuration
├── package.json               # Dependencies and script definitions
└── README.md                  # Documentation
```

---

## 🚀 Setup & Execution

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
A default `.env` file is provided:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/support-tickets
NODE_ENV=development
```
> 💡 *To connect to MongoDB Atlas, simply replace `MONGODB_URI` with your connection string.*

### 3. Run Automated Tests
You can run the complete integration test suite which sets up an automated in-memory MongoDB environment:
```bash
npm test
```

### 4. Start Backend Server
**Development Mode (Auto-reload via Nodemon):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

---

## 💻 React Frontend Setup

The frontend is located in the `frontend` subfolder.

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Frontend Dev Server
To start the React client:
```bash
npm run dev
```
By default, the Vite development server boots at `http://localhost:5173`. Make sure the Backend server is running on `http://localhost:5000` simultaneously!

### 3. Build for Production
To bundle and compile the React application:
```bash
npm run build
```

---

## 🛜 API Endpoints & Usage

### 1. Create a Ticket
* **Route:** `POST /tickets`
* **Request Body:**
  ```json
  {
    "subject": "Email delivery failed",
    "description": "Emails sent to hotmail domain bounce back immediately.",
    "customerEmail": "customer@business.com",
    "priority": "high"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Ticket created successfully",
    "data": {
      "subject": "Email delivery failed",
      "description": "Emails sent to hotmail domain bounce back immediately.",
      "customerEmail": "customer@business.com",
      "priority": "high",
      "status": "open",
      "createdAt": "2026-05-26T10:00:00.000Z",
      "resolvedAt": null,
      "ageMinutes": 0,
      "slaBreached": false,
      "id": "6a1570f681f0407c7bca31a6"
    }
  }
  ```

---

### 2. Get All Tickets
* **Route:** `GET /tickets`
* **Optional Query Parameters:**
  - `status` (`open` | `in_progress` | `resolved` | `closed`)
  - `priority` (`low` | `medium` | `high` | `urgent`)
  - `breached` (`true` | `false`)
* **Example:** `GET /tickets?priority=high&breached=true`

---

### 3. Update a Ticket (e.g., Status Transition)
* **Route:** `PATCH /tickets/:id`
* **Request Body:**
  ```json
  {
    "status": "in_progress"
  }
  ```
* **State Transition Rules Matrix:**
  * **Allowed Path:** `open` ➔ `in_progress` ➔ `resolved` ➔ `closed`.
  * **Backward Limitation:** Only exactly 1 step backward is allowed.
    * `closed` ➔ `resolved` (Allowed ✅)
    * `resolved` ➔ `in_progress` (Allowed ✅ - *Automatically clears `resolvedAt` to `null`*)
    * `closed` ➔ `in_progress` (Rejected with `400 Bad Request` ❌)

---

### 4. Delete a Ticket
* **Route:** `DELETE /tickets/:id`

---

### 5. Get Dashboard Analytics
* **Route:** `GET /tickets/stats`
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "stats": {
      "totalTickets": 24,
      "statusCounts": {
        "open": 8,
        "in_progress": 10,
        "resolved": 4,
        "closed": 2
      },
      "priorityCounts": {
        "low": 12,
        "medium": 6,
        "high": 4,
        "urgent": 2
      },
      "breachedCount": 3,
      "avgAgeOpenMinutes": 45.2,
      "avgResolutionTimeMinutes": 18.5
    }
  }
  ```
}

---

### 6. Seed Dummy Tickets (Testing Helper)
* **Route:** `POST /tickets/seed`
* **Optional Query Parameters:**
  - `clear` (`true` | `false`): If set to `true`, purges the collection completely before seeding.
* **Seeded Dataset Details:**
  Seeds a diverse set of 5 historical tickets, carefully configured to test all edge cases of your stats and filter queries:
  1. An unresolved `low` ticket created 10 minutes ago (**SLA: 72h ➔ Met**).
  2. An unresolved `urgent` ticket created 2 hours ago (**SLA: 1h ➔ Breached**).
  3. A resolved `high` ticket created 5 hours ago, resolved 2 hours ago (**SLA: 4h ➔ Met**).
  4. A resolved `medium` ticket created 48 hours ago, resolved 1 hour ago (**SLA: 24h ➔ Breached**).
  5. An unresolved `medium` ticket created 6 hours ago (**SLA: 24h ➔ Met**).
* **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Successfully seeded 5 dummy tickets!",
    "count": 5,
    "data": [...]
  }
  ```

---

## 🏆 Key Interview Talking Points

1. **Clean Architecture & Separation of Concerns**: Modular and decoupled config, models, routers, controllers, and middlewares.
2. **Atomic Transitions via Mongoose `pre-save`**: By fetching and modifying the mongoose document instance (instead of using blind update queries), we ensure all state machine transition guards execute successfully and timestamps are updated reliably.
3. **Optimized DB Filtering for Virtuals**: Standard virtual fields cannot be directly queried in MongoDB databases. To keep it highly performant, `GET /tickets?breached=true` automatically compiles dynamic SLA thresholds into an optimized `$or` MongoDB expression, making it run at sub-millisecond database speeds.
4. **Validation Parsing**: Seamlessly translates Mongoose schema validations into clean, clear arrays of error messages.
