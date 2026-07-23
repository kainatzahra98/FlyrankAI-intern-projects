'use strict';

/**
 * TaskService — Business logic layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure business logic. Knows nothing about HTTP, SQL, or storage.
 * Receives a repository in its constructor (SqliteRepository or any other).
 * This file would NOT change if you switched to Postgres or MongoDB.
 */
class TaskService {
  constructor(repository) {
    this.repo = repository;
  }

  // ── Stage 1: Read ───────────────────────────────────────────────────────────

  async getAllTasks(query = {}) {
    return this.repo.findAll(query);
  }

  async getTaskById(id) {
    const task = await this.repo.findById(id);
    if (!task) {
      const err = new Error(`Task with id ${id} not found`);
      err.status = 404;
      throw err;
    }
    return task;
  }

  // ── Stage 2: Create ─────────────────────────────────────────────────────────

  async createTask({ title }) {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      const err = new Error('"title" is required and must be a non-empty string');
      err.status = 400;
      throw err;
    }
    return this.repo.create({ title: title.trim() });
  }

  // ── Stage 3: Update ─────────────────────────────────────────────────────────

  async updateTask(id, patch) {
    // Validate fields if provided
    if (patch.title !== undefined) {
      if (typeof patch.title !== 'string' || patch.title.trim() === '') {
        const err = new Error('"title" must be a non-empty string');
        err.status = 400;
        throw err;
      }
      patch = { ...patch, title: patch.title.trim() };
    }
    if (patch.done !== undefined && typeof patch.done !== 'boolean') {
      const err = new Error('"done" must be a boolean');
      err.status = 400;
      throw err;
    }

    const updated = await this.repo.update(id, patch);
    if (!updated) {
      const err = new Error(`Task with id ${id} not found`);
      err.status = 404;
      throw err;
    }
    return updated;
  }

  // ── Stage 3: Delete ─────────────────────────────────────────────────────────

  async deleteTask(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = new Error(`Task with id ${id} not found`);
      err.status = 404;
      throw err;
    }
    return { deleted: true, id: Number(id) };
  }

  // ── Optional extra: Stats ────────────────────────────────────────────────────

  async getStats() {
    return this.repo.stats();
  }
}

module.exports = TaskService;
