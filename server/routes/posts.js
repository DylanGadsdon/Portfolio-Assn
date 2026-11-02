// server/routes/posts.js — everything under /api/posts
//
// Data flow:  browser → fetch('/api/posts') → this file → SQL → Neon
//             Neon → rows → res.json(rows) → browser draws them

import { Router } from 'express';
import { query } from '../db.js';

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

export default router;
