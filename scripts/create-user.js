// scripts/create-user.js — run with: npm run create-user
// There's deliberately no public sign-up form: only accounts made here can post.
// Running it again with an existing username updates that user's password.

import 'dotenv/config';
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { pool, query } from '../server/db.js';

// Read answers one line at a time from the terminal
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt) {
  process.stdout.write(prompt);
  const { value } = await lines.next();
  return value ?? '';
}
const username = (await ask('Username: ')).trim().toLowerCase();
const password = await ask('Password (min 8 characters): ');
rl.close();

if (!username || password.length < 8) {
  console.error('Need a username and a password of at least 8 characters.');
  process.exit(1);
}

// 12 = "cost factor": how many rounds of hashing. Higher = slower to crack.
const hash = await bcrypt.hash(password, 12);

await query(
  `INSERT INTO users (username, password_hash) VALUES ($1, $2)
   ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
  [username, hash],
);
console.log(`User "${username}" is ready.`);
await pool.end();
