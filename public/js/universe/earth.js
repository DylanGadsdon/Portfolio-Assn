// public/js/universe/earth.js — Earth, the Moon and every tracked satellite.
// Units: 1 = Earth's radius (6,371 km). Frame: equatorial (y = north pole).
//
// How the live satellites work:
//  1. Our server hands over CelesTrak's orbit data (TLEs) for ~10,000 satellites.
//  2. satellite.js runs SGP4, the standard orbit model, to turn each TLE + the
//     current time into a position in km.
//  3. We recalculate a slice of them every frame, so every satellite is
//     refreshed about every two seconds without slowing the page down.

import * as THREE from 'three';
import { twoline2satrec } from '/vendor/satellite/io.js';
import { propagate, gstime } from '/vendor/satellite/propagation.js';
import { EARTH_R, smooth, pointCloud, glow, eqToThree } from './common.js';

const KM = 1 / 6371;   // km → Earth radii

export function createEarth({ addLabel, setStatus }) {
  const scene = new THREE.Scene();

  // ---- Light from the real direction of the Sun right now (day/night side) ----
  const A = window.Astronomy;
  const sunDir = eqToThree(A.GeoVector(A.Body.Sun, new Date(), true)).normalize();
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.position.copy(sunDir.clone().multiplyScalar(100));
  scene.add(sun, new THREE.AmbientLight(0x6688aa, 0.55));

  // ---- Earth ----
  const texture = new THREE.CanvasTexture(drawEarthMap());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 64),
    new THREE.MeshPhongMaterial({ map: texture, shininess: 12, specular: 0x223344 }),
  );
  scene.add(earth);
  loadLand(texture);

  // Atmosphere: a slightly bigger sphere that glows at the edges
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      uniforms: { opacity: { value: 1 } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float opacity; varying vec3 vN; void main(){
        float i = pow(0.75 - dot(vN, vec3(0.0,0.0,1.0)), 3.0);
        gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * i * opacity; }`,
    }),
  );
  scene.add(atmosphere);

  // Geostationary ring (35,786 km up), as a faint guide
  const geoRadius = (6371 + 35786) * KM;
  const ringPts = [];
  for (let i = 0; i <= 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * geoRadius, 0, Math.sin(a) * geoRadius));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0xff7ac8, transparent: true, opacity: 0.18 })));
  addLabel('Geostationary ring · 35,786 km up', () => new THREE.Vector3(geoRadius, 0, 0), [8.0, 9.0], { scene: 'earth' });

  // ---- The Moon, at its real position ----
  const moonPos = eqToThree(A.GeoVector(A.Body.Moon, new Date(), true), 149_597_870.7 * KM);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.2727, 48, 32),
    new THREE.MeshPhongMaterial({ color: 0xbdb8ad, shininess: 2 }));
  moon.position.copy(moonPos);
  const moonGlow = glow('rgba(235,228,210,1)', 5);   // keeps the Moon visible from far away
  moonGlow.position.copy(moonPos);
  scene.add(moon, moonGlow);
  addLabel('The Moon', () => moonPos, [8.1, 10.1], { scene: 'earth', big: true });

  // ---- Satellites ----
  // Two speeds of maths keep ~12,000 satellites moving smoothly:
  //  - EXACT: SGP4 (the official orbit model) gives a satellite's true position
  //    and velocity at one moment. Too slow to do for all of them every frame,
  //    so we redo a rolling slice each frame (the whole fleet about once a second).
  //  - FAST: in between, each satellite glides round the Earth from its last exact
  //    point, as if on a circle. Two multiplications per satellite per frame.
  let sats = [];
  let points = null;
  let cursor = 0;
  let base = null;    // per satellite: p (position), q (90° ahead), angular speed, time
  const famous = [];  // the labelled ones: their own bigger dot + orbit trail

  // Well-known satellites to label. First match by name in the CelesTrak list.
  const FAMOUS = [
    [/^ISS \(ZARYA\)/, 'ISS · International Space Station', '#ffe08c'],
    [/^CSS \(TIANHE\)/, 'Tiangong · Chinese space station', '#ffb38a'],
    [/^HST$/, 'Hubble Space Telescope', '#c9b6ff'],
    [/^STARLINK-/, 'Starlink · one of ~7,000', '#9fe7ff'],
    [/^GPS BIII/, 'GPS satellite · 20,200 km up', '#ffd166'],
  ];

  async function loadSatellites() {
    for (const group of ['active', 'stations']) {
      try {
        const res = await fetch(`/api/satellites?group=${group}`);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        sats = data.sats.map((s) => ({ name: s.name, rec: twoline2satrec(s.line1, s.line2) }));
        build(data.fetchedAt);
        const when = new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setStatus(`${sats.length.toLocaleString('en-GB')} satellites · real orbits from CelesTrak (fetched ${when})`);
        return;
      } catch (err) {
        console.warn(`Satellites (${group}) unavailable`, err);
      }
    }
    setStatus('Satellite feed offline right now');
  }

  function build() {
    const n = sats.length;
    base = { p: new Float32Array(n * 3), q: new Float32Array(n * 3), w: new Float32Array(n), t: new Float64Array(n) };
    points = pointCloud(new Float32Array(n * 3), new Float32Array(n * 3), { size: 2.4 });
    points.frustumCulled = false;
    scene.add(points);

    for (const [pattern, label, colour] of FAMOUS) {
      const index = sats.findIndex((s) => pattern.test(s.name));
      if (index < 0) continue;
      const dot = glow(hexToRgba(colour), 11);
      const trail = new THREE.Line(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.45 }));
      scene.add(dot, trail);
      const high = /GPS/.test(label);
      addLabel(label, () => dot.position, high ? [7.5, 8.9] : [6.9, 8.0], { scene: 'earth', big: index === 0 || /ISS/.test(label) });
      famous.push({ index, dot, trail, trailAt: 0 });
    }

    const now = new Date();
    for (let i = 0; i < n; i++) exact(i, now);
    points.geometry.attributes.color.needsUpdate = true;
  }

  const colour = new THREE.Color();
  const P = new THREE.Vector3(), V = new THREE.Vector3(), K = new THREE.Vector3();

  // EXACT position + velocity from SGP4, stored as the start of the next glide
  function exact(i, date) {
    const pv = propagate(sats[i].rec, date);
    if (!pv || !pv.position) { base.w[i] = 0; base.p.fill(0, i * 3, i * 3 + 3); base.q.fill(0, i * 3, i * 3 + 3); return; }
    // satellite.js: km, Earth-centred, z = north. Three.js: y = up.
    P.set(pv.position.x, pv.position.z, -pv.position.y).multiplyScalar(KM);
    V.set(pv.velocity.x, pv.velocity.z, -pv.velocity.y).multiplyScalar(KM);   // radii per second
    const r = P.length();
    K.crossVectors(P, V).normalize();            // the axis it orbits around
    const q = new THREE.Vector3().crossVectors(K, P);   // same distance, 90° further along
    base.p.set([P.x, P.y, P.z], i * 3);
    base.q.set([q.x, q.y, q.z], i * 3);
    base.w[i] = V.length() / r;                  // radians per second
    base.t[i] = date.getTime();

    // Colour by height: low orbit cyan, middle (GPS etc.) yellow, geostationary pink
    const alt = (r - 1) * 6371;
    colour.set(alt < 2000 ? 0x7fe8ff : alt < 30000 ? 0xffd166 : 0xff7ac8);
    points.geometry.attributes.color.array.set([colour.r, colour.g, colour.b], i * 3);
  }

  // A labelled satellite's path over one full orbit, from SGP4
  function drawTrail(f, date) {
    const rec = sats[f.index].rec;
    const minutes = (2 * Math.PI) / rec.no;      // rec.no = radians per minute
    const pts = [];
    for (let k = 0; k <= 120; k++) {
      const pv = propagate(rec, new Date(date.getTime() + (k / 120) * minutes * 60000));
      if (pv?.position) pts.push(new THREE.Vector3(pv.position.x, pv.position.z, -pv.position.y).multiplyScalar(KM));
    }
    f.trail.geometry.dispose();
    f.trail.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    f.trailAt = date.getTime();
  }

  loadSatellites();

  return {
    name: 'earth',
    scene,
    metresPerUnit: EARTH_R,
    visible: (z) => 1 - smooth(9.7, 10.5, z),
    target: () => new THREE.Vector3(0, 0, 0),
    update(z, now) {
      // Earth turns once a day: rotate by sidereal time so the map lines up with the sky
      earth.rotation.y = gstime(now);
      atmosphere.material.uniforms.opacity.value = 1 - smooth(9.7, 10.5, z);
      if (!points || z > 10.5) return;

      // EXACT for a slice of the fleet
      const slice = Math.ceil(sats.length / 60);
      for (let n = 0; n < slice; n++) {
        exact(cursor, now);
        cursor = (cursor + 1) % sats.length;
      }
      if (slice) points.geometry.attributes.color.needsUpdate = true;

      // FAST glide for everyone: position = p·cos(θ) + q·sin(θ)
      const out = points.geometry.attributes.position.array;
      const { p, q, w, t } = base;
      const ms = now.getTime();
      for (let i = 0; i < sats.length; i++) {
        const th = w[i] * (ms - t[i]) / 1000;
        const c = Math.cos(th), s = Math.sin(th), j = i * 3;
        out[j] = p[j] * c + q[j] * s;
        out[j + 1] = p[j + 1] * c + q[j + 1] * s;
        out[j + 2] = p[j + 2] * c + q[j + 2] * s;
      }
      points.geometry.attributes.position.needsUpdate = true;

      // Labelled satellites: exact every frame, trail redrawn every simulated 5 min
      for (const f of famous) {
        const pv = propagate(sats[f.index].rec, now);
        if (pv?.position) f.dot.position.set(pv.position.x, pv.position.z, -pv.position.y).multiplyScalar(KM);
        if (Math.abs(ms - f.trailAt) > 300000) drawTrail(f, now);
      }
    },
  };
}

function hexToRgba(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},1)`;
}

// ---- Earth's surface, drawn on a canvas (equirectangular map) ----
function drawEarthMap(land) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 1024;
  const g = c.getContext('2d');
  const sea = g.createLinearGradient(0, 0, 0, 1024);
  sea.addColorStop(0, '#0c2a48'); sea.addColorStop(0.5, '#0f3a63'); sea.addColorStop(1, '#0c2a48');
  g.fillStyle = sea;
  g.fillRect(0, 0, 2048, 1024);
  // faint latitude/longitude grid
  g.strokeStyle = 'rgba(140,200,255,0.10)';
  g.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) { const x = ((lon + 180) / 360) * 2048; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { const y = ((90 - lat) / 180) * 1024; g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }

  if (land) {
    g.fillStyle = '#3f7d5c';
    g.strokeStyle = '#7fc29b';
    g.lineWidth = 1.2;
    for (const polygon of land) {
      g.beginPath();
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => {
          const x = ((lon + 180) / 360) * 2048;
          const y = ((90 - lat) / 180) * 1024;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.closePath();
      }
      g.fill('evenodd');
      g.stroke();
    }
    // polar ice caps
    g.fillStyle = 'rgba(235,245,255,0.85)';
    g.fillRect(0, 0, 2048, 18);
  }
  return c;
}

async function loadLand(texture) {
  try {
    const topo = await (await fetch('/vendor/world-atlas/land-110m.json')).json();
    const land = window.topojson.feature(topo, topo.objects.land);
    const polygons = land.features.flatMap((f) =>
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates);
    texture.image = drawEarthMap(polygons);
    texture.needsUpdate = true;
  } catch (err) {
    console.warn('Could not draw continents', err);
  }
}
