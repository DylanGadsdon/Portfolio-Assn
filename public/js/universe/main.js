// public/js/universe/main.js — the zoom-out, from Earth to the Big Bang.
//
// THE ONE IDEA: a single number, z, is the camera's distance from Earth as a
// power of ten in metres. z = 7 → 10,000 km. z = 26.9 → the whole observable
// universe. Scrolling just changes z.
//
// No single 3D scene can hold both a satellite and the edge of the universe
// (the numbers are too far apart for a graphics card), so there are four
// scenes, each in its own units: Earth radii, AU, light-years, millions of
// light-years. Each one fades in and out over its own range of z, and all
// cameras share the same viewing angle, so it feels like one continuous zoom.

import * as THREE from 'three';
import { AU, LY, smooth, prepareFade, dotTexture } from './common.js';
import { createEarth } from './earth.js';
import { createSolar } from './solar.js';
import { createGalaxy } from './galaxy.js';
import { createCosmic } from './cosmic.js';

const Z_MIN = 6.95, Z_MAX = 27.85, Z_START = 7.35;
const BIG_BANG = [27.15, 27.8];

// ---------- Renderer ----------
const canvas = document.querySelector('#cosmos');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.autoClear = false;

// ---------- Labels (HTML tags that follow 3D points) ----------
const labelLayer = document.querySelector('#labels');
const labels = [];
function addLabel(text, getPos, range, { scene, big = false } = {}) {
  const el = document.createElement('span');
  el.className = `tag${big ? ' big' : ''}`;
  el.textContent = text;
  el.style.display = 'none';
  labelLayer.append(el);
  labels.push({ el, getPos, range, scene });
}

const status = document.querySelector('#sat-status');
const setStatus = (text) => { status.textContent = text; };

// ---------- Background stars (only turn with the camera, never get closer) ----------
const starScene = new THREE.Scene();
const starCam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
{
  const pos = [];
  for (let i = 0; i < 4000; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(500);
    pos.push(v.x, v.y, v.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  starScene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.6, sizeAttenuation: false, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.9,
  })));
}
const fadeStars = prepareFade(starScene);

// ---------- The four scenes ----------
const ctx = { addLabel, setStatus };
const layers = [createEarth(ctx), createSolar(ctx), createGalaxy(ctx), createCosmic(ctx)].map((layer) => ({
  ...layer,
  camera: new THREE.PerspectiveCamera(50, 1, 0.001, 1000),
  fade: prepareFade(layer.scene),
}));

// ---------- Controls: zoom (z) and viewing angle ----------
let z = Z_START, targetZ = Z_START;
let yaw = 0.6, pitch = 0.42;            // radians: turn around, look down
let auto = false;
const clampZ = (v) => Math.min(Z_MAX, Math.max(Z_MIN, v));

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetZ = clampZ(targetZ + e.deltaY * 0.0022);
  stopAuto();
}, { passive: false });

// Drag to turn, pinch to zoom (pointer events cover mouse and touch)
const pointers = new Map();
let pinchStart = null;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
canvas.addEventListener('pointerup', (e) => { pointers.delete(e.pointerId); pinchStart = null; });
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pinchStart = null; });
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    yaw -= (e.clientX - prev.x) * 0.005;
    pitch = Math.min(1.45, Math.max(-1.45, pitch + (e.clientY - prev.y) * 0.004));
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchStart) targetZ = clampZ(pinchStart.z - Math.log10(d / pinchStart.d) * 2.5);
    else pinchStart = { d, z: targetZ };
    stopAuto();
  }
});

document.querySelector('#zoom-in').addEventListener('click', () => { targetZ = clampZ(targetZ - 1); stopAuto(); });
document.querySelector('#zoom-out').addEventListener('click', () => { targetZ = clampZ(targetZ + 1); stopAuto(); });
const autoBtn = document.querySelector('#auto');
autoBtn.addEventListener('click', () => {
  auto = !auto;
  if (auto && targetZ >= Z_MAX - 0.05) targetZ = z = Z_START;   // start over from Earth
  autoBtn.setAttribute('aria-pressed', String(auto));
  autoBtn.textContent = auto ? '❚❚ Pause' : '▶ Auto zoom';
});
function stopAuto() {
  if (!auto) return;
  auto = false;
  autoBtn.setAttribute('aria-pressed', 'false');
  autoBtn.textContent = '▶ Auto zoom';
}
window.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') targetZ = clampZ(targetZ - 0.5);
  if (e.key === '-' || e.key === 'ArrowDown') targetZ = clampZ(targetZ + 0.5);
});

// ---------- Read-outs ----------
const PLACES = [
  [7.7, 'Low Earth orbit · the ISS and Starlink'],
  [8.35, 'GPS and geostationary satellites'],
  [9.6, 'The Earth and the Moon'],
  [11.4, 'The inner solar system'],
  [12.9, 'The planets'],
  [14.0, 'The Kuiper belt'],
  [16.4, 'The Oort cloud'],
  [19.0, 'Our corner of the Milky Way'],
  [21.4, 'The Milky Way'],
  [23.2, 'The Local Group of galaxies'],
  [25.6, 'Superclusters and the cosmic web'],
  [27.2, 'The edge of the observable universe'],
  [99, 'The Big Bang'],
];
const placeEl = document.querySelector('#place');
const powerEl = document.querySelector('#power');
const distEl = document.querySelector('#distance');
const lookEl = document.querySelector('#lookback');

function human(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} million`;
  if (n >= 100) return Math.round(n).toLocaleString('en-GB');
  return n.toPrecision(3).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');   // 1.50 → 1.5, but 400 stays 400
}
function updateReadout() {
  const m = 10 ** z;
  placeEl.textContent = PLACES.find(([limit]) => z < limit)[1];
  powerEl.innerHTML = `10<sup>${z.toFixed(1)}</sup> m`;
  if (m < AU * 0.05) distEl.textContent = `${human(m / 1000)} km from Earth`;
  else if (m < LY * 0.05) distEl.textContent = `${human(m / AU)} × the Sun–Earth distance`;
  else distEl.textContent = `${human(m / LY)} light-years`;
  // Light needs time to cross that distance: what we see there is that old
  const seconds = m / 299_792_458;
  lookEl.textContent = seconds < 60 ? `Light crosses this in ${seconds.toFixed(seconds < 1 ? 2 : 0)} s`
    : seconds < 86400 * 2 ? `Light from here is ${human(seconds / 3600 < 1 ? seconds / 60 : seconds / 3600)} ${seconds < 3600 ? 'minutes' : 'hours'} old`
    : seconds < 3.156e7 * 2 ? `Light from here is ${human(seconds / 86400)} days old`
    : `Light from here set off ${human(Math.min(13.8e9, seconds / 3.156e7))} years ago`;
}

// Does the straight line from the camera to a point pass through the Earth
// (a sphere of radius 1 at the centre)? Standard ray–sphere test.
const ray = new THREE.Vector3();
function behindEarth(cam, point) {
  ray.subVectors(point, cam);
  const length = ray.length();
  ray.divideScalar(length);
  const b = cam.dot(ray);
  const c = cam.lengthSq() - 1;
  const disc = b * b - c;
  if (disc < 0) return false;                 // the line misses the Earth
  const hit = -b - Math.sqrt(disc);           // distance to where it enters the Earth
  return hit > 0 && hit < length;             // it enters the Earth before reaching the point
}

// ---------- Big Bang ----------
const bang = document.querySelector('#bigbang');
function bigBangColour(t) {
  // black → deep red → orange (~3,000 K, the "afterglow") → white-hot
  const stops = [[0, [0, 0, 0, 0]], [0.3, [70, 4, 4, 0.85]], [0.6, [255, 150, 70, 1]], [1, [255, 252, 245, 1]]];
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i];
    const [t0, c0] = stops[i - 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const c = c0.map((v, j) => v + (c1[j] - v) * k);
      return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
    }
  }
  return 'rgba(255,252,245,1)';
}

// ---------- Resize ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  for (const l of [...layers, { camera: starCam }]) { l.camera.aspect = w / h; l.camera.updateProjectionMatrix(); }
}
window.addEventListener('resize', resize);
resize();

// ---------- The loop ----------
const dir = new THREE.Vector3();
const tmp = new THREE.Vector3();
let last = performance.now();

// ---------- Time-lapse ----------
// Satellites really do circle the Earth every ~90 minutes, which is too slow
// to see. The speed buttons run the clock faster. Every position is still
// calculated from the real orbits, just for a time a bit in the future.
let speed = 60;
let simMs = Date.now();
const clockEl = document.querySelector('#sim-clock');
for (const btn of document.querySelectorAll('[data-speed]')) {
  btn.addEventListener('click', () => {
    speed = Number(btn.dataset.speed);
    if (speed === 1) simMs = Date.now();          // "Live" jumps back to right now
    for (const b of document.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(b === btn));
  });
}

function frame(nowMs) {
  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  simMs += dt * 1000 * speed;
  const now = new Date(simMs);
  clockEl.textContent = speed === 1
    ? `Live · ${now.toLocaleTimeString('en-GB')}`
    : `Time-lapse ×${speed} · showing ${now.toLocaleTimeString('en-GB')}`;

  if (auto) {
    targetZ = clampZ(targetZ + dt * 0.75);
    if (targetZ >= Z_MAX) stopAuto();
  }
  z += (targetZ - z) * Math.min(1, dt * 4);     // ease towards the target
  yaw += dt * 0.02;                              // slow drift so it never feels frozen

  // Direction from the target to the camera, from the two viewing angles
  dir.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));

  renderer.clear();

  // Background stars fade once we're out past our own galaxy
  fadeStars(1 - smooth(18.5, 20.5, z));
  starCam.position.copy(dir);
  starCam.lookAt(0, 0, 0);
  renderer.render(starScene, starCam);

  const shown = new Set();
  for (const layer of layers) {
    const v = layer.visible(z);
    if (v < 0.003) continue;
    shown.add(layer.name);
    layer.fade(v);
    const distance = 10 ** z / layer.metresPerUnit;
    const target = layer.target(z);
    layer.camera.position.copy(target).addScaledVector(dir, distance);
    layer.camera.near = distance * 1e-4;
    layer.camera.far = distance * 1e4;
    layer.camera.updateProjectionMatrix();
    layer.camera.lookAt(target);
    layer.update(z, now);
    renderer.clearDepth();
    renderer.render(layer.scene, layer.camera);
  }

  // Labels: project each 3D point to the screen
  const w = window.innerWidth, h = window.innerHeight;
  for (const l of labels) {
    const layer = layers.find((x) => x.name === l.scene);
    const on = shown.has(l.scene) && z >= l.range[0] && z <= l.range[1];
    if (!on) { l.el.style.display = 'none'; continue; }
    // Earth labels: hide a satellite's label while it's behind the planet
    if (l.scene === 'earth' && behindEarth(layer.camera.position, l.getPos())) { l.el.style.display = 'none'; continue; }
    tmp.copy(l.getPos()).project(layer.camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1) { l.el.style.display = 'none'; continue; }
    const edge = Math.min(smooth(l.range[0], l.range[0] + 0.3, z), 1 - smooth(l.range[1] - 0.3, l.range[1], z));
    l.el.style.display = 'block';
    l.el.style.opacity = (edge * layer.visible(z)).toFixed(2);
    l.el.style.left = `${((tmp.x + 1) / 2) * w}px`;
    l.el.style.top = `${((1 - tmp.y) / 2) * h}px`;
  }

  // Big Bang overlay
  const t = smooth(BIG_BANG[0], BIG_BANG[1], z);
  bang.style.background = bigBangColour(t);
  bang.classList.toggle('done', t > 0.97);

  updateReadout();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
