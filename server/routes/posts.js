// server/routes/posts.js — everything under /api/posts
//
// Data flow:  browser → fetch('/api/posts') → this file → SQL → Neon
//             Neon → rows → res.json(rows) → browser draws them

import { Router } from 'express';
import { query } from '../db.js';
import { requireLogin } from './auth.js';
import { summarise } from '../ai.js';

const router = Router();

// GET /api/posts — newest first.
// Optional filters in the URL:  /api/posts?q=elf&category=Film
// We build the WHERE clause piece by piece, but the values still go in
// as $1, $2… placeholders, never pasted into the SQL string.
router.get('/', async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    const q = String(req.query.q ?? '').trim().slice(0, 100);
    if (q) {
      // Escape % and _ so they're searched for literally, not as wildcards
      params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
      // ILIKE = case-insensitive match. Search both title and body.
      conditions.push(`(title ILIKE $${params.length} OR body ILIKE $${params.length})`);
    }

    const category = String(req.query.category ?? '').trim();
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const posts = await query(
      `SELECT id, title, category, body, summary, created_at FROM posts ${where} ORDER BY created_at DESC`,
      params,
    );
    res.json(posts);
  } catch (err) { next(err); }
});

// GET /api/posts/categories — the categories that actually have posts
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await query('SELECT category, COUNT(*)::int AS count FROM posts GROUP BY category ORDER BY category');
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/posts/:id — one post
router.get('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const [post] = await query(
      'SELECT id, title, category, body, summary, created_at FROM posts WHERE id = $1',
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
       RETURNING id, title, category, body, summary, created_at`,
      [title, category, body, req.session.userId],
    );

    // Ask the AI for a summary. If it fails, the post is still saved:
    // the summary is a bonus, not something that should block publishing.
    try {
      post.summary = await summarise(title, body);
      if (post.summary) {
        await query('UPDATE posts SET summary = $1 WHERE id = $2', [post.summary, post.id]);
      }
    } catch (err) {
      console.error('AI summary failed:', err.message);
    }

    res.status(201).json(post);
  } catch (err) { next(err); }
});

// POST /api/posts/:id/summary — (re)generate the AI summary for an existing post
router.post('/:id/summary', requireLogin, async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const [post] = await query('SELECT id, title, body FROM posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let summary;
    try {
      summary = await summarise(post.title, post.body);
    } catch (err) {
      console.error('AI summary failed:', err.message);
      return res.status(502).json({ error: 'The AI did not answer. Try again in a moment.' });
    }
    if (!summary) return res.status(503).json({ error: 'AI summaries are not set up (no API key)' });

    await query('UPDATE posts SET summary = $1 WHERE id = $2', [summary, post.id]);
    res.json({ summary });
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
