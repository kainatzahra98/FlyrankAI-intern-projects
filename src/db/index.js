const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Quick connectivity check on startup
pool.on("connect", () => {
  console.log("[db] Connected to Postgres");
});

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client", err);
  process.exit(-1);
});

module.exports = pool;
