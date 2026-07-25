'use strict';

/**
 * server.js — Entry Point (Week 4 — Auth Login & Protect)
 * ─────────────────────────────────────────────────────────────────────────────
 * Stages wired here:
 *   Stage 0 — Supabase client + server startup
 *   Stage 1 — /auth routes (signup, login, logout)
 *   Stage 2 — /public and /protected routes
 *   Stage 3 — token verification inside requireAuth middleware
 *   Stage 4 — middleware applied at router level (protected.js)
 *   Stage 5 — Swagger UI at /docs
 */

require('dotenv').config();

const express      = require('express');
const swaggerUi    = require('swagger-ui-express');
const openApiSpec  = require('../openapi.json');

// Import route modules
const authRoutes      = require('./routes/auth');
const publicRoutes    = require('./routes/public');
const protectedRoutes = require('./routes/protected');

// Trigger Supabase client init (exits if env vars missing)
require('./supabaseClient');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(express.json());

// ── Stage 5: Swagger UI at /docs ──────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  swaggerOptions: {
    // Pre-fill the Authorize dialog with Bearer scheme
    persistAuthorization: true,
  },
  customSiteTitle: 'W4 Auth API — Supabase',
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/public',    publicRoutes);
app.use('/protected', protectedRoutes);

// ── Root health check ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message:  '🔐  W4 Auth API — Supabase + JWT',
    docs:     `http://localhost:${PORT}/docs`,
    endpoints: {
      open:      ['GET /public/info'],
      auth:      ['POST /auth/signup', 'POST /auth/login', 'POST /auth/logout'],
      protected: ['GET /protected/profile', 'GET /protected/dashboard'],
    },
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Server running and connected to Supabase`);
  console.log(`    Local:  http://localhost:${PORT}`);
  console.log(`    Docs:   http://localhost:${PORT}/docs\n`);
  console.log('  Endpoints:');
  console.log('    GET    /public/info         (no auth)');
  console.log('    POST   /auth/signup         (register)');
  console.log('    POST   /auth/login          (get JWT)');
  console.log('    POST   /auth/logout         (🔒 protected)');
  console.log('    GET    /protected/profile   (🔒 protected)');
  console.log('    GET    /protected/dashboard (🔒 protected)\n');
});
