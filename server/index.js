// server/index.js
// The server is the "middleman" between the browser and everything secret
// (database, AI API keys). The browser never talks to Neon or the AI directly.

import 'dotenv/config';          // 1. Load secrets from the .env file into process.env
import express from 'express';   // 2. Express = a small library for building web servers
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postsRouter from './routes/posts.js';

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

// 5. API routes. Every data request starts with /api/
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
app.use('/api/posts', postsRouter);

// 6. If anything above throws an error, end up here instead of crashing
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// 7. Start listening for requests
app.listen(PORT, () => {
  console.log(`Iceberg is surfacing at http://localhost:${PORT}`);
});
