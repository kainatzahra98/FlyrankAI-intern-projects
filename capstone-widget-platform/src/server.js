'use strict';

/**
 * Server Entry Point — Capstone Embeddable Widget Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Origin Public Internet Input Platform:
 *   - Serves CDN Script & Config with Cache Headers
 *   - Dynamic CORS & Preflight Handling
 *   - Input Boundary Validation & Rate Limiting (5 reqs/min)
 *   - Spam Detection (Honeypot + Bot Speed Tokens)
 *   - IP -> Geo Fallback Chain (Provider 1 -> Provider 2 -> Fallback)
 *   - Safe Side-Effects (Webhook / Email Notification Isolation)
 *   - Tenant-Isolated Admin Widget CRUD & Dashboard Stats
 */

require('dotenv').config();

const express = require('express');
const path = require('path');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Body parsing with 100KB size limit safety
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Serve CDN Embed Assets (Cross-Origin JavaScript) ──────────────────────────
app.use('/cdn', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes browser cache
  next();
}, express.static(path.join(__dirname, 'public/cdn')));

// ── Serve Standalone Demo / Customer Site Files ────────────────────────────────
app.use('/demo', express.static(path.join(__dirname, '../demo')));

// ── Public API Routes ─────────────────────────────────────────────────────────
app.use('/api', publicRoutes);

// ── Admin / Owner Protected Routes ───────────────────────────────────────────
app.use('/api', adminRoutes);

// ── Mock Webhook Receiver Endpoint (For Safe Side-Effect Verification) ────────
app.post('/api/mock-webhook', (req, res) => {
  console.log('[Mock Webhook] 🔔 Side-effect event received:', req.body?.event, req.body?.submission_id);
  return res.json({ status: 'received', timestamp: new Date().toISOString() });
});

// ── Root Info Endpoint ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    platform: 'FlyRank Capstone Embeddable Widget Platform',
    status: 'online',
    version: '1.0.0',
    cdn_script: `http://localhost:${PORT}/cdn/widget.js`,
    demo_customer_site: `http://localhost:${PORT}/demo/customer-site.html`,
    admin_endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login'],
      widgets: ['GET /api/widgets', 'POST /api/widgets', 'GET /api/widgets/:id', 'PUT /api/widgets/:id', 'DELETE /api/widgets/:id'],
      dashboard: ['GET /api/submissions', 'GET /api/widgets/:id/stats']
    },
    public_endpoints: {
      config: `GET /api/widgets/:id/config`,
      submit: `POST /api/submissions`
    }
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[SERVER ERROR]', err);
  }
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀  Capstone Widget Platform running on http://localhost:${PORT}`);
    console.log(`    📦  CDN Script:           http://localhost:${PORT}/cdn/widget.js`);
    console.log(`    🌐  Customer Site Demo:   http://localhost:${PORT}/demo/customer-site.html`);
    console.log(`    📊  Admin API Base:       http://localhost:${PORT}/api/widgets\n`);
  });
}

module.exports = app;
