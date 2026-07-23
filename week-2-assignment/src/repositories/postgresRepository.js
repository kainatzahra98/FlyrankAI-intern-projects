/**
 * PostgresRepository
 * -------------------------------------------------
 * Implements the EXACT same interface as InMemoryRepository
 * but persists data to a Postgres table called `items`.
 *
 * Interface:
 *   findAll()          → Promise<Item[]>
 *   findById(id)       → Promise<Item | null>
 *   create({ name, description }) → Promise<Item>
 *   delete(id)         → Promise<boolean>
 */
const pool = require("../db");

class PostgresRepository {
  async findAll() {
    const { rows } = await pool.query(
      "SELECT * FROM items ORDER BY created_at DESC"
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query("SELECT * FROM items WHERE id = $1", [id]);
    return rows[0] || null;
  }

  async create({ name, description = "" }) {
    const { rows } = await pool.query(
      "INSERT INTO items (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );
    return rows[0];
  }

  async delete(id) {
    const { rowCount } = await pool.query("DELETE FROM items WHERE id = $1", [id]);
    return rowCount > 0;
  }
}

module.exports = PostgresRepository;
