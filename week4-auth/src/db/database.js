'use strict';

/**
 * Pure-JS JSON file database.
 * ─────────────────────────────────────────────────────────────────────────────
 * Stores user records in  data/users.json  (created automatically).
 * No native modules – works on any Node version, any OS.
 *
 * Schema per user:
 *   { id, username, email, password (bcrypt hash), role, created_at }
 */

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.resolve(process.env.DB_PATH || './data/users.json');

// In-memory cache so we don't hit the disk on every read
let _users = null;

// ── Private helpers ───────────────────────────────────────────────────────────

function _read() {
  if (_users !== null) return _users;
  try {
    _users = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    _users = [];
  }
  return _users;
}

function _write(users) {
  _users = users;
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// ── Public API ────────────────────────────────────────────────────────────────

const db = {
  /** Return all users (no filtering). */
  findAll() {
    return _read();
  },

  /** Find one user by a predicate function. */
  findOne(predicate) {
    return _read().find(predicate) || null;
  },

  /** Insert a new user. Assigns an auto-increment id and returns the record. */
  insert(fields) {
    const users = _read();
    const id = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const user = {
      id,
      ...fields,
      role:       fields.role || 'user',
      created_at: new Date().toISOString(),
    };
    users.push(user);
    _write(users);
    return user;
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────

async function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');
  _read(); // warm cache
  console.log(`✅  Database ready at ${DB_FILE}`);
}

function getDb() {
  return db;
}

module.exports = { initDb, getDb };
