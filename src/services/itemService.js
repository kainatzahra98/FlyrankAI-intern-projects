/**
 * ItemService
 * -------------------------------------------------
 * Pure business logic. Knows nothing about HTTP or SQL.
 * Receives a repository in its constructor — can work
 * with InMemoryRepository OR PostgresRepository.
 * This file never changes when you swap storage.
 */
class ItemService {
  constructor(repository) {
    this.repo = repository;
  }

  async getAllItems() {
    return this.repo.findAll();
  }

  async getItemById(id) {
    const item = await this.repo.findById(id);
    if (!item) {
      const err = new Error(`Item with id ${id} not found`);
      err.status = 404;
      throw err;
    }
    return item;
  }

  async createItem({ name, description }) {
    if (!name || typeof name !== "string" || name.trim() === "") {
      const err = new Error('"name" is required and must be a non-empty string');
      err.status = 400;
      throw err;
    }
    return this.repo.create({ name: name.trim(), description });
  }

  async deleteItem(id) {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      const err = new Error(`Item with id ${id} not found`);
      err.status = 404;
      throw err;
    }
    return { deleted: true };
  }
}

module.exports = ItemService;
