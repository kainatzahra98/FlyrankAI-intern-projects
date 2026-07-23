'use strict';

require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const { initDb } = require('./db/database');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json());

// Rate limiter: max 20 requests per minute per IP (prevents brute-force)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests – slow down.' },
});
app.use(limiter);

// ── Routes ────────────────────────────────────────────────────────────────────

// Public auth routes
app.use('/auth', authRoutes);

// Protected routes (JWT required)
app.use('/api', protectedRoutes);

// Health check (public, no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Central error handler
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

(async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀  Week 4 Auth Server running on http://localhost:${PORT}`);
    console.log('────────────────────────────────────────');
    console.log('  POST /auth/register  – create an account');
    console.log('  POST /auth/login     – get a JWT token');
    console.log('  GET  /api/me         – protected: who am I?');
    console.log('  GET  /api/secret     – protected: secret data');
    console.log('  GET  /health         – public: health check');
    console.log('────────────────────────────────────────\n');
  });
})();
