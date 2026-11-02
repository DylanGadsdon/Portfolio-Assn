// public/js/universe/cosmic.js — from our neighbour galaxies out to the edge
// of everything we can see. Units: 1 = 1 million light-years (Mly).
//
// Galaxies aren't spread evenly: they gather along filaments around huge
// empty voids, the "cosmic web". This is a generated impression of it.
// The edge is the cosmic microwave background, the afterglow of the Big Bang,
// now about 46.5 billion light-years away because space kept expanding.

import * as THREE from 'three';
import { LY, smooth, pointCloud, glow, gauss } from './common.js';

const EDGE = 46_500;   // Mly

export function createCosmic({ addLabel }) {
  const scene = new THREE.Scene();
  const MLY = LY * 1e6;
  const c = new THREE.Color();

  // ---- The Local Group: our galaxy and its neighbours ----
  const neighbours = [
    ['The Milky Way', new THREE.Vector3(0, 0, 0), 'rgba(255,230,170,1)', 12],
    ['Andromeda · 2.5 million ly', new THREE.Vector3(1.9, 0.6, -1.5), 'rgba(200,220,255,1)', 11],
    ['Triangulum', new THREE.Vector3(2.3, -0.5, -1.0), 'rgba(200,220,255,1)', 6],
  ];
  for (const [name, pos, colour, size] of neighbours) {
    const g = glow(colour, size);
    g.position.copy(pos);
    scene.add(g);
    addLabel(name, () => pos, [21.6, 23.6], { scene: 'cosmic', big: name.startsWith('The') });
  }

  // ---- The cosmic web: knots joined by filaments ----
  const nodes = [];
  for (let i = 0; i < 220; i++) {
    const r = EDGE * Math.cbrt(Math.random()) * 0.97;
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    nodes.push(new THREE.Vector3(s * Math.cos(a) * r, u * r, s * Math.sin(a) * r));
  }
  // a few closer knots so there's structure at "only" hundreds of millions of ly
  for (let i = 0; i < 18; i++) nodes.push(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(900));

  const pts = [], cols = [];
  for (const n of nodes) {
    // connect each knot to its 3 nearest neighbours
    const near = nodes.filter((m) => m !== n).sort((a, b) => a.distanceTo(n) - b.distanceTo(n)).slice(0, 3);
    for (const m of near) {
      const steps = Math.min(180, Math.max(20, Math.round(n.distanceTo(m) / 120)));
      const jitter = n.distanceTo(m) * 0.03;
      for (let k = 0; k < steps; k++) {
        const t = Math.random();
        pts.push(n.x + (m.x - n.x) * t + gauss() * jitter, n.y + (m.y - n.y) * t + gauss() * jitter, n.z + (m.z - n.z) * t + gauss() * jitter);
        c.setHSL(0.62 + gauss() * 0.06, 0.6, 0.65 + Math.random() * 0.2);
        cols.push(c.r, c.g, c.b);
      }
    }
    const local = n.length() < 2000;
    for (let k = 0; k < (local ? 8 : 40); k++) {   // bright clusters at the knots
      const spread = local ? 120 : 600;
      pts.push(n.x + gauss() * spread, n.y + gauss() * spread, n.z + gauss() * spread);
      c.setHSL(0.1, 0.5, 0.85);
      cols.push(c.r, c.g, c.b);
    }
  }
  scene.add(pointCloud(pts, cols, { size: 1.6, opacity: 0.7 }));
  addLabel('The cosmic web · galaxies along filaments', () => nodes[0], [23.4, 25.8], { scene: 'cosmic' });

  // ---- The edge: the cosmic microwave background, blotchy red/orange ----
  const shell = [], shellCol = [];
  const waves = Array.from({ length: 6 }, () => ({
    k: new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(2 + Math.random() * 6),
    p: Math.random() * 6,
  }));
  for (let i = 0; i < 26000; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const v = new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a));
    let n = 0;
    for (const w of waves) n += Math.sin(v.dot(w.k) + w.p);
    n = n / waves.length * 0.5 + 0.5;            // 0..1 lumpy pattern
    c.setHSL(0.02 + n * 0.1, 0.95, 0.4 + n * 0.25);
    shell.push(v.x * EDGE, v.y * EDGE, v.z * EDGE);
    shellCol.push(c.r, c.g, c.b);
  }
  const cmb = pointCloud(shell, shellCol, { size: 2.6, opacity: 0.95 });
  scene.add(cmb);
  addLabel('Edge of the observable universe · 46.5 billion ly', () => new THREE.Vector3(EDGE * 0.7, EDGE * 0.72, 0), [26.3, 27.25], { scene: 'cosmic', big: true });

  return {
    name: 'cosmic',
    scene,
    metresPerUnit: MLY,
    visible: (z) => smooth(21.6, 22.4, z),
    target: () => new THREE.Vector3(0, 0, 0),
    update(z) {
      // The afterglow brightens as we approach it
      cmb.material.opacity = cmb.material.userData.base * smooth(24.5, 26.4, z) * smooth(21.6, 22.4, z);
    },
  };
}
