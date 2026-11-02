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

-- Stage 5: comments. post_id links each comment to its post.
-- ON DELETE CASCADE: if a post is deleted, its comments go with it.
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  post_id     INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);

-- Stage 7: short AI-written summary shown with each post
ALTER TABLE posts ADD COLUMN IF NOT EXISTS summary TEXT;

-- Portfolio: a YouTube video, an outside link (e.g. Figma), and whether the
-- piece is "featured" (frozen into the iceberg on the front page)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_url  TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured  BOOLEAN NOT NULL DEFAULT false;
