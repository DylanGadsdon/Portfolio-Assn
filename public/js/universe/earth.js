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
  let sats = [];
  let points = null;
  let iss = null;
  let cursor = 0;

  async function loadSatellites() {
    for (const group of ['active', 'stations']) {
      try {
        const res = await fetch(`/api/satellites?group=${group}`);
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        sats = data.sats.map((s) => ({ name: s.name, rec: twoline2satrec(s.line1, s.line2) }));
        build();
        const when = new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        setStatus(`${sats.length.toLocaleString('en-GB')} satellites · live positions from CelesTrak orbits (fetched ${when})`);
        return;
      } catch (err) {
        console.warn(`Satellites (${group}) unavailable`, err);
      }
    }
    setStatus('Satellite feed offline right now');
  }

  function build() {
    const positions = new Float32Array(sats.length * 3);
    const colors = new Float32Array(sats.length * 3);
    points = pointCloud(positions, colors, { size: 2.4 });
    points.frustumCulled = false;
    scene.add(points);
    const issIndex = sats.findIndex((s) => /ISS \(ZARYA\)/.test(s.name));
    if (issIndex >= 0) {
      iss = { index: issIndex, dot: glow('rgba(255,224,140,1)', 14) };
      scene.add(iss.dot);
      addLabel('ISS · ~400 km up', () => iss.dot.position, [6.9, 7.9], { scene: 'earth', big: true });
    }
    // Calculate every position once now, then spread the work over frames
    for (let i = 0; i < sats.length; i++) updateSat(i, new Date());
    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
  }

  const colour = new THREE.Color();
  function updateSat(i, now) {
    const pv = propagate(sats[i].rec, now);
    const pos = points.geometry.attributes.position.array;
    if (!pv || !pv.position) { pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; return; }
    const { x, y, z } = pv.position;              // km, Earth-centred
    pos[i * 3] = x * KM; pos[i * 3 + 1] = z * KM; pos[i * 3 + 2] = -y * KM;

    // Colour by height: low orbit cyan, middle (GPS etc.) yellow, geostationary pink
    const alt = Math.hypot(x, y, z) - 6371;
    colour.set(alt < 2000 ? 0x7fe8ff : alt < 30000 ? 0xffd166 : 0xff7ac8);
    const col = points.geometry.attributes.color.array;
    col[i * 3] = colour.r; col[i * 3 + 1] = colour.g; col[i * 3 + 2] = colour.b;
    if (iss && i === iss.index) iss.dot.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
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
      const slice = Math.ceil(sats.length / 120);     // whole fleet every ~2 seconds
      for (let n = 0; n < slice; n++) {
        updateSat(cursor, now);
        cursor = (cursor + 1) % sats.length;
      }
      points.geometry.attributes.position.needsUpdate = true;
    },
  };
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
