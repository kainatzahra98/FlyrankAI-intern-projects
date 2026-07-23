'use strict';

/**
 * Tasks Router
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP layer only — no business logic, no SQL here.
 *
 * Endpoints (identical API to Assignment 1 in-memory version):
 *   GET    /tasks              → list all tasks (+ optional ?search= ?done= ?orderBy=)
 *   POST   /tasks              → create task  { title }
 *   GET    /tasks/:id          → get one task
 *   PUT    /tasks/:id          → update task  { title?, done? }
 *   DELETE /tasks/:id          → delete task
 *   GET    /stats              → task statistics (optional extra)
 */
const { Router } = require('express');

function makeTasksRouter(service) {
  const router = Router();

  // ── Stage 1: GET /tasks ────────────────────────────────────────────────────
  router.get('/', async (req, res, next) => {
    try {
      // Optional extras: ?search=milk  ?done=true  ?orderBy=title
      const { search, done, orderBy } = req.query;
      const tasks = await service.getAllTasks({ search, done, orderBy });
      res.json({ data: tasks, count: tasks.length });
    } catch (err) {
      next(err);
    }
  });

  // ── Stage 1: GET /tasks/:id ────────────────────────────────────────────────
  router.get('/:id', async (req, res, next) => {
    try {
      const task = await service.getTaskById(req.params.id);
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  // ── Stage 2: POST /tasks ───────────────────────────────────────────────────
  router.post('/', async (req, res, next) => {
    try {
      const task = await service.createTask(req.body);
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  });

  // ── Stage 3: PUT /tasks/:id ────────────────────────────────────────────────
  router.put('/:id', async (req, res, next) => {
    try {
      const task = await service.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (err) {
      next(err);
    }
  });

  // ── Stage 3: DELETE /tasks/:id ────────────────────────────────────────────
  router.delete('/:id', async (req, res, next) => {
    try {
      const result = await service.deleteTask(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = makeTasksRouter;
