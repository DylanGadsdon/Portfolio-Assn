// public/js/universe/solar.js — the Sun, the planets where they really are today,
// the Kuiper belt and the Oort cloud. Units: 1 = 1 AU (Sun–Earth distance).

import * as THREE from 'three';
import { AU, smooth, lerp, pointCloud, glow, eqToEcliptic3, gauss } from './common.js';

const PLANETS = [
  // name, body, orbit in days, colour, dot size (px), label visible from/to (z)
  ['Mercury', 'Mercury', 88,    '#b9b2a8', 5,  [10.4, 12.6]],
  ['Venus',   'Venus',   225,   '#ffd9a0', 6,  [10.4, 12.6]],
  ['Earth',   'Earth',   365.25,'#6fb7ff', 7,  [10.2, 13.0]],
  ['Mars',    'Mars',    687,   '#ff7a4d', 6,  [10.6, 13.0]],
  ['Jupiter', 'Jupiter', 4333,  '#e6c39a', 9,  [11.4, 14.0]],
  ['Saturn',  'Saturn',  10759, '#f0dca0', 8,  [11.6, 14.0]],
  ['Uranus',  'Uranus',  30687, '#9fe3e8', 7,  [12.0, 14.3]],
  ['Neptune', 'Neptune', 60190, '#6f8cff', 7,  [12.2, 14.3]],
];

export function createSolar({ addLabel }) {
  const scene = new THREE.Scene();
  const A = window.Astronomy;
  const now = new Date();

  // The Sun
  scene.add(glow('rgba(255,236,170,1)', 34));
  scene.add(glow('rgba(255,170,60,0.5)', 90));
  addLabel('The Sun', () => new THREE.Vector3(), [10.6, 16.2], { scene: 'solar', big: true });

  let earthPos = new THREE.Vector3(1, 0, 0);

  for (const [name, body, period, color, size, range] of PLANETS) {
    // Where is it today?
    const pos = eqToEcliptic3(A.HelioVector(A.Body[body], now));
    if (name === 'Earth') earthPos = pos;
    const dot = glow(hexToRgba(color), size);
    dot.position.copy(pos);
    scene.add(dot);
    addLabel(name, () => pos, range, { scene: 'solar', big: name === 'Earth' });

    // Its orbit: positions sampled over one full trip round the Sun
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const date = new Date(now.getTime() + (i / 160) * period * 86400000);
      pts.push(eqToEcliptic3(A.HelioVector(A.Body[body], date)));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: name === 'Earth' ? 0.55 : 0.28 })));
  }

  // Kuiper belt: icy bodies 30–50 AU out, in a thick ring
  const kuiper = [];
  for (let i = 0; i < 7000; i++) {
    const r = lerp(30, 50, Math.random());
    const a = Math.random() * Math.PI * 2;
    kuiper.push(Math.cos(a) * r, gauss() * 3, Math.sin(a) * r);
  }
  scene.add(pointCloud(kuiper, null, { size: 1.6, opacity: 0.35 }));
  addLabel('Kuiper belt', () => new THREE.Vector3(0, 0, -40), [12.6, 14.6], { scene: 'solar' });

  // Oort cloud: a huge sphere of comets, ~2,000 to 100,000 AU away
  const oort = [];
  for (let i = 0; i < 16000; i++) {
    const r = Math.pow(10, lerp(Math.log10(2000), 5, Math.random()));
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    oort.push(s * Math.cos(a) * r, u * r, s * Math.sin(a) * r);
  }
  scene.add(pointCloud(oort, null, { size: 1.8, opacity: 0.55 }));
  addLabel('Oort cloud · the edge of the Sun’s reach', () => new THREE.Vector3(20000, 8000, 0), [14.6, 16.6], { scene: 'solar' });

  return {
    name: 'solar',
    scene,
    metresPerUnit: AU,
    visible: (z) => smooth(9.7, 10.5, z) * (1 - smooth(16.0, 16.8, z)),
    // Start centred on Earth, slide over to the Sun as we pull back
    // (by at most half the viewing distance, so Earth stays in view)
    target: (z) => {
      const distance = 10 ** z / AU;
      const shift = Math.min(earthPos.length(), distance * 0.5);
      return earthPos.clone().addScaledVector(earthPos.clone().normalize(), -shift);
    },
    update() {},
  };
}

function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},1)`;
}
