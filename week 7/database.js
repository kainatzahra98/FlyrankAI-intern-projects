const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:'); // In-memory database for testing

// Initialize dummy data
db.serialize(() => {
  db.run("CREATE TABLE sales (id INTEGER PRIMARY KEY, region TEXT, revenue REAL, date TEXT)");
  
  const insert = db.prepare("INSERT INTO sales (region, revenue, date) VALUES (?, ?, ?)");
  insert.run("North America", 15000, "2023-10-01");
  insert.run("North America", 20000, "2023-10-02");
  insert.run("Europe", 12000, "2023-10-01");
  insert.run("Europe", 18000, "2023-10-02");
  insert.run("Asia", 8000, "2023-10-01");
  insert.run("Asia", 10000, "2023-10-02");
  insert.finalize();
});

const getSalesAggregation = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT region, SUM(revenue) as total_revenue, COUNT(*) as sales_count 
      FROM sales 
      GROUP BY region
      ORDER BY total_revenue DESC
    `;
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = { getSalesAggregation };
