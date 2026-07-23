-- Week 2 Assignment — Postgres init script
-- Run once to create the items table.

CREATE TABLE IF NOT EXISTS items (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
