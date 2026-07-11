/**
 * InMemoryRepository
 * -------------------------------------------------
 * Implements the repository interface using a plain
 * JavaScript array. No persistence — data is lost on restart.
 *
 * Interface (same as PostgresRepository):
 *   findAll()          → Promise<Item[]>
 *   findById(id)       → Promise<Item | null>
 *   create({ name, description }) → Promise<Item>
 *   delete(id)         → Promise<boolean>
 */
class InMemoryRepository {
  constructor() {
    this._store = [];
    this._nextId = 1;
  }

  async findAll() {
    return [...this._store];
  }

  async findById(id) {
    return this._store.find((item) => item.id === Number(id)) || null;
  }

  async create({ name, description = "" }) {
    const item = {
      id: this._nextId++,
      name,
      description,
      created_at: new Date().toISOString(),
    };
    this._store.push(item);
    return item;
  }

  async delete(id) {
    const index = this._store.findIndex((item) => item.id === Number(id));
    if (index === -1) return false;
    this._store.splice(index, 1);
    return true;
  }
}

module.exports = InMemoryRepository;
