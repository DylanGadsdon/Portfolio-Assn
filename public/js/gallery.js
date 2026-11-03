// public/js/gallery.js — the home page wall (inspired by the Apple TV
// "shifting tiles" photo screensaver).
//
// How it moves:
//  - Tiles sit in three depth layers (far = small, slow, dim; near = big, fast).
//    Every frame each tile drifts left by speed × time passed.
//  - When a tile leaves the screen on the left it is recycled: moved to the
//    right-hand end of its lane and given the next piece of work.
//  - Every 10 s a few tiles flip over and swap to new work.
//  - Every 30 s the whole wall spins: a wave of 360° turns sweeps across it.
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
const SHIFT_EVERY = 10_000;
const SPIN_EVERY = 30_000;

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

  const t = { el, button, layer, lane, x, y: 0, w: 0, h: 0 };
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
      while (x < W * 1.4) {
        const t = makeTile(layer, lane, x);
        tiles.push(t);
        x += t.w + gapFor(layer);
      }
    }
  }
}

// ---------- Moving ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const t of tiles) {
    t.x -= t.layer.speed * dt;
    if (t.x + t.w < -40) recycle(t);
    t.el.style.transform = `translate3d(${t.x}px, ${t.y}px, 0)`;
  }
  requestAnimationFrame(frame);
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

// Flip one tile to the next piece of work, swapping the picture while it's edge-on
function flip(t, delay = 0, duration = 1100) {
  const anim = t.button.animate(
    [{ transform: 'rotateY(0)' }, { transform: 'translateZ(120px) rotateY(180deg)' }, { transform: 'rotateY(360deg)' }],
    { duration, delay, easing: 'cubic-bezier(.45,0,.25,1)' },
  );
  setTimeout(() => fill(t.button, takeItem()), delay + duration * 0.25);
  return anim;
}

// Every 10 s: a handful of on-screen tiles shift to new work
function shift() {
  const visible = tiles.filter((t) => t.x > 0 && t.x + t.w < W);
  for (let i = 0; i < 4 && visible.length; i++) {
    const t = visible.splice(Math.floor(Math.random() * visible.length), 1)[0];
    flip(t, i * 180, 900);
  }
}

// Every 30 s: the whole library spins, a wave travelling left to right
function spin() {
  for (const t of tiles) {
    if (t.x > W + 50 || t.x + t.w < -50) continue;
    flip(t, (t.x / W) * 900, 1600);
  }
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
  tryNext(['/media/hero.jpg', '/media/hero.png', '/media/hero.webp']);

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
setInterval(shift, SHIFT_EVERY);
setInterval(spin, SPIN_EVERY);
