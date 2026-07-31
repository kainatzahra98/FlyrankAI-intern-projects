'use strict';

/**
 * db.js — SQLite database singleton
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses sql.js (pure-JS SQLite compiled to WASM) so zero native compilation
 * is needed. Works on any Node version or OS out of the box.
 *
 * The database is persisted to data/tasks.db as a binary SQLite file.
 * You can open that file with DB Browser for SQLite to run raw SQL.
 *
 * Stage 0 requirements:
 *   ✓ Create tasks.db on first run
 *   ✓ Create the `tasks` table if it doesn't already exist
 *   ✓ Seed three example tasks only if the table is empty
 */

const fs      = require('fs');
const path    = require('path');
const initSqlJs = require('sql.js');

const DB_DIR  = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DB_DIR, 'tasks.db');

let _db = null; // singleton

// ── Persistence helpers ───────────────────────────────────────────────────────

/** Save the in-memory database back to the .db file (call after every write). */
function _persist(db) {
  const data = db.export(); // Uint8Array of the SQLite binary
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// ── Public init ───────────────────────────────────────────────────────────────

/**
 * initDb()
 * Must be called once at startup (await it). Returns the db instance.
 */
async function initDb() {
  if (_db) return _db;

  // Ensure the data/ directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs(); // load WASM synchronously from bundled file

  // Load existing file or create fresh database
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    _db = new SQL.Database(fileBuffer);
    console.log(`✅  Loaded existing database: ${DB_FILE}`);
  } else {
    _db = new SQL.Database();
    console.log(`✅  Created new database:  ${DB_FILE}`);
  }

  // ── Stage 0: schema ──────────────────────────────────────────────────────
  _db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,   -- SQLite has no BOOLEAN; 0=false 1=true
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Stage 0: seed only if table is empty ─────────────────────────────────
  const [{ values }] = _db.exec('SELECT COUNT(*) FROM tasks;');
  const count = values[0][0];

  if (count === 0) {
    const seed = _db.prepare(
      `INSERT INTO tasks (title, done) VALUES (?, ?);`
    );
    seed.run(['Buy groceries',  0]);
    seed.run(['Read the docs',  0]);
    seed.run(['Write unit tests', 0]);
    seed.free();
    console.log('🌱  Seeded 3 example tasks.');
  }

  _persist(_db);
  return _db;
}

/** Return the open database instance (call initDb first). */
function getDb() {
  if (!_db) throw new Error('Database not initialised — call initDb() first.');
  return _db;
}

/** Save changes to disk. Call after every INSERT / UPDATE / DELETE. */
function save() {
  _persist(_db);
}

module.exports = { initDb, getDb, save };
