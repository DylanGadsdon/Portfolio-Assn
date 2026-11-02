// scripts/setup-db.js — run with: npm run db:setup
// 1. Creates the tables described in server/schema.sql
// 2. If the posts table is empty, fills it with the starter posts

import 'dotenv/config';
import fs from 'node:fs/promises';
import { pool, query } from '../server/db.js';
import { seedPosts } from '../server/seed-posts.js';

const schema = await fs.readFile(new URL('../server/schema.sql', import.meta.url), 'utf8');
await pool.query(schema);
console.log('Tables ready.');

const [{ count }] = await query('SELECT COUNT(*)::int AS count FROM posts');
if (count === 0) {
  // Insert oldest first so the newest seed post gets the highest id
  const reversed = [...seedPosts].reverse();
  for (const [i, p] of reversed.entries()) {
    await query(
      `INSERT INTO posts (title, category, body, video_url, link_url, featured, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() - ($7 || ' days')::interval)`,
      [p.title, p.category, p.body, p.video_url ?? null, p.link_url ?? null, p.featured ?? false,
       reversed.length - 1 - i],
    );
  }
  console.log(`Added ${seedPosts.length} starter posts.`);
} else {
  console.log(`Posts table already has ${count} posts. Skipping seed.`);
}

await pool.end();
