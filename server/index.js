// server/index.js
// The server is the "middleman" between the browser and everything secret
// (database, AI API keys). The browser never talks to Neon or the AI directly.

import 'dotenv/config';          // 1. Load secrets from the .env file into process.env
import express from 'express';   // 2. Express = a small library for building web servers
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedPosts } from './seed-posts.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Work out where the /public folder is on disk
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// 3. Let the server read JSON sent from the browser (e.g. a new blog post)
app.use(express.json());

// 4. Serve everything in /public (HTML, CSS, JS, images) as-is
app.use(express.static(publicDir));

// /blog shows the journal page
app.get('/blog', (req, res) => res.sendFile(path.join(publicDir, 'blog.html')));

// 5. A tiny test route. Visit http://localhost:3000/api/health to check the server is alive.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Stage 1: posts come from a plain array. Each gets an id and a date.
const posts = seedPosts.map((p, i) => ({
  id: i + 1,
  ...p,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
}));

// List of all posts (newest first)
app.get('/api/posts', (req, res) => {
  res.json(posts);
});

// One post by id. req.params.id comes from the :id part of the URL.
app.get('/api/posts/:id', (req, res) => {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// 6. Start listening for requests
app.listen(PORT, () => {
  console.log(`Iceberg is surfacing at http://localhost:${PORT}`);
});
