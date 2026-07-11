# Week 2 Assignment — Postgres + Docker + Repository Pattern

> **Topic:** Real persistence — Postgres in Docker, .env config, layered architecture proving "swap storage, change one file".
>
> 📦 **Repository:** [github.com/kainatzahra98/FlyrankAI-intern-projects](https://github.com/kainatzahra98/FlyrankAI-intern-projects)

---

## Architecture — How the layers fit together

```
HTTP Request
     │
     ▼
┌──────────────┐
│   routes/    │  ← Express routes. Only speaks HTTP (req/res).
│   items.js   │    No SQL. No business rules. Never changes.
└──────┬───────┘
       │ calls
       ▼
┌──────────────┐
│  services/   │  ← Business logic. Validates input, throws 404/400.
│ itemService  │    Knows nothing about HTTP or SQL. Never changes.
└──────┬───────┘
       │ calls
       ▼
┌──────────────────────────────────────┐
│         repositories/                │
│  inMemoryRepository.js  (was here)   │  ← Same interface
│  postgresRepository.js  (now active) │  ← Swapped in
└──────────────────────────────────────┘
       │
       ▼
   Postgres (Docker)
```

**The architecture proves itself:** swapping from in-memory to Postgres required changing **exactly one line** in `server.js`. Service and routes are untouched.

---

## What changed to swap storage

In `src/server.js`:

```js
// BEFORE (in-memory):
const InMemoryRepository = require("./repositories/inMemoryRepository");
const repository = new InMemoryRepository();

// AFTER (Postgres — currently active):
const PostgresRepository = require("./repositories/postgresRepository");
const repository = new PostgresRepository();
```

That's it. One file. Two lines. Service, routes, and app.js: **zero changes.**

---

## Prerequisites

- [Node.js](https://nodejs.org/en/) installed.
- (Note: We are using a Cloud Postgres Database via Neon instead of Docker Desktop due to disk space constraints, fulfilling the requirement for real DB persistence and repository pattern.)

---

## Project structure

```
week-2-assignment/
├── src/
│   ├── server.js                  ← Entry point — swap repo here
│   ├── app.js                     ← Express wiring (never changes)
│   ├── routes/
│   │   └── items.js               ← HTTP layer (never changes)
│   ├── services/
│   │   └── itemService.js         ← Business logic (never changes)
│   ├── repositories/
│   │   ├── inMemoryRepository.js  ← RAM store (same interface)
│   │   └── postgresRepository.js  ← Real DB (same interface)
│   └── db/
│       ├── index.js               ← pg connection pool
│       └── init.sql               ← CREATE TABLE schema
│       └── run_init.js            ← Script to initialize DB on Neon
├── .env                           ← Gitignored — your real secrets (Neon connection)
├── .env.example                   ← Committed — template for teammates
├── package.json
├── .gitignore
└── README.md
```

---

## How to run

### One command — starts the app

```bash
cd week-2-assignment
npm install
npm start
```

The app connects to the Neon Cloud Postgres DB using the URL in `.env`.

You should see:
```
[db] Connected to Postgres
[server] Running on http://localhost:4000
[server] Storage: PostgresRepository
```

---

## API Endpoints

Base URL: `http://localhost:4000`

| Method | Endpoint      | Body                            | Description     |
|--------|---------------|---------------------------------|-----------------|
| GET    | `/`           | —                               | Health check    |
| GET    | `/items`      | —                               | List all items  |
| POST   | `/items`      | `{ "name": "...", "description": "..." }` | Create item |
| GET    | `/items/:id`  | —                               | Get one item    |
| DELETE | `/items/:id`  | —                               | Delete item     |

---

## How to test (curl commands)

### 1. Health check
```bash
curl http://localhost:4000/
```

### 2. Create items
```bash
curl -X POST http://localhost:4000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "First item", "description": "Created before restart"}'

curl -X POST http://localhost:4000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Second item", "description": "Also before restart"}'
```

### 3. List all items
```bash
curl http://localhost:4000/items
```

### 4. Get a single item
```bash
curl http://localhost:4000/items/1
```

### 5. Delete an item
```bash
curl -X DELETE http://localhost:4000/items/1
```

---

## Proving persistence (the key test)

This is how persistence was verified:

```bash
# Step 1 — Start the app
npm start

# Step 2 — Create rows
curl -X POST http://localhost:4000/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Survives restart", "description": "Test persistence"}'

# Step 3 — Verify they exist
curl http://localhost:4000/items
# → rows visible ✅

# Step 4 — Stop the server (Ctrl+C)

# Step 5 — Start again
npm start

# Step 6 — Check data is still there
curl http://localhost:4000/items
# → same rows still there ✅  (data survived because it is saved in the Neon cloud DB)
```

**Why it works:** Data is being sent to the real Postgres database running in the cloud (Neon.tech). When the Node.js app stops, the database keeps running independently, persisting all data.

---

## Environment variables

| Variable       | Example value                                       | Description              |
|----------------|-----------------------------------------------------|--------------------------|
| `PORT`         | `4000`                                              | App listen port          |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/week2db`    | Postgres connection URL  |

> `.env` is gitignored. `.env.example` is committed — copy it to `.env` to get started.

---

## Submission

- **Week:** 2
- **Program:** FlyrankAI Internship
- **GitHub:** [kainatzahra98/FlyrankAI-intern-projects](https://github.com/kainatzahra98/FlyrankAI-intern-projects)
- **Author:** Kainatzahra / Flyrankai
