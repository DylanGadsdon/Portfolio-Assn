// public/js/world/effects.js — two effects for the iceberg page.
//
// 1. Torch: below a certain depth the water goes pitch black. A dark layer
//    covers the deep, and a CSS mask cuts a soft round hole in it wherever
//    the cursor is, so you explore the deep with a torch beam.
// 2. Ripples: moving over the sea surface in the iceberg photo leaves
//    expanding rings, flattened like real water seen from the side.

import { world } from './stage.js';

let pointer = { x: innerWidth / 2, y: innerHeight * 0.55, seen: false };
addEventListener('pointermove', (e) => { pointer = { x: e.clientX, y: e.clientY, seen: true }; }, { passive: true });

// ---------- 1. Torch ----------
export function setupTorch() {
  const dark = document.querySelector('#dark');
  const beam = document.createElement('div');
  beam.id = 'beam';
  world.append(beam);

  function place() {
    const r = dark.getBoundingClientRect();
    const x = pointer.x - r.left;
    const y = pointer.y - r.top;
    // the mask hole follows the cursor (positions are relative to the dark layer)
    dark.style.setProperty('--mx', `${x}px`);
    dark.style.setProperty('--my', `${y}px`);
    // the soft light of the beam itself, only inside the dark zone
    const w = world.getBoundingClientRect();
    beam.style.transform = `translate(${pointer.x - w.left}px, ${pointer.y - w.top}px)`;
    beam.style.opacity = y > 0 ? Math.min(1, y / 300) : 0;
  }
  addEventListener('pointermove', place, { passive: true });
  addEventListener('scroll', place, { passive: true });
  place();
}

// ---------- 2. Ripples ----------
export function setupRipples() {
  const canvas = document.querySelector('#ripples');
  const photo = document.querySelector('#iceberg-photo');
  const ctx = canvas.getContext('2d');
  const rings = [];
  let box = null, running = false, lastSpawn = 0;

  function measure() {
    if (!photo.offsetParent) { box = null; return; }   // no photo, no ripples
    const p = photo.getBoundingClientRect();
    const w = world.getBoundingClientRect();
    box = { left: p.left - w.left, top: p.top - w.top, width: p.width, height: p.height };
    const ratio = Math.min(2, devicePixelRatio || 1);
    Object.assign(canvas.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    canvas.width = box.width * ratio;
    canvas.height = box.height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // The sea surface in the photo sits between 44% (horizon) and 51% (water line) of its height
  const SURFACE = [0.435, 0.512];

  function spawn(big) {
    if (!box) return;
    const w = world.getBoundingClientRect();
    const x = pointer.x - (w.left + box.left);
    const y = pointer.y - (w.top + box.top);
    const t = y / box.height;
    if (x < 0 || x > box.width || t < SURFACE[0] || t > SURFACE[1]) return;
    // Rings further away (higher up, nearer the horizon) are smaller and flatter
    const near = (t - SURFACE[0]) / (SURFACE[1] - SURFACE[0]);
    rings.push({ x, y, born: performance.now(), size: (big ? 160 : 70) * (0.35 + near), flat: 0.12 + 0.12 * near });
    if (!running) { running = true; requestAnimationFrame(draw); }
  }

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const age = (now - r.born) / 1600;              // 0 → 1 over 1.6 s
      if (age >= 1) { rings.splice(i, 1); continue; }
      const rx = r.size * (0.15 + age);
      const fade = (1 - age) * (1 - age);
      for (const [scale, alpha] of [[1, 0.5], [0.72, 0.28], [0.46, 0.16]]) {
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rx * scale, rx * scale * r.flat, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(225, 242, 255, ${alpha * fade})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    if (rings.length) requestAnimationFrame(draw);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  addEventListener('pointermove', () => {
    const now = performance.now();
    if (now - lastSpawn > 70) { lastSpawn = now; spawn(false); }
  }, { passive: true });
  addEventListener('pointerdown', () => spawn(true));
  addEventListener('resize', measure);
  photo.addEventListener('load', measure);
  measure();
}
