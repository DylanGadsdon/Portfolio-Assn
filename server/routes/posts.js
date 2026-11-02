// server/routes/posts.js — everything under /api/posts
//
// Data flow:  browser → fetch('/api/posts') → this file → SQL → Neon
//             Neon → rows → res.json(rows) → browser draws them

import { Router } from 'express';
import { query } from '../db.js';
import { requireLogin } from './auth.js';

const router = Router();

// GET /api/posts — all posts, newest first
router.get('/', async (req, res, next) => {
  try {
    const posts = await query(
      'SELECT id, title, category, body, created_at FROM posts ORDER BY created_at DESC',
    );
    res.json(posts);
  } catch (err) { next(err); }
});

// GET /api/posts/:id — one post
router.get('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const [post] = await query(
      'SELECT id, title, category, body, created_at FROM posts WHERE id = $1',
      [req.params.id],
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) { next(err); }
});

// POST /api/posts — create a post. requireLogin runs first and stops
// anyone who isn't signed in with a 401 before this code is reached.
router.post('/', requireLogin, async (req, res, next) => {
  try {
    const title = String(req.body?.title ?? '').trim();
    const body = String(req.body?.body ?? '').trim();
    const category = String(req.body?.category ?? '').trim() || 'Journal';

    // Never trust the browser: check everything again on the server
    if (!title || title.length > 150) {
      return res.status(400).json({ error: 'Title is required (max 150 characters)' });
    }
    if (!body || body.length > 20000) {
      return res.status(400).json({ error: 'Text is required (max 20,000 characters)' });
    }
    if (category.length > 30) {
      return res.status(400).json({ error: 'Category is too long (max 30 characters)' });
    }

    // RETURNING gives us back the new row, including the id Postgres assigned
    const [post] = await query(
      `INSERT INTO posts (title, category, body, author_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, category, body, created_at`,
      [title, category, body, req.session.userId],
    );
    res.status(201).json(post);
  } catch (err) { next(err); }
});

export default router;
