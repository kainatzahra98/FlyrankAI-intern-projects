# W3·A1 — Connecting CRUD to SQLite

> **Week 3, Assignment 1 — Backend AI Engineering Track**
>
> Replace the in-memory array with a real SQLite database while keeping
> the API **100% identical**. Data now survives server restarts.

---

## The Big Idea

```
Before (Week 2):   Client → API → Array in memory  (lost on restart)
After  (Week 3):   Client → API → SQLite database  (persists forever)
```

The client sees **no difference**. Same URLs. Same request bodies. Same responses.
Only the storage layer changed — and that's the point.

---

## Why SQLite?

| Feature | Benefit for this assignment |
|---|---|
| Single file (`tasks.db`) | No server to install or start |
| Full SQL | You learn real SQL, not a toy API |
| Zero configuration | Works immediately on any machine |
| Upgrade path | Same SQL knowledge applies to Postgres, MySQL, etc. |

---

## Where the database file is stored

```
week-3-assignment/
└── data/
    └── tasks.db   ← created automatically on first run
```

Open `tasks.db` with [DB Browser for SQLite](https://sqlitebrowser.org) to run raw queries visually.

---

## How to start the project

```bash
# 1. Install dependencies
npm install

# 2. Start the server (creates DB + seeds 3 tasks on first run)
npm start

# Server runs on http://localhost:4000
```

---

## API Endpoints

| Method | URL | Description |
|---|---|---|
| `GET` | `/tasks` | List all tasks |
| `POST` | `/tasks` | Create a task `{ "title": "..." }` |
| `GET` | `/tasks/:id` | Get one task |
| `PUT` | `/tasks/:id` | Update `{ "title"?, "done"? }` |
| `DELETE` | `/tasks/:id` | Delete a task |
| `GET` | `/stats` | Count total / completed / pending |

### Optional query params on `GET /tasks`

```
?search=milk        → WHERE title LIKE '%milk%'
?done=true          → WHERE done = 1
?done=false         → WHERE done = 0
?orderBy=title      → ORDER BY title
```

---

## SQL Queries I Explored (Stage 4)

```sql
-- List every task
SELECT * FROM tasks;

-- Show only completed tasks
SELECT * FROM tasks WHERE done = 1;

-- Count all tasks
SELECT COUNT(*) FROM tasks;

-- Mark every task as completed
UPDATE tasks SET done = 1;

-- Delete all completed tasks
DELETE FROM tasks WHERE done = 1;

-- Search for tasks containing a word
SELECT * FROM tasks WHERE title LIKE '%grocery%';

-- Statistics in one query
SELECT COUNT(*) AS total, SUM(done) AS completed, COUNT(*) - SUM(done) AS pending
FROM tasks;
```

> After running these manually in DB Browser, the changes are immediately
> visible through `GET /tasks` — that's what persistence means.

---

## Running the automated tests

```bash
# Terminal 1 – start the server
npm start

# Terminal 2 – run tests
npm test
```

Expected output: **all tests pass** across Stages 0–3 + optional extras.

---

## Architecture

```
src/
├── server.js              ← entry point, swap repository here
├── app.js                 ← Express factory (unchanged between repos)
├── db/
│   └── db.js              ← sql.js SQLite init, persist, seed (Stage 0)
├── repositories/
│   └── sqliteRepository.js ← all SQL queries (Stages 1–3)
├── services/
│   └── taskService.js     ← business logic (no SQL, no HTTP)
└── routes/
    └── tasks.js           ← HTTP layer only
```

The layered architecture means:
- Switching from SQLite → Postgres only requires a new repository file
- The service, routes, and app.js **never change**

---

## Optional extras implemented

- ✅ **Search** — `?search=` via SQL `LIKE`
- ✅ **Filter** — `?done=true/false` via SQL `WHERE`
- ✅ **Sort** — `?orderBy=title` via SQL `ORDER BY`
- ✅ **Stats** — `GET /stats` via SQL `COUNT()` and `SUM()`
- ✅ **Timestamps** — `created_at` and `updated_at` on every task

---

## Requirements checklist

- [x] Same CRUD endpoints as Assignment 1
- [x] Tasks stored in SQLite instead of memory
- [x] Data survives server restarts
- [x] Database auto-created if missing
- [x] `tasks` table auto-created if missing
- [x] Three example tasks seeded only on first run
- [x] All CRUD uses SQL queries
- [x] Unknown ids return `404`
- [x] Invalid requests return `400`
