/**
 * Items Router
 * -------------------------------------------------
 * HTTP layer only — no business logic, no SQL here.
 * Receives an ItemService instance (already wired to a repo).
 *
 * Endpoints:
 *   GET    /items        → list all items
 *   POST   /items        → create item  { name, description? }
 *   GET    /items/:id    → get one item
 *   DELETE /items/:id    → delete item
 */
const { Router } = require("express");

function makeItemsRouter(service) {
  const router = Router();

  // GET /items
  router.get("/", async (req, res, next) => {
    try {
      const items = await service.getAllItems();
      res.json({ data: items, count: items.length });
    } catch (err) {
      next(err);
    }
  });

  // POST /items
  router.post("/", async (req, res, next) => {
    try {
      const item = await service.createItem(req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  // GET /items/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const item = await service.getItemById(req.params.id);
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /items/:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const result = await service.deleteItem(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = makeItemsRouter;
