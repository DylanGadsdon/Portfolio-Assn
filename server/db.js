// server/db.js — the single connection point to PostgreSQL (Neon).
//
// A "pool" keeps a few database connections open and reuses them,
// instead of opening a new connection for every request (which is slow).
// The address, username and password all live in DATABASE_URL in .env.

import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env and fill it in.');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// query('SELECT * FROM posts WHERE id = $1', [3])
// $1, $2… are placeholders. The values are sent separately from the SQL,
// so user input can never change the SQL itself. This prevents "SQL injection".
export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}
