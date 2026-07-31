'use strict';

/**
 * SqliteRepository
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements CRUD + extras using sql.js (pure-JS SQLite WASM).
 *
 * sql.js quirk: exec() with bind params is unreliable in some builds.
 * Strategy used here:
 *   - db.run() with [params] for INSERT/UPDATE/DELETE (works reliably)
 *   - db.exec() with NO params, using escaped literal interpolation for SELECT
 *   - Integer ids are cast to Number — safe to interpolate directly
 *   - String values are escaped via sqlStr() before interpolation
 *
 * Interface:
 *   findAll({ search?, done?, orderBy? })  → Promise<Task[]>
 *   findById(id)                           → Promise<Task | null>
 *   create({ title })                      → Promise<Task>
 *   update(id, { title?, done? })          → Promise<Task | null>
 *   delete(id)                             → Promise<boolean>
 *   stats()                                → Promise<StatsObject>
 */

const { getDb, save } = require('../db/db');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert sql.js exec() result to array of plain objects.
 * result format: [{ columns: string[], values: any[][] }]
 */
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      // SQLite stores booleans as integers; convert done to JS boolean
      obj[col] = col === 'done' ? row[i] === 1 : row[i];
    });
    return obj;
  });
}

/**
 * Escape a string for safe SQL literal interpolation.
 * Doubles any single-quotes inside the value.
 */
function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

// ── Repository ────────────────────────────────────────────────────────────────

class SqliteRepository {

  // ── Stage 1: Read ───────────────────────────────────────────────────────────

  /**
   * findAll — Stage 1 + optional extras (search, filter, sort)
   */
  async findAll({ search, done, orderBy } = {}) {
    const db = getDb();
    const clauses = [];

    if (search) {
      // sqlStr handles escaping; LIKE wildcards added outside the quoted value
      const escaped = String(search).replace(/'/g, "''");
      clauses.push(`title LIKE '%${escaped}%'`);
    }
    if (done === 'true')  clauses.push('done = 1');
    if (done === 'false') clauses.push('done = 0');

    const whereSQL  = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeOrder = orderBy === 'title' ? 'title' : 'created_at';
    const sql = `SELECT * FROM tasks ${whereSQL} ORDER BY ${safeOrder};`;

    return rowsToObjects(db.exec(sql));
  }

  /**
   * findById — Stage 1
   */
  async findById(id) {
    const db    = getDb();
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId <= 0) return null;
    // Safe: numId is always an integer — no injection risk
    const result = db.exec(`SELECT * FROM tasks WHERE id = ${numId};`);
    const rows   = rowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  }

  // ── Stage 2: Create ─────────────────────────────────────────────────────────

  /**
   * create — Stage 2
   */
  async create({ title }) {
    const db = getDb();
    db.run('INSERT INTO tasks (title) VALUES (?);', [title]);

    // Get the new row's id BEFORE calling save() — sql.js db.export()
    // can reset the internal last_insert_rowid state.
    const idRes = db.exec('SELECT last_insert_rowid() AS id;');
    const newId = idRes[0].values[0][0];

    save(); // persist to disk after capturing the id

    return this.findById(newId);
  }

  // ── Stage 3: Update ─────────────────────────────────────────────────────────

  /**
   * update — Stage 3
   * Accepts partial patch: { title?, done? }
   */
  async update(id, patch) {
    const db       = getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    const newTitle = patch.title !== undefined ? patch.title        : existing.title;
    const newDone  = patch.done  !== undefined ? (patch.done ? 1 : 0) : (existing.done ? 1 : 0);
    const numId    = Number(id);

    db.run(
      `UPDATE tasks SET title = ?, done = ?, updated_at = datetime('now') WHERE id = ?;`,
      [newTitle, newDone, numId]
    );
    save();

    return this.findById(numId);
  }

  // ── Stage 3: Delete ─────────────────────────────────────────────────────────

  /**
   * delete — Stage 3
   */
  async delete(id) {
    const existing = await this.findById(id);
    if (!existing) return false;

    const db = getDb();
    db.run('DELETE FROM tasks WHERE id = ?;', [Number(id)]);
    save();
    return true;
  }

  // ── Optional extra: Stats ────────────────────────────────────────────────────

  /**
   * stats — uses SQL COUNT / SUM, no JS counting
   */
  async stats() {
    const db     = getDb();
    const result = db.exec(`
      SELECT
        COUNT(*)             AS total,
        SUM(done)            AS completed,
        COUNT(*) - SUM(done) AS pending
      FROM tasks;
    `);
    if (!result || result.length === 0) return { total: 0, completed: 0, pending: 0 };
    const { columns, values } = result[0];
    const obj = {};
    columns.forEach((col, i) => { obj[col] = values[0][i] || 0; });
    return obj;
  }
}

module.exports = SqliteRepository;
