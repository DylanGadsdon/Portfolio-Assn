// public/js/gallery.js — the home page wall (inspired by the Apple TV
// "shifting tiles" photo screensaver).
//
// How it moves:
//  - Tiles sit in three depth layers (far = small, slow, dim; near = big, fast).
//    Every frame each tile drifts left by speed × time passed.
//  - When a tile leaves the screen on the left it is recycled: moved to the
//    right-hand end of its lane and given the next piece of work.
//  - Every 20 s the whole library swings round like a tornado: it pulls back,
//    turns a full circle around a vertical axis (tiles spread out in depth so
//    they sweep past at different distances), shows the other side, and flies
//    back in. The pictures change while the tiles are edge-on.
//
// Each tile is two elements: an outer one that drifts (moved every frame)
// and an inner button that spins (an animation). Splitting them stops the
// drift and the spin from fighting over the same `transform`.

const wall = document.querySelector('#wall');
const viewer = document.querySelector('#viewer');

const LAYERS = [
  { scale: 0.45, speed: 12, opacity: 0.4,  lanes: 3, z: 1, gap: [260, 620] },
  { scale: 0.72, speed: 24, opacity: 0.75, lanes: 2, z: 2, gap: [320, 760] },
  { scale: 1.0,  speed: 40, opacity: 1,    lanes: 2, z: 3, gap: [420, 980] },
];
const gapFor = (layer) => (layer.gap[0] + Math.random() * (layer.gap[1] - layer.gap[0])) * Math.min(1, W / 1440);
const SPIN_EVERY = 20_000;
const SPIN_TIME = 2800;     // ms

let items = [];          // everything that can be shown
let shown = [];          // items after the archive filter
let nextItem = 0;
let tiles = [];
let W = innerWidth, H = innerHeight;

// ---------- Data ----------

const PLACEHOLDERS = [
  ['Film', 'GTA VI trailer'], ['Film', 'Panther, tortoise & alligator'], ['Freshbaked', 'Ostrich runway'],
  ['Freshbaked', 'Gold-chain leopard'], ['Campaign', 'Kill the opera'], ['Brand', 'EXIT/'],
  ['Film', 'Groundhog Elf'], ['Freshbaked', 'Pyrex sheep'], ['Music', 'Illegal archive'],
  ['Freshbaked', 'Central Park fishermen'], ['Film', 'Plenty Labs'], ['Freshbaked', 'Iguana in Vegas'],
];
const SHAPES = [16 / 9, 4 / 5, 1, 3 / 2, 2 / 3, 9 / 16, 4 / 3];

async function loadItems() {
  try {
    const res = await fetch('/api/gallery');
    if (res.ok) items = await res.json();
  } catch (err) {
    console.warn('Gallery offline', err);
  }
  if (items.length === 0) {
    // Nothing added yet: show labelled placeholders so the motion can be seen
    items = PLACEHOLDERS.map(([archive, title], i) => ({
      type: 'placeholder', archive, title, hue: (i * 47) % 360, ratio: SHAPES[i % SHAPES.length],
    }));
  }
  // Shuffle so the same series isn't always side by side
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  shown = items;
}

function takeItem() {
  const item = shown[nextItem % shown.length];
  nextItem++;
  return item;
}

// ---------- Building tiles ----------

function fill(button, item) {
  button.replaceChildren();
  button.classList.toggle('placeholder', item.type === 'placeholder');
  button.style.background = '';
  button.setAttribute('aria-label', `${item.title}, ${item.archive}`);
  button.item = item;

  if (item.type === 'placeholder') {
    button.style.background = `linear-gradient(135deg, hsl(${item.hue} 60% 38%), hsl(${(item.hue + 40) % 360} 70% 18%))`;
    const span = document.createElement('span');
    span.textContent = `${item.archive} · ${item.title}`;
    button.append(span);
  } else if (item.type === 'video') {
    const v = document.createElement('video');
    Object.assign(v, { src: item.src, muted: true, loop: true, playsInline: true, autoplay: true, preload: 'metadata' });
    button.append(v);
  } else {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = '';
    img.decoding = 'async';
    button.append(img);
    if (item.type === 'youtube') {
      const tag = document.createElement('span');
      tag.className = 'yt';
      tag.textContent = '▶ Film';
      button.append(tag);
    }
  }
}

// Width from the layer, height from the picture's real shape
function sizeTile(t, item) {
  const base = Math.max(150, Math.min(W, 1800) * 0.19);
  t.w = base * t.layer.scale * (0.85 + Math.random() * 0.4);
  const apply = (ratio) => {
    t.h = Math.min(t.w / ratio, (H / t.layer.lanes) * 0.92);
    t.w = t.h * ratio;
    t.el.style.width = `${t.w}px`;
    t.el.style.height = `${t.h}px`;
  };
  if (item.ratio) return apply(item.ratio);
  if (item.type === 'youtube') return apply(16 / 9);
  // Photos get a random frame shape (the picture is cropped to fill it, like
  // background-size: cover). Mixed shapes are what make the wall feel alive.
  apply(CROPS[Math.floor(Math.random() * CROPS.length)]);
}
const CROPS = [16 / 9, 16 / 9, 3 / 2, 4 / 3, 1, 4 / 5, 2 / 3];

function makeTile(layer, lane, x) {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.zIndex = layer.z;
  el.style.opacity = layer.opacity;
  el.style.willChange = 'transform';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.style.position = 'absolute';
  button.style.inset = '0';
  button.style.width = '100%';
  button.style.height = '100%';
  el.append(button);
  wall.append(el);

  const t = { el, button, layer, lane, x, y: 0, w: 0, h: 0, spinZ: (Math.random() - 0.3) * 1400 };
  const item = takeItem();
  fill(button, item);
  sizeTile(t, item);
  placeInLane(t);
  button.addEventListener('click', () => openViewer(button.item));
  return t;
}

// A random height inside the tile's lane
function placeInLane(t) {
  const laneH = H / t.layer.lanes;
  t.y = t.lane * laneH + Math.random() * Math.max(0, laneH - t.h);
}

function build() {
  wall.replaceChildren();
  tiles = [];
  for (const layer of LAYERS) {
    for (let lane = 0; lane < layer.lanes; lane++) {
      let x = -Math.random() * 300;
      for (let n = 0; x < W * 1.4 && n < 60; n++) {
        const t = makeTile(layer, lane, x);
        tiles.push(t);
        x += Math.max(80, t.w + gapFor(layer));   // never 0, so this loop always ends
      }
    }
  }
}

// ---------- Moving ----------

let last = performance.now();
let spinStart = null;     // time the current spin began, or null
let lastAngle = 0;
const hero = document.querySelector('#hero');

// Smooth start and finish (0 → 1)
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // ---- the tornado spin ----
  let angle = 0, pull = 0;
  if (spinStart !== null) {
    const p = Math.min(1, (now - spinStart) / SPIN_TIME);
    angle = 360 * ease(p);
    pull = Math.sin(Math.PI * p);            // 0 → 1 → 0: out, round, back in
    // Edge-on moments: swap to new work at 90°, and back to facing forward at 270°
    if (lastAngle < 90 && angle >= 90) for (const t of tiles) { fill(t.button, takeItem()); t.button.classList.add('mirror'); }
    if (lastAngle < 270 && angle >= 270) for (const t of tiles) t.button.classList.remove('mirror');
    lastAngle = angle;
    if (p >= 1) { spinStart = null; angle = 0; pull = 0; lastAngle = 0; }
  }
  wall.style.transform = pull
    ? `translateZ(${-1500 * pull}px) rotateY(${angle}deg) rotateX(${6 * pull}deg)`
    : '';

  for (const t of tiles) {
    t.x -= t.layer.speed * dt * (1 + 2 * pull);   // speeds up while it swirls
    if (t.x + t.w < -40 && !pull) recycle(t);
    const z = t.spinZ * pull;                     // spread out in depth during the spin
    t.el.style.transform = `translate3d(${t.x}px, ${t.y}px, ${z}px)`;
  }

  // ---- the iceberg tile wanders slowly round the middle ----
  const s = now / 1000;
  const hx = Math.sin(s / 9) * W * 0.12 + Math.sin(s / 4.3) * W * 0.02;
  const hy = Math.sin(s / 6.1) * H * 0.07 + Math.cos(s / 3.7) * H * 0.015;
  const tilt = Math.sin(s / 5) * 2.2;
  // During the spin the iceberg tile swings round with the rest of the library:
  // the same pull-back and turn, using its own perspective (it sits outside the wall)
  const swing = pull
    ? ` perspective(1100px) translateZ(${-1500 * pull}px) rotateY(${angle}deg) rotateX(${6 * pull}deg)`
    : '';
  hero.style.transform = `translate(calc(-50% + ${hx * (1 - pull)}px), calc(-50% + ${hy * (1 - pull)}px))${swing} rotate(${tilt * 0.3}deg) rotateY(${tilt}deg)`;

  requestAnimationFrame(frame);
}

function spin() {
  if (spinStart === null && !document.hidden) spinStart = performance.now();
}

function recycle(t) {
  // Move to just after the right-most tile in the same lane
  let right = W;
  for (const o of tiles) if (o !== t && o.layer === t.layer && o.lane === t.lane) right = Math.max(right, o.x + o.w);
  const item = takeItem();
  fill(t.button, item);
  sizeTile(t, item);
  t.x = right + gapFor(t.layer);
  placeInLane(t);
}

// ---------- Archive filter ----------

function drawArchives() {
  const box = document.querySelector('#archives');
  const names = [...new Set(items.map((i) => i.archive))];
  if (names.length < 2) return;
  let active = '';
  const draw = () => box.replaceChildren(...['', ...names].map((name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name || 'All';
    b.setAttribute('aria-pressed', String(active === name));
    b.addEventListener('click', () => {
      active = name;
      shown = name ? items.filter((i) => i.archive === name) : items;
      nextItem = 0;
      spin();          // the new selection arrives with a spin
      draw();
    });
    return b;
  }));
  draw();
}

// ---------- Viewer ----------

function openViewer(item) {
  const media = viewer.querySelector('.viewer-media');
  media.replaceChildren();
  if (item.type === 'youtube') {
    const f = document.createElement('iframe');
    f.className = 'yt';
    f.src = `https://www.youtube-nocookie.com/embed/${item.youtube}?autoplay=1&rel=0&modestbranding=1`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.title = item.title;
    media.append(f);
  } else if (item.type === 'video') {
    const v = document.createElement('video');
    Object.assign(v, { src: item.src, controls: true, autoplay: true, playsInline: true });
    media.append(v);
  } else if (item.type === 'image') {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.title;
    media.append(img);
  } else {
    const p = document.createElement('div');
    p.style.cssText = `width:min(900px,90vw);aspect-ratio:${item.ratio};background:linear-gradient(135deg,hsl(${item.hue} 60% 38%),hsl(${(item.hue + 40) % 360} 70% 18%))`;
    media.append(p);
  }
  viewer.querySelector('.viewer-archive').textContent = item.archive;
  viewer.querySelector('.viewer-title').textContent = item.title;
  viewer.item = item;
  if (!viewer.open) viewer.showModal();
}

viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => viewer.querySelector('.viewer-media').replaceChildren());   // stops videos
for (const b of viewer.querySelectorAll('[data-step]')) {
  b.addEventListener('click', () => {
    const i = shown.indexOf(viewer.item);
    openViewer(shown[(i + Number(b.dataset.step) + shown.length) % shown.length]);
  });
}
addEventListener('keydown', (e) => {
  if (!viewer.open) return;
  if (e.key === 'ArrowRight') viewer.querySelector('[data-step="1"]').click();
  if (e.key === 'ArrowLeft') viewer.querySelector('[data-step="-1"]').click();
});

// ---------- Hero: you on the iceberg ----------

function loadHero() {
  const box = document.querySelector('.hero-media');
  const tryNext = (list) => {
    if (!list.length) { box.classList.add('placeholder'); return; }
    const img = new Image();
    img.onload = () => { box.style.backgroundImage = `url("${img.src}")`; };
    img.onerror = () => tryNext(list.slice(1));
    img.src = list[0];
  };
  // Dylan on the iceberg if it's there, otherwise the iceberg itself
  tryNext(['/media/hero.jpg', '/media/hero.png', '/media/hero.webp', '/media/world/iceberg.jpg']);

  const hero = document.querySelector('#hero');
  hero.addEventListener('click', (e) => {
    e.preventDefault();
    hero.classList.add('diving');            // grows to fill the screen…
    setTimeout(() => { location.href = hero.href; }, 850);   // …then the iceberg loads
  });
}

// ---------- Arriving from the Big Bang ----------

function arrival() {
  if (new URLSearchParams(location.search).get('from') !== 'bigbang') return;
  const w = document.querySelector('#whiteout');
  w.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('fade')));
  history.replaceState(null, '', '/');
}

// ---------- Start ----------

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (Math.abs(innerWidth - W) < 60 && Math.abs(innerHeight - H) < 120) return;
    W = innerWidth; H = innerHeight;
    build();
  }, 250);
});

arrival();
loadHero();
await loadItems();
drawArchives();
build();
requestAnimationFrame(frame);
setInterval(spin, SPIN_EVERY);
// Press S to spin on demand (handy in a live demo)
addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 's' && !viewer.open) spin(); });
