# W4 — Auth Login & Protect (Supabase Auth + Express + Swagger UI)

> **Week 4 Assignment — Backend AI Engineering Track**
>
> A production-grade secure REST API using **Supabase Auth** as an Identity Provider (IdP), issuing & verifying **JSON Web Tokens (JWTs)** with Bearer token header parsing, middleware authorization guards, and interactive **Swagger UI** documentation at `/docs`.

---

## 📐 Architecture & Security Flow

```
┌────────┐               ┌────────────────┐               ┌──────────────────┐
│ Client │ ── (1) Login ─>│ Express Server │ ── (2) Auth ─>│  Supabase (IdP)  │
│        │ <─ (4) JWT ───│  (Port 3000)   │ <─ (3) Token ─│ (Identity Prov.) │
│        │                └────────────────┘               └──────────────────┘
│        │                        │
│        │ ── (5) GET /protected ─┤
│        │    Header:             ▼
│        │    Authorization:   [requireAuth Middleware]
│        │    Bearer <JWT>     Verifies JWT via supabase.auth.getUser()
└────────┘                     Returns 200 (Valid) or 401 (Invalid/Expired)
```

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites & Installation

```bash
# Clone the repository (if not already cloned)
git clone https://github.com/kainatzahra98/FlyrankAI-intern-projects.git
cd FlyrankAI-intern-projects/week4-auth

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `week4-auth` directory (refer to `.env.example`):

```ini
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key
PORT=3000
```

> ⚠️ **Security Warning:** The `.env` file is listed in `.gitignore` to ensure credentials are never pushed to GitHub.

### 3. Start the Server

```bash
npm start
```

Output:
```text
🚀  Server running and connected to Supabase
    Local:  http://localhost:3000
    Docs:   http://localhost:3000/docs
```

---

## 📡 API Reference Table

| Method | Endpoint | Auth Required? | Status Codes | Description |
|---|---|---|---|---|
| `GET` | `/public/info` | ❌ None | `200` | Publicly accessible greeting message |
| `POST` | `/auth/signup` | ❌ None | `201`, `400` | Registers a new user via `supabase.auth.signUp()` |
| `POST` | `/auth/login` | ❌ None | `200`, `400`, `401` | Authenticates user & returns JWT `access_token` |
| `POST` | `/auth/logout` | 🔐 `Bearer <token>` | `204`, `401` | Invalidates user session via `supabase.auth.signOut()` |
| `GET` | `/protected/profile` | 🔐 `Bearer <token>` | `200`, `401` | Returns verified user ID, email, timestamps |
| `GET` | `/protected/dashboard` | 🔐 `Bearer <token>` | `200`, `401` | Protected dashboard endpoint (middleware guard) |

---

## 🛡️ Status Code Mapping

| Status Code | Meaning | Returned When |
|---|---|---|
| `200 OK` | Success | Successful login, public data read, or valid token profile fetch |
| `201 Created` | Created | User account successfully registered in Supabase |
| `204 No Content` | No Content | User successfully logged out |
| `400 Bad Request` | Bad Request | Missing email/password in request body |
| `401 Unauthorized` | Unauthorized | Wrong credentials, missing token, or tampered/expired JWT |

---

## 📖 Swagger UI Interactive Documentation

Interactive API documentation and direct testing are hosted live at:
👉 **`http://localhost:3000/docs`**

### Testing Authorization in Swagger:
1. Call `POST /auth/login` in Swagger or via `curl` to receive your `access_token`.
2. Click the **Authorize 🔒** button at the top right of the Swagger UI.
3. Paste the token string into the Value field and click **Authorize**.
4. Test `/protected/profile` or `/protected/dashboard` directly in your browser.

---

## 🧪 Automated Testing

Run the zero-dependency test suite:

```bash
npm test
```

Tests cover:
- ✅ **Stage 0:** Server health check & Supabase client initialization
- ✅ **Stage 1:** Input validation (`400`), invalid password (`401`), signup (`201`)
- ✅ **Stage 2:** Unauthenticated access blocks (`401`), public endpoint access (`200`)
- ✅ **Stage 3:** Token verification via Supabase SDK & tampered token rejection (`401`)
- ✅ **Stage 4:** Reusable `requireAuth` middleware guard & logout (`204`)
- ✅ **Stage 5:** Swagger UI OpenAPI specification setup

---

## 🤖 Stage 7 — AI vs Me Analysis (Reflections)

| Metric / Aspect | My Handcrafted Code | AI-Generated Baseline |
|---|---|---|
| **Header Parsing** | Strictly parses `Authorization: Bearer <token>` and handles missing/malformed headers explicitly (`401`) | Frequently assumed `req.headers.authorization` was always formatted correctly, throwing unhandled `TypeError` |
| **Error Status Codes** | Correctly maps Supabase auth failures to honest HTTP status codes (`400` vs `401` vs `204`) | Defaulted all errors to generic `500 Internal Server Error` or generic `400` |
| **Middleware Isolation** | Reusable `requireAuth` middleware attached cleanly at router level | Inlined token checks inside individual route handlers leading to code duplication |
| **Session Clean up** | Instantiates a user-scoped Supabase client on `POST /auth/logout` to terminate the active JWT session | Called `supabase.auth.signOut()` globally without passing the request context |

---

## 📁 Repository Structure

```
week4-auth/
├── openapi.json                 # OpenAPI 3.0 specification for Swagger UI
├── package.json                 # Project dependencies & scripts
├── .env.example                 # Environment variables template
├── .gitignore                   # Keeps .env out of version control
├── README.md                    # Comprehensive documentation
├── src/
│   ├── server.js                # Server entry point & route mounting
│   ├── supabaseClient.js        # Supabase client singleton initialization
│   ├── middleware/
│   │   └── requireAuth.js       # Reusable JWT authentication guard
│   └── routes/
│       ├── auth.js              # Signup, Login, Logout endpoints
│       ├── public.js            # Unprotected public endpoint
│       └── protected.js         # Protected profile and dashboard endpoints
└── tests/
    └── auth.test.js             # Automated end-to-end HTTP test suite
```
