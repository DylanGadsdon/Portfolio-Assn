// server/index.js
// The server is the "middleman" between the browser and everything secret
// (database, AI API keys). The browser never talks to Neon or the AI directly.

import 'dotenv/config';          // 1. Load secrets from the .env file into process.env
import express from 'express';   // 2. Express = a small library for building web servers
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import postsRouter from './routes/posts.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Work out where the /public folder is on disk
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// When hosted (e.g. Render), requests arrive through a proxy. This lets
// secure cookies work behind it.
if (isProduction) app.set('trust proxy', 1);

// 3. Let the server read JSON sent from the browser (e.g. a new blog post)
app.use(express.json({ limit: '100kb' }));

// 4. Sessions: remember who is signed in. Stored in the database table "session".
const PgStore = connectPgSimple(session);
app.use(session({
  name: 'iceberg.sid',
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,   // used to sign the cookie so it can't be forged
  resave: false,
  saveUninitialized: false,             // no cookie until someone actually signs in
  cookie: {
    httpOnly: true,                     // JavaScript in the page can't read the cookie
    sameSite: 'lax',                    // not sent on requests from other sites
    secure: isProduction,               // HTTPS only when hosted
    maxAge: 1000 * 60 * 60 * 24 * 7,    // one week
  },
}));

// 5. Serve everything in /public (HTML, CSS, JS, images) as-is
app.use(express.static(publicDir));

// /blog shows the journal page
app.get('/blog', (req, res) => res.sendFile(path.join(publicDir, 'blog.html')));

// 6. API routes. Every data request starts with /api/
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);

// 7. If anything above throws an error, end up here instead of crashing
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// 8. Start listening for requests
app.listen(PORT, () => {
  console.log(`Iceberg is surfacing at http://localhost:${PORT}`);
});
