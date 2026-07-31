'use strict';

/**
 * Admin & Tenant Management Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides:
 *   - /api/auth/register & /api/auth/login
 *   - Widget CRUD (/api/widgets) with tenant isolation
 *   - Submissions Dashboard & Analytics (/api/submissions, /api/widgets/:id/stats)
 */

const { Router } = require('express');
const jwt = require('jsonwebtoken');
const widgetStore = require('../repositories/widgetStore');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-capstone-jwt-key-2026';

// ── Auth Endpoints ───────────────────────────────────────────────────────────

router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, company } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await widgetStore.createUser({ email, password, company });
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    return res.status(201).json({ message: 'Registration successful', token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await widgetStore.validateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ message: 'Login successful', token, user });
  } catch (err) {
    next(err);
  }
});

// ── Protected Widget Admin CRUD ───────────────────────────────────────────────

router.use('/widgets', requireAuth);

// GET /api/widgets — List tenant's widgets
router.get('/widgets', async (req, res, next) => {
  try {
    const widgets = await widgetStore.getWidgetsByTenant(req.user.id);
    return res.json({ count: widgets.length, data: widgets });
  } catch (err) {
    next(err);
  }
});

// POST /api/widgets — Create widget
router.post('/widgets', async (req, res, next) => {
  try {
    const widget = await widgetStore.createWidget(req.user.id, req.body);
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers.host || 'localhost:4000';
    const embedSnippet = `<script src="${proto}://${host}/cdn/widget.js" data-widget-id="${widget.id}" async></script>`;

    return res.status(201).json({
      message: 'Widget created successfully',
      widget,
      embed_snippet: embedSnippet
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/widgets/:id — Get widget details
router.get('/widgets/:id', async (req, res, next) => {
  try {
    const widget = await widgetStore.getWidgetById(req.params.id);
    if (!widget || widget.tenant_id !== req.user.id) {
      return res.status(404).json({ error: 'Widget not found or unauthorized.' });
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers.host || 'localhost:4000';
    const embedSnippet = `<script src="${proto}://${host}/cdn/widget.js" data-widget-id="${widget.id}" async></script>`;
    return res.json({ widget, embed_snippet: embedSnippet });
  } catch (err) {
    next(err);
  }
});

// PUT /api/widgets/:id — Update widget
router.put('/widgets/:id', async (req, res, next) => {
  try {
    const updated = await widgetStore.updateWidget(req.params.id, req.user.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Widget not found or unauthorized.' });
    }
    return res.json({ message: 'Widget updated successfully', widget: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/widgets/:id — Delete widget
router.delete('/widgets/:id', async (req, res, next) => {
  try {
    const deleted = await widgetStore.deleteWidget(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Widget not found or unauthorized.' });
    }
    return res.json({ message: 'Widget deleted successfully', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

// ── Protected Submissions Dashboard & Analytics ───────────────────────────────

router.get('/submissions', requireAuth, async (req, res, next) => {
  try {
    const { widget_id, is_spam } = req.query;
    const submissions = await widgetStore.getSubmissions(req.user.id, { widget_id, is_spam });
    return res.json({ count: submissions.length, data: submissions });
  } catch (err) {
    next(err);
  }
});

router.get('/widgets/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const stats = await widgetStore.getWidgetStats(req.params.id, req.user.id);
    if (!stats) {
      return res.status(404).json({ error: 'Widget not found or unauthorized.' });
    }
    return res.json({ stats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
