'use strict';

/**
 * app.js — Express application factory
 * ─────────────────────────────────────────────────────────────────────────────
 * Wires together: repository → service → routes.
 * This file is identical regardless of which repository is used.
 */
const express        = require('express');
const TaskService    = require('./services/taskService');
const makeTasksRouter = require('./routes/tasks');

function createApp(repository) {
  const app = express();

  app.use(express.json());

  const service = new TaskService(repository);
  app.use('/tasks', makeTasksRouter(service));

  // ── Optional extra: GET /stats ──────────────────────────────────────────────
  app.get('/stats', async (req, res, next) => {
    try {
      const s = await service.getStats();
      res.json({ stats: s });
    } catch (err) {
      next(err);
    }
  });

  // ── Health check ────────────────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      message:   'W3·A1 — Tasks CRUD with SQLite',
      storage:   repository.constructor.name,
      database:  'data/tasks.db  (open with DB Browser for SQLite)',
      endpoints: [
        'GET    /tasks',
        'POST   /tasks',
        'GET    /tasks/:id',
        'PUT    /tasks/:id',
        'DELETE /tasks/:id',
        'GET    /stats',
        '',
        'Optional query params on GET /tasks:',
        '  ?search=milk      — LIKE filter on title',
        '  ?done=true|false  — filter by completion',
        '  ?orderBy=title    — sort by title (default: created_at)',
      ],
    });
  });

  // ── Global error handler ────────────────────────────────────────────────────
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('[ERROR]', err);
    res.status(status).json({ error: err.message });
  });

  return app;
}

module.exports = createApp;
