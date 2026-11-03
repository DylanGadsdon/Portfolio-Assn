// public/js/world/creatures.js — everything that swims or flies.
//
// Each creature is a plain JavaScript object (position, speed, direction…)
// plus an HTML element. Every animation frame (~60 times a second) we:
//   1. move each object a little, based on how much time has passed (dt)
//   2. copy its new position onto its element with a CSS transform
// Dragging pauses step 1 for that creature and lets the pointer move it.

import { art } from './art.js';
import { SEA, size, px, rand, clamp, fx, splash, toast, wait } from './stage.js';

// Where each kind lives (in vh), how big it is, how fast it moves, and its hover fact.
const SPECIES = [
  { kind: 'gull',    count: 3, zone: [100, 160], width: 72,  speed: 70, wave: 10, air: true,
    tip: 'Herring gull · rides the wind above the waves' },
  { kind: 'fish',    count: 3, zone: [178, 245], width: 100, speed: 50, wave: 6,
    tip: 'Anchovy school · sunlight zone, top 50 m' },
  { kind: 'dolphin', count: 2, zone: [174, 200], width: 140, speed: 120, wave: 12,
    tip: 'Bottlenose dolphin · usually near the surface' },
  { kind: 'turtle',  count: 2, zone: [182, 235], width: 96,  speed: 28, wave: 8,
    tip: 'Green sea turtle · mostly in the top 40 m' },
  { kind: 'whale',   count: 1, zone: [230, 290], width: 400, speed: 36, wave: 14,
    tip: 'Humpback whale · feeds in the top 200 m' },
  { kind: 'submarine', count: 1, zone: [300, 345], width: 240, speed: 24, wave: 8,
    tip: 'The Logbook · click to climb aboard' },
  { kind: 'squid',   count: 1, zone: [380, 445], width: 300, speed: 32, wave: 16,
    tip: 'Giant squid · 300–1,000 m, eyes the size of plates' },
  { kind: 'jelly',   count: 5, zone: [395, 470], width: 46,  speed: 9,  wave: 18,
    tip: 'Atolla jellyfish · flashes like a burglar alarm' },
  { kind: 'angler',  count: 2, zone: [480, 540], width: 110, speed: 16, wave: 6,
    tip: 'Anglerfish · 1,000–4,000 m, hunts with a light' },
];

const layer = document.querySelector('#creatures');
const creatures = [];

// Small screens get smaller animals
const scaleFor = () => clamp(size.width / 1100, 0.42, 1);

// photos: { whale: '/media/world/whale.png', … } from Dylan's renders, if present
let photos = {};
export function spawnCreatures(found = {}) {
  photos = found;
  for (const species of SPECIES) {
    for (let i = 0; i < species.count; i++) creatures.push(makeCreature(species));
  }
}

function makeCreature(species) {
  const el = document.createElement('div');
  el.className = `creature ${species.kind}-c`;
  // A photo cut-out if Dylan has added one (facing right), otherwise the drawing
  const look = photos[species.kind]
    ? `<img class="art photo" src="${photos[species.kind]}" alt="" draggable="false">`
    : art[species.kind];
  el.innerHTML = `<span class="tip"></span><div class="flip"><div class="sprite">${look}</div></div>`;
  el.querySelector('.tip').textContent = species.tip;
  layer.append(el);

  const c = {
    ...species,
    el,
    flip: el.querySelector('.flip'),
    sprite: el.querySelector('.sprite'),
    w: species.width * scaleFor(),
    x: rand(0, size.width),
    baseY: px(rand(...species.zone)),
    y: 0,
    vy: 0,
    dir: Math.random() < 0.5 ? 1 : -1,
    phase: rand(0, Math.PI * 2),
    boost: 1,
    dragging: false,
  };
  el.style.width = `${c.w}px`;
  setFacing(c);

  if (c.kind === 'submarine') {
    el.setAttribute('role', 'link');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Submarine: go to The Logbook');
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') react(c); });
  }

  enableDrag(c);
  el.addEventListener('pointerenter', () => { c.boost = 2.2; });   // hover = startled
  return c;
}

function setFacing(c) {
  c.flip.style.transform = `scaleX(${c.dir})`;
}

// ---------- Drag (works for mouse, pen and touch: "pointer events") ----------
function enableDrag(c) {
  let start = null;

  c.el.addEventListener('pointerdown', (e) => {
    start = { px: e.clientX, py: e.clientY, x: c.x, y: c.y, moved: false };
    c.el.setPointerCapture(e.pointerId);   // keep receiving moves even off the element
  });

  c.el.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.px;
    const dy = e.clientY - start.py;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;   // tiny wobble = still a click
    start.moved = true;
    c.dragging = true;
    c.el.classList.add('dragging');
    c.x = start.x + dx;
    c.baseY = c.y = start.y + dy;
    c.vy = 0;
    place(c);
  });

  c.el.addEventListener('pointerup', () => {
    if (start && !start.moved) react(c);
    if (c.dragging) dropped(c);
    start = null;
    c.dragging = false;
    c.el.classList.remove('dragging');
  });
}

function dropped(c) {
  const sea = px(SEA);
  if (!c.air && c.y < sea - 10) toast(`A ${c.tip.split(' ·')[0].toLowerCase()} can't fly. Gravity it is.`);
  if (c.air && c.y > sea + 10) toast('Gulls float. Back up it comes.');
}

// ---------- Click reactions ----------
async function react(c) {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.el.offsetHeight / 2;

  switch (c.kind) {
    case 'gull':
      fx('say', cx, c.y - 10, { life: 1600, text: 'Caw!' });
      c.boost = 4;
      break;
    case 'dolphin':
      c.sprite.animate(
        [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-110px) rotate(-30deg)' },
         { transform: 'translateY(0) rotate(25deg)' }, { transform: 'none' }],
        { duration: 1100, easing: 'ease-in-out' });
      if (c.y < px(SEA) + 80) setTimeout(() => splash(cx, px(SEA)), 500);
      bubbles(cx, cy, 6);
      break;
    case 'turtle':
      c.sprite.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 1400, easing: 'ease-in-out' });
      break;
    case 'whale':
      fx('say', cx, c.y, { life: 1600, text: '♪ ooooOOOooo ♪' });
      bubbles(c.x + c.w * (c.dir > 0 ? 0.85 : 0.15), c.y + 10, 14);
      break;
    case 'squid':
      fx('ink', cx, cy, { life: 3000 });
      c.dir *= -1; setFacing(c);
      c.boost = 7;
      break;
    case 'jelly':
      c.sprite.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(3) saturate(2)' }, { filter: 'brightness(1)' }],
        { duration: 700, iterations: 3 });
      break;
    case 'angler':
      fx('say', cx, c.y, { life: 1600, text: 'Come closer…' });
      c.sprite.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 900 });
      break;
    case 'fish':
      c.sprite.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }],
        { duration: 1200, easing: 'ease-out' });
      c.boost = 5;
      break;
    case 'submarine':
      toast('Diving to the Logbook…');
      bubbles(cx, cy, 16);
      await document.body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards' }).finished;
      window.location.href = '/blog';
      break;
  }
}

function bubbles(x, y, n) {
  for (let i = 0; i < n; i++) {
    setTimeout(() => fx('bubble', x + rand(-10, 10), y, { life: 2400, vars: { '--dx': `${rand(-30, 30)}px` } }), i * 80);
  }
}

// ---------- The animation loop ----------
function update(c, dt, t) {
  if (c.dragging) return;

  const sea = px(SEA);
  const [top, bottom] = [px(c.zone[0]), px(c.zone[1])];

  // Swim sideways; turn round when well off-screen
  c.boost += (1 - c.boost) * Math.min(1, dt * 1.5);   // startle wears off
  c.x += c.speed * scaleFor() * c.boost * c.dir * dt;
  if (c.x > size.width + 40 && c.dir > 0) { c.dir = -1; setFacing(c); c.baseY = px(rand(...c.zone)); }
  if (c.x < -c.w - 40 && c.dir < 0) { c.dir = 1; setFacing(c); c.baseY = px(rand(...c.zone)); }

  // Sea creatures dropped in the sky fall; gulls dropped in the sea float up
  if (!c.air && c.baseY < sea - 2) {
    c.vy += 1800 * dt;
    c.baseY += c.vy * dt;
    if (c.baseY >= sea) { splash(c.x + c.w / 2, sea); c.vy = 0; }
  } else if (c.air && c.baseY > sea) {
    c.baseY -= 420 * dt;
    if (c.baseY <= sea) splash(c.x + c.w / 2, sea, 8);
  } else {
    // Ease back into the creature's home depth
    c.vy = 0;
    const target = clamp(c.baseY, top, bottom);
    c.baseY += (target - c.baseY) * Math.min(1, dt * 0.6);
  }

  // Gentle up-and-down wave on top of the base depth
  c.y = c.baseY + Math.sin(t * 1.3 + c.phase) * c.wave;
  place(c);
}

function place(c) {
  c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
}

export function startLoop() {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);   // seconds since last frame (capped)
    last = now;
    const t = now / 1000;
    for (const c of creatures) update(c, dt, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Used by the raid: briefly scare everything near the surface
export async function scatter() {
  for (const c of creatures) c.boost = 6;
  await wait(10);
}
