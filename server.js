// Week 1 Assignment — Minimal JSON API Server
// Two endpoints:
//   GET /         → { "message": "Hello, World!" }
//   GET /about    → { "name": "My Server", "version": "1.0.0", "author": "Flyrankai" }

const http = require("http");

const PORT = 4000;

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end(JSON.stringify({ message: "Hello, World!" }));
  } else if (req.method === "GET" && req.url === "/about") {
    res.writeHead(200);
    res.end(
      JSON.stringify({ name: "My Server", version: "1.0.0", author: "Flyrankai" })
    );
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`  GET http://localhost:${PORT}/`);
  console.log(`  GET http://localhost:${PORT}/about`);
});
