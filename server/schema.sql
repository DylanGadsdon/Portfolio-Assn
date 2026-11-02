-- server/schema.sql — the shape of the database.
-- "IF NOT EXISTS" makes this safe to run again: existing tables are left alone.

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,               -- 1, 2, 3… assigned automatically
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Journal',
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stage 3: accounts. We never store the password itself, only a bcrypt hash of it.
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- (The "session" table for logins is created automatically by connect-pg-simple.)

-- Stage 4: remember who wrote each post
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id INT REFERENCES users(id);
