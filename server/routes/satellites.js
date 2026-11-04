// server/routes/satellites.js — GET /api/satellites
//
// CelesTrak publishes the orbits of every tracked satellite as "TLEs"
// (two-line element sets): a name line plus two lines of numbers.
// The browser turns those numbers into live positions with satellite.js.
//
// Why go through our server instead of fetching CelesTrak from the browser?
//   - CelesTrak only updates every ~2 hours and blocks anyone who downloads the
//     same data more often than that. So the server fetches once and keeps a
//     copy: in memory, AND on disk (server/cache/), so restarting the server
//     during development doesn't trigger another download and get us blocked.
//   - If CelesTrak is down or says no, an older copy is better than nothing:
//     orbits drift slowly, so a day-old copy still looks right.

import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cache');

const SOURCES = {
  // Space stations (ISS, Tiangong…): small list, used if the big one fails
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  // Every active satellite: ~12,000, including all of Starlink
  active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
};
const TWO_HOURS = 2 * 60 * 60 * 1000;
const cache = {};   // { stations: { sats, fetchedAt }, active: {…} }

// Turn the raw text into [{ name, line1, line2 }, …]
function parseTLE(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const sats = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const [name, line1, line2] = lines.slice(i, i + 3);
    if (line1?.startsWith('1 ') && line2?.startsWith('2 ')) {
      sats.push({ name: name.trim(), line1, line2 });
    }
  }
  return sats;
}

const diskFile = (group) => path.join(CACHE_DIR, `satellites-${group}.json`);

async function readDisk(group) {
  try { return JSON.parse(await fs.readFile(diskFile(group), 'utf8')); } catch { return null; }
}

async function writeDisk(group, data) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(diskFile(group), JSON.stringify(data));
  } catch (err) { console.warn('Could not save satellite cache', err.message); }
}

async function load(group) {
  // 1. Memory, then disk: use it if it's less than two hours old
  if (!cache[group]) cache[group] = await readDisk(group);
  const have = cache[group];
  if (have && Date.now() - have.fetchedAt < TWO_HOURS) return have;

  // 2. Otherwise download a fresh copy
  try {
    const response = await fetch(SOURCES[group], {
      headers: { 'User-Agent': 'EXIT-archive student project (Berghs)' },
      signal: AbortSignal.timeout(60000),   // the full list is a few MB: give it time
    });
    if (!response.ok) throw new Error(`CelesTrak ${response.status}`);
    const sats = parseTLE(await response.text());
    if (sats.length < 10) throw new Error('CelesTrak sent no orbits');
    cache[group] = { sats, fetchedAt: Date.now() };
    writeDisk(group, cache[group]);
    return cache[group];
  } catch (err) {
    console.error(`Satellite fetch (${group}) failed:`, err.message);
    return have;   // 3. An old copy, or null if we've never had one
  }
}

router.get('/', async (req, res) => {
  const group = req.query.group === 'stations' ? 'stations' : 'active';
  const data = await load(group);
  if (!data) return res.status(503).json({ error: 'Satellite feed unavailable' });
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ fetchedAt: data.fetchedAt, count: data.sats.length, sats: data.sats });
});

export default router;
