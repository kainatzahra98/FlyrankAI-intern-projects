/**
 * app.js — Express application factory
 * -------------------------------------------------
 * Wires together:
 *   repository  (InMemory or Postgres — swapped in server.js)
 *   service     (business logic — unchanged regardless of repo)
 *   routes      (HTTP layer — unchanged regardless of repo)
 */
const express = require("express");
const ItemService = require("./services/itemService");
const makeItemsRouter = require("./routes/items");

function createApp(repository) {
  const app = express();

  // Parse JSON request bodies
  app.use(express.json());

  // Wire up layers
  const service = new ItemService(repository);
  app.use("/items", makeItemsRouter(service));

  // Health check
  app.get("/", (req, res) => {
    res.json({
      message: "Week 2 API — Items Service",
      storage: repository.constructor.name,
      endpoints: [
        "GET  /items",
        "POST /items",
        "GET  /items/:id",
        "DELETE /items/:id",
      ],
    });
  });

  // Global error handler
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  });

  return app;
}

module.exports = createApp;
