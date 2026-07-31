/**
 * server.js — Entry point
 * -------------------------------------------------
 * THIS IS THE ONLY FILE THAT CHANGED when we swapped
 * from InMemoryRepository to PostgresRepository.
 *
 * The service, routes, and app.js are 100% identical
 * regardless of which repository is used.
 *
 * To switch back to in-memory: swap the require() below.
 */
require("dotenv").config();

const createApp = require("./app");

// ── SWAP STORAGE HERE ────────────────────────────────────────────────────────
// const InMemoryRepository = require("./repositories/inMemoryRepository");
// const repository = new InMemoryRepository();

const PostgresRepository = require("./repositories/postgresRepository");
const repository = new PostgresRepository();
// ─────────────────────────────────────────────────────────────────────────────

const app = createApp(repository);
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] Storage: ${repository.constructor.name}`);
});
