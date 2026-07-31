const fs = require("fs");
const path = require("path");
const pool = require("./index");

async function runInit() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
    console.log("Running init.sql...");
    await pool.query(sql);
    console.log("Table created successfully (or already exists).");
  } catch (err) {
    console.error("Error running init.sql:", err);
  } finally {
    pool.end();
  }
}

runInit();
