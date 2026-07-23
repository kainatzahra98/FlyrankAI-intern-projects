'use strict';

/**
 * server.js — Entry point
 * ─────────────────────────────────────────────────────────────────────────────
 * Initialises the SQLite database, then starts the Express server.
 * To switch back to in-memory storage swap the repository below.
 */

const { initDb }          = require('./db/db');
const SqliteRepository    = require('./repositories/sqliteRepository');
const createApp           = require('./app');

const PORT = process.env.PORT || 4000;

(async () => {
  // Stage 0: boot database (creates file + table + seeds if first run)
  await initDb();

  const repository = new SqliteRepository();
  const app        = createApp(repository);

  app.listen(PORT, () => {
    console.log(`\n🚀  W3·A1 Tasks API running on http://localhost:${PORT}`);
    console.log(`    Storage: ${repository.constructor.name}`);
    console.log(`    DB file: data/tasks.db\n`);
    console.log('  Endpoints:');
    console.log('    GET    /tasks');
    console.log('    POST   /tasks');
    console.log('    GET    /tasks/:id');
    console.log('    PUT    /tasks/:id');
    console.log('    DELETE /tasks/:id');
    console.log('    GET    /stats\n');
  });
})();
