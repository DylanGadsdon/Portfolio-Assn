// public/js/world/stage.js — shared measurements and little helpers for the world.

export const SEA = 170;              // sea level, in vh from the top (matches world.css)
export const WORLD_HEIGHT = 560;    // total height in vh

export const world = document.querySelector('#world');
export const effects = document.querySelector('#effects');

// 1 "vh" in pixels. Measured once (and again only if the window really
// resizes) so mobile URL bars sliding in and out don't move everything.
export const size = { vh: 8, width: 1000 };

export function measure() {
  size.vh = Math.max(window.innerHeight, 480) / 100;
  size.width = document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--vh', `${size.vh}px`);
}

// vh → pixels from the top of the world
export const px = (vh) => vh * size.vh;

// Real-world depth/altitude for a position in the world.
// Piecewise-linear: each pair is [position in vh, metres]. Negative = below sea.
const SCALE = [
  [0, 2_000_000], [25, 420_000], [90, 100_000], [130, 12_000], [SEA, 0],
  [260, -200], [370, -1000], [470, -4000], [545, -6000], [WORLD_HEIGHT, -6200],
];
export function metresAt(vh) {
  for (let i = 1; i < SCALE.length; i++) {
    const [y0, m0] = SCALE[i - 1];
    const [y1, m1] = SCALE[i];
    if (vh <= y1) return m0 + ((vh - y0) / (y1 - y0)) * (m1 - m0);
  }
  return SCALE.at(-1)[1];
}

export function zoneAt(vh) {
  if (vh < 90) return 'Space';
  if (vh < SEA - 3) return 'Sky';
  if (vh < SEA + 6) return 'Sea level';
  if (vh < 260) return 'Sunlight zone';
  if (vh < 370) return 'Twilight zone';
  if (vh < 470) return 'Midnight zone';
  return 'The abyss';
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Element position in world pixels (unaffected by scroll)
export function worldRect(el) {
  const r = el.getBoundingClientRect();
  const w = world.getBoundingClientRect();
  return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height,
           cx: r.left - w.left + r.width / 2, cy: r.top - w.top + r.height / 2 };
}

// Short-lived visual effect at world coordinates (bubbles, ink, splashes…)
export function fx(className, x, y, { life = 2500, vars = {}, text } = {}) {
  const el = document.createElement('div');
  el.className = `fx ${className}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  if (text) el.textContent = text;
  effects.append(el);
  setTimeout(() => el.remove(), life);
  return el;
}

export function splash(x, y, count = 14) {
  for (let i = 0; i < count; i++) {
    const a = rand(Math.PI * 1.1, Math.PI * 1.9);
    const d = rand(30, 110);
    fx('splash', x, y, { life: 1000, vars: { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px` } });
  }
}

let toastTimer;
export function toast(message, ms = 2600) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
