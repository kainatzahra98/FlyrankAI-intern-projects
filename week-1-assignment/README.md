# Week 1 Assignment — Minimal JSON API Server

> **Topic:** Backend Basics — Building and testing a tiny HTTP server with two JSON endpoints.
>
> 📦 **Repository:** [github.com/kainatzahra98/FlyrankAI-intern-projects](https://github.com/kainatzahra98/FlyrankAI-intern-projects)

---

## What this does

A minimal Node.js server (zero external dependencies, ~20 lines of code) that listens on **port 4000** and exposes two JSON endpoints:

| Method | Endpoint | Response |
|--------|----------|----------|
| GET    | `/`      | `{ "message": "Hello, World!" }` |
| GET    | `/about` | `{ "name": "My Server", "version": "1.0.0", "author": "Flyrankai" }` |

Any other route returns `404` with `{ "error": "Route not found" }`.

---

## How to run

Make sure you have **Node.js** installed (verify with `node -v`), then:

```bash
# 1. Clone the repo (first time only)
git clone https://github.com/kainatzahra98/FlyrankAI-intern-projects.git
cd FlyrankAI-intern-projects/week-1-assignment

# 2. Start the server
npm start
# or:
node server.js
```

You should see:
```
Server running at http://localhost:4000
  GET http://localhost:4000/
  GET http://localhost:4000/about
```

---

## How to test

### Option 1 — Browser
Open your browser and visit:
- http://localhost:4000/
- http://localhost:4000/about

### Option 2 — curl (terminal)
```bash
# Root endpoint
curl http://localhost:4000/

# About endpoint
curl http://localhost:4000/about

# Pretty-print JSON output
curl http://localhost:4000/ | python3 -m json.tool
curl http://localhost:4000/about | python3 -m json.tool
```

### Option 3 — curl with response headers
```bash
# See status code, Content-Type, and body together
curl -i http://localhost:4000/
```

Expected output:
```
HTTP/1.1 200 OK
Content-Type: application/json
...

{"message":"Hello, World!"}
```

---

## Project structure

```
week-1-assignment/
├── server.js      ← The entire server (~20 lines, no dependencies)
├── package.json   ← Project metadata & npm start script
├── .gitignore     ← Keeps node_modules out of GitHub
└── README.md      ← This file
```

---

## Key concepts covered

- **HTTP request/response cycle** — the server sits and listens; a client (curl or browser) sends a request; the server replies with a status code + body
- **JSON endpoints** — responding with structured machine-readable data instead of HTML
- **Routing** — branching on `req.url` and `req.method` to decide what to return
- **Status codes** — `200 OK` for success, `404 Not Found` for unknown routes
- **Content-Type header** — `application/json` tells the client how to interpret the body

---

## Submission

- **Week:** 1
- **Program:** FlyrankAI Internship
- **GitHub:** [kainatzahra98/FlyrankAI-intern-projects](https://github.com/kainatzahra98/FlyrankAI-intern-projects)
- **Author:** Kainatzahra / Flyrankai
