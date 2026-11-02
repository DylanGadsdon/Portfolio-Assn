// public/js/universe/common.js — small shared helpers for the zoom-out.

import * as THREE from 'three';

export const AU = 149_597_870_700;        // metres in one astronomical unit (Sun–Earth)
export const LY = 9.4607e15;              // metres in one light-year
export const EARTH_R = 6_371_000;         // metres

export const smooth = (a, b, x) => {      // 0 below a, 1 above b, smooth in between
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;

// A soft round dot texture, used for stars, planets and glows
export function dotTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.6)'));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A cloud of points with per-point colours. size is in screen pixels.
export function pointCloud(positions, colors, { size = 2, opacity = 1, map = dotTexture(), additive = true } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size, sizeAttenuation: false, vertexColors: !!colors, map,
    transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  return new THREE.Points(geo, mat);
}

// One glowing dot (a planet, the Sun, a galaxy)
export function glow(color, size) {
  return pointCloud([0, 0, 0], null, { size, map: dotTexture(color) });
}

// Gaussian-ish random number (sum of uniforms)
export const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;

// Astronomy-engine gives positions in the equatorial frame (z = Earth's north pole).
// Three.js uses y as "up", so: x → x, z → y, y → −z.
export const eqToThree = (v, scale = 1) => new THREE.Vector3(v.x * scale, v.z * scale, -v.y * scale);

// Same, but first tilt into the ecliptic (the plane the planets orbit in)
const OBLIQUITY = (23.4393 * Math.PI) / 180;
export function eqToEcliptic3(v, scale = 1) {
  const y = v.y * Math.cos(OBLIQUITY) + v.z * Math.sin(OBLIQUITY);
  const z = -v.y * Math.sin(OBLIQUITY) + v.z * Math.cos(OBLIQUITY);
  return new THREE.Vector3(v.x * scale, z * scale, -y * scale);
}

// Remember each material's normal opacity so a whole scene can be faded in/out
export function prepareFade(scene) {
  const mats = [];
  scene.traverse((o) => {
    const list = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of list) {
      if (m.userData.base == null) { m.userData.base = m.opacity; m.transparent = true; }
      mats.push(m);
    }
  });
  return (fade) => { for (const m of mats) m.opacity = m.userData.base * fade; };
}
