-- server/schema.sql — the shape of the database.
-- "IF NOT EXISTS" makes this safe to run again: existing tables are left alone.

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,               -- 1, 2, 3… assigned automatically
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Journal',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
