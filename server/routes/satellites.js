// server/routes/satellites.js — GET /api/satellites
//
// CelesTrak publishes the orbits of every tracked satellite as "TLEs"
// (two-line element sets): a name line plus two lines of numbers.
// The browser turns those numbers into live positions with satellite.js.
//
// Why go through our server instead of fetching CelesTrak from the browser?
//   - CelesTrak only updates every ~2 hours and asks people not to over-fetch.
//     The server fetches once, keeps a copy in memory (a cache), and every
//     visitor gets that copy. One request to CelesTrak, not one per visitor.
//   - One place to handle errors.

import { Router } from 'express';

const router = Router();

const SOURCES = {
  // Space stations (ISS, Tiangong…): small list, always loaded
  stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
  // Every active satellite: ~10,000+
  active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
};
const TWO_HOURS = 2 * 60 * 60 * 1000;
const cache = {};   // { stations: { text, fetchedAt }, active: {…} }

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

router.get('/', async (req, res) => {
  const group = req.query.group === 'stations' ? 'stations' : 'active';
  const cached = cache[group];

  if (!cached || Date.now() - cached.fetchedAt > TWO_HOURS) {
    try {
      const response = await fetch(SOURCES[group], {
        headers: { 'User-Agent': 'iceberg-blog student project' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`CelesTrak ${response.status}`);
      const text = await response.text();
      cache[group] = { sats: parseTLE(text), fetchedAt: Date.now() };
    } catch (err) {
      console.error('Satellite fetch failed:', err.message);
      // Old data is better than none: orbits drift slowly
      if (!cached) return res.status(503).json({ error: 'Satellite feed unavailable' });
    }
  }

  const { sats, fetchedAt } = cache[group];
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ fetchedAt, count: sats.length, sats });
});

export default router;
