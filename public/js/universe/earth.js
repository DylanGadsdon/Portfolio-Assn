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
  scene.add(sun, new THREE.AmbientLight(0x6688aa, 0.06));

  // ---- Earth ----
  // ---- Earth: NASA Blue Marble by day, city lights by night ----
  // A small "shader" (a program that runs on the graphics card for every pixel)
  // mixes the two maps by how much sunlight each point gets, and adds the
  // glint of the sun on the oceans. Falls back to a drawn map while loading.
  const loader = new THREE.TextureLoader();
  const tex = (url, srgb = true) => {
    const t = loader.load(url);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const sunUniform = { value: sunDir.clone() };
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: tex('/media/earth/day.jpg') },
      nightMap: { value: tex('/media/earth/night.jpg') },
      waterMap: { value: tex('/media/earth/water.jpg', false) },
      sunDir: sunUniform,
    },
    // (the #include lines opt in to the page's logarithmic depth buffer, which
    //  lets one camera handle both satellites and the Moon without flicker)
    vertexShader: `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPos;
      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `
      #include <logdepthbuf_pars_fragment>
      uniform sampler2D dayMap, nightMap, waterMap;
      uniform vec3 sunDir;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vPos;
      void main() {
        #include <logdepthbuf_fragment>
        vec3 n = normalize(vNormal);
        float light = dot(n, sunDir);                       // 1 = sun overhead, <0 = night
        float day = smoothstep(-0.08, 0.12, light);         // soft line between day and night
        vec3 base = vec3(0.0005, 0.0009, 0.002);            // faint glow so the night isn't pure black
        vec3 dayCol = texture2D(dayMap, vUv).rgb * (0.02 + 1.1 * pow(max(light, 0.0), 0.75)) + base;
        // night.jpg holds only the city lights (everything else is black)
        vec3 nightCol = texture2D(nightMap, vUv).rgb * 1.3 + base;
        vec3 col = mix(nightCol, dayCol, day);
        // sunlight glinting off the sea
        vec3 view = normalize(cameraPosition - vPos);
        float spec = pow(max(dot(n, normalize(sunDir + view)), 0.0), 60.0);
        col += vec3(1.0, 0.92, 0.78) * spec * texture2D(waterMap, vUv).r * day * 0.55;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMaterial);
  scene.add(earth);

  // Clouds: a slightly bigger, see-through sphere, lit by the same sun
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.007, 96, 64),
    new THREE.MeshLambertMaterial({ color: 0xffffff, alphaMap: tex('/media/earth/clouds.jpg', false), transparent: true, depthWrite: false, opacity: 0.9 }),
  );
  scene.add(clouds);

  // Atmosphere: a slightly bigger sphere that glows at the edges
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
      uniforms: { opacity: { value: 1 } },
      vertexShader: `#include <common>
        #include <logdepthbuf_pars_vertex>
        varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        #include <logdepthbuf_vertex>
        }`,
      fragmentShader: `#include <logdepthbuf_pars_fragment>
        uniform float opacity; varying vec3 vN; void main(){
        #include <logdepthbuf_fragment>
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
    [/^STARLINK-/, 'Starlink · one of thousands', '#9fe7ff'],
    [/^ONEWEB-/, 'OneWeb · internet from orbit', '#9fe7ff'],
    [/^LANDSAT 9/, 'Landsat 9 · photographs the Earth', '#a8f0c6'],
    [/^SENTINEL-2/, 'Sentinel-2 · Europe\'s eye on the land', '#a8f0c6'],
    [/^NOAA 2[01]/, 'NOAA weather satellite', '#a8f0c6'],
    [/^IRIDIUM \d/, 'Iridium · satellite phones', '#9fe7ff'],
    [/^GPS BIII/, 'GPS satellite · 20,200 km up', '#ffd166'],
    [/^GALILEO|^GSAT0\d/, 'Galileo · Europe\'s GPS', '#ffd166'],
    [/^GOES[- ]1[89]/, 'GOES · weather, 35,786 km up', '#ff9ad5'],
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
    points = pointCloud(new Float32Array(n * 3), new Float32Array(n * 3), { size: 2.6 });
    points.frustumCulled = false;
    scene.add(points);

    for (const [pattern, label, colour] of FAMOUS) {
      const index = sats.findIndex((s) => pattern.test(s.name));
      if (index < 0) continue;
      const dot = glow(hexToRgba(colour), 11);
      const trail = new THREE.Line(new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.45 }));
      scene.add(dot, trail);
      const high = /GPS|Galileo|GOES/.test(label);
      addLabel(label, () => dot.position, high ? [7.5, 8.9] : [6.9, 8.0], { scene: 'earth', big: index === 0 || /ISS/.test(label) });
      famous.push({ index, dot, trail, trailAt: 0 });
    }

    const now = new Date();
    for (let i = 0; i < n; i++) exact(i, now);
    points.geometry.attributes.color.needsUpdate = true;
  }

  const WHITE = [0.92, 0.95, 1];
  const YELLOW = [1, 0.84, 0.25];
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

    // Every satellite is a white dot (the yellow "over you" colour is set in update)
    points.geometry.attributes.color.array.set(WHITE, i * 3);
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

  // ---- What's over me? ----
  // The browser tells us roughly where you are (only if you say yes). A point on
  // the ground turns with the Earth, so its position in space depends on the time.
  let observer = null;        // { lat, lon } in radians
  let lastCount = 0;
  let marker = null;
  const button = document.querySelector('#overhead');
  const overheadText = (n) => {
    button.textContent = `◉ ${n.toLocaleString('en-GB')} satellites above you now`;
  };
  function observerVector(date) {
    const a = observer.lon + gstime(date);                       // longitude measured in space
    const v = new THREE.Vector3(Math.cos(observer.lat) * Math.cos(a), Math.sin(observer.lat), -Math.cos(observer.lat) * Math.sin(a));
    marker?.position.copy(v);
    return v;
  }
  button?.addEventListener('click', () => {
    if (!navigator.geolocation) { button.textContent = 'Location isn’t available in this browser'; return; }
    button.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      observer = { lat: coords.latitude * Math.PI / 180, lon: coords.longitude * Math.PI / 180 };
      marker = glow('rgba(255,214,64,1)', 9);
      scene.add(marker);
      addLabel('You are here', () => marker.position, [6.5, 8.3], { scene: 'earth' });
      button.setAttribute('aria-pressed', 'true');
    }, () => { button.textContent = 'Location blocked: allow it to see what’s above you'; },
    { maximumAge: 600000, timeout: 15000 });
  });

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
      clouds.rotation.y = earth.rotation.y + now.getTime() / 4e7;   // clouds drift slowly
      clouds.material.opacity = 0.9 * (1 - smooth(9.4, 10.2, z));
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
      const col = points.geometry.attributes.color.array;
      const { p, q, w, t } = base;
      const ms = now.getTime();
      const me = observer && observerVector(now);   // where you are, in space, right now
      let overhead = 0;
      for (let i = 0; i < sats.length; i++) {
        const th = w[i] * (ms - t[i]) / 1000;
        const c = Math.cos(th), s = Math.sin(th), j = i * 3;
        out[j] = p[j] * c + q[j] * s;
        out[j + 1] = p[j + 1] * c + q[j + 1] * s;
        out[j + 2] = p[j + 2] * c + q[j + 2] * s;
        if (me) {
          // Above your horizon by more than 10°? (angle between "straight up" and the line to it)
          const dx = out[j] - me.x, dy = out[j + 1] - me.y, dz = out[j + 2] - me.z;
          const up = (dx * me.x + dy * me.y + dz * me.z) / Math.hypot(dx, dy, dz);
          const above = up > 0.17 && out[j] * out[j] + out[j + 1] * out[j + 1] + out[j + 2] * out[j + 2] > 0.5;
          col.set(above ? YELLOW : WHITE, j);
          if (above) overhead++;
        }
      }
      points.geometry.attributes.position.needsUpdate = true;
      if (me) {
        points.geometry.attributes.color.needsUpdate = true;
        if (ms - lastCount > 1000) { lastCount = ms; overheadText(overhead); }
      }

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
