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

// ---------- Comments ----------
// Anyone can comment (no account needed), so we're strict about lengths.

// GET /api/posts/:id/comments — oldest first, like a conversation
router.get('/:id/comments', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const comments = await query(
      'SELECT id, name, body, created_at FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
      [req.params.id],
    );
    res.json(comments);
  } catch (err) { next(err); }
});

// POST /api/posts/:id/comments  { name, body }
router.post('/:id/comments', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    // "Honeypot": a hidden field real people never see or fill in.
    // Simple spam bots fill in every field, so if it has a value we quietly ignore it.
    if (req.body?.website) return res.status(201).json({ ok: true });

    const name = String(req.body?.name ?? '').trim();
    const body = String(req.body?.body ?? '').trim();
    if (!name || name.length > 60) {
      return res.status(400).json({ error: 'Name is required (max 60 characters)' });
    }
    if (!body || body.length > 2000) {
      return res.status(400).json({ error: 'Comment is required (max 2,000 characters)' });
    }

    const [post] = await query('SELECT id FROM posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const [comment] = await query(
      `INSERT INTO comments (post_id, name, body) VALUES ($1, $2, $3)
       RETURNING id, name, body, created_at`,
      [req.params.id, name, body],
    );
    res.status(201).json(comment);
  } catch (err) { next(err); }
});

export default router;
