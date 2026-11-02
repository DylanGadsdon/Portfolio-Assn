// server/routes/auth.js — sign in, sign out, "who am I?"
//
// How it works:
// 1. The browser sends username + password to POST /api/auth/login.
// 2. We look up the user and let bcrypt compare the password with the stored hash.
// 3. If it matches, we write the user's id into their *session*. The session lives
//    in the database; the browser only gets a random session id in a cookie.
// 4. On every later request the browser sends that cookie back automatically,
//    so the server knows who it's talking to.
// 5. Sign out = destroy the session. The cookie then points at nothing.

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

const router = Router();

// Middleware: put this in front of any route that needs a signed-in user.
export function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You need to sign in first' });
  }
  next();
}

// POST /api/auth/login  { username, password }
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [user] = await query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username.trim().toLowerCase()],
    );

    // Same message whether the username or the password was wrong,
    // so nobody can use the form to find out which usernames exist.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'Wrong username or password' });

    // New session id on login (protects against "session fixation")
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ username: user.username });
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('iceberg.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me → { username } or { username: null }
router.get('/me', (req, res) => {
  res.json({ username: req.session.username ?? null });
});

export default router;
