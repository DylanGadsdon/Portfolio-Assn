// public/js/universe/galaxy.js — the Milky Way, generated as a spiral of points.
// Units: 1 = 1 light-year. The real Milky Way is ~100,000 ly across and the
// Sun sits ~26,000 ly from the centre, between two spiral arms.

import * as THREE from 'three';
import { LY, smooth, lerp, pointCloud, gauss } from './common.js';

const SUN = new THREE.Vector3(-26000, 30, 4000);

export function createGalaxy({ addLabel }) {
  const scene = new THREE.Scene();
  const positions = [], colors = [];
  const c = new THREE.Color();

  // Spiral arms: angle grows with the log of the distance (a "logarithmic spiral")
  const ARMS = 4, PITCH = Math.tan((13 * Math.PI) / 180);
  for (let i = 0; i < 60000; i++) {
    const r = 1500 + Math.pow(Math.random(), 0.8) * 48000;
    const arm = i % ARMS;
    const angle = (arm / ARMS) * Math.PI * 2 + Math.log(r / 1500) / PITCH + gauss() * 0.35;
    const spread = 1 + r / 9000;
    positions.push(
      Math.cos(angle) * r + gauss() * 900 * spread,
      gauss() * 500 * (1 - r / 60000),
      Math.sin(angle) * r + gauss() * 900 * spread,
    );
    // young blue stars in the arms, older yellow ones towards the middle
    c.setHSL(lerp(0.12, 0.6, Math.min(1, r / 30000)) + gauss() * 0.04, 0.6, 0.72 + Math.random() * 0.2);
    colors.push(c.r, c.g, c.b);
  }
  // The central bulge
  for (let i = 0; i < 14000; i++) {
    positions.push(gauss() * 5000, gauss() * 2800, gauss() * 5000);
    c.setHSL(0.1 + Math.random() * 0.03, 0.7, 0.75);
    colors.push(c.r, c.g, c.b);
  }
  scene.add(pointCloud(positions, colors, { size: 1.8, opacity: 0.8 }));

  // Our neighbourhood: a few thousand stars within ~1,500 ly of the Sun,
  // denser close by, so the zoom never goes suddenly empty
  const local = [], localCol = [];
  for (let i = 0; i < 6000; i++) {
    const r = Math.pow(10, lerp(0.6, 3.2, Math.random()));
    const v = new THREE.Vector3().randomDirection().multiplyScalar(r);
    v.y *= 0.35;   // flattened, like the disc
    local.push(SUN.x + v.x, SUN.y + v.y, SUN.z + v.z);
    c.setHSL(0.08 + Math.random() * 0.55, 0.5, 0.8);
    localCol.push(c.r, c.g, c.b);
  }
  scene.add(pointCloud(local, localCol, { size: 1.6, opacity: 0.85 }));

  const here = pointCloud([SUN.x, SUN.y, SUN.z], null, { size: 10 });
  here.material.color = new THREE.Color('#ffe08a');
  scene.add(here);
  // Some real neighbours, at their true distances from the Sun
  // (RA/Dec turned into a direction; the frame is tilted relative to the disc)
  const NEAR = [
    ['Alpha Centauri · 4.4 ly', 219.9, -60.8, 4.37, [16.2, 17.7]],
    ['Sirius · 8.6 ly', 101.3, -16.7, 8.6, [16.3, 17.9]],
    ['Vega · 25 ly', 279.2, 38.8, 25, [16.8, 18.4]],
    ['Pleiades · 444 ly', 56.8, 24.1, 444, [17.8, 19.4]],
    ['Betelgeuse · ~550 ly', 88.8, 7.4, 548, [17.9, 19.5]],
  ];
  for (const [name, ra, dec, dist, range] of NEAR) {
    const r = (ra * Math.PI) / 180, d = (dec * Math.PI) / 180;
    const pos = new THREE.Vector3(Math.cos(d) * Math.cos(r), Math.sin(d), -Math.cos(d) * Math.sin(r))
      .multiplyScalar(dist).add(SUN);
    const star = pointCloud([pos.x, pos.y, pos.z], null, { size: 6 });
    star.material.color = new THREE.Color(name.startsWith('Betel') ? '#ffb07a' : '#cfe3ff');
    scene.add(star);
    addLabel(name, () => pos, range, { scene: 'galaxy' });
  }

  addLabel('You are here · the Sun', () => SUN, [16.2, 20.8], { scene: 'galaxy', big: true });
  addLabel('The Milky Way · 100,000 light-years across', () => new THREE.Vector3(0, 3000, 0), [19.6, 22.0], { scene: 'galaxy' });

  return {
    name: 'galaxy',
    scene,
    metresPerUnit: LY,
    visible: (z) => smooth(16.0, 16.8, z) * (1 - smooth(21.6, 22.4, z)),
    // Start at the Sun and drift towards the galaxy's centre as we pull back,
    // never by more than half the viewing distance, so the Sun stays in view
    target: (z) => {
      const distance = 10 ** z / LY;
      const shift = Math.min(SUN.length(), distance * 0.5);
      return SUN.clone().addScaledVector(SUN.clone().normalize(), -shift);
    },
    update() {},
  };
}
