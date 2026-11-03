// public/js/world/livedata.js — the live instruments.
//
//  Sky      → weather balloons: Open-Meteo API (free, no key)
//  Seabed   → seismograph: USGS earthquake feed (free, no key)
//  Space    → the Moon and the tides: calculated with astronomy-engine
//  Surface  → world population: an estimate built from UN birth/death rates
//
// Open-Meteo and USGS allow requests from any website (CORS), so the
// browser fetches them directly. No secret keys are involved.

import { art, personIcon } from './art.js';

// ======================= Weather =======================

const CITIES = [
  { name: 'New York',    lat: 40.71, lon: -74.01,  colour: '#ff6b6b', x: 3,  y: 92 },
  { name: 'London',      lat: 51.51, lon: -0.13,   colour: '#ffd166', x: 3,  y: 103 },
  { name: 'Bangkok',     lat: 13.76, lon: 100.50,  colour: '#06d6a0', x: 86, y: 92 },
  { name: 'Los Angeles', lat: 34.05, lon: -118.24, colour: '#f78c6b', x: 86, y: 103 },
  { name: 'Kyoto',       lat: 35.01, lon: 135.77,  colour: '#c77dff', x: 3,  y: 114 },
];

// WMO weather codes → words + symbol
function describeWeather(code, isDay) {
  if (code === 0) return isDay ? ['Clear', '☀'] : ['Clear', '☾'];
  if (code <= 2) return ['Partly cloudy', '⛅'];
  if (code === 3) return ['Overcast', '☁'];
  if (code <= 48) return ['Fog', '≋'];
  if (code <= 57) return ['Drizzle', '☂'];
  if (code <= 67) return ['Rain', '☂'];
  if (code <= 77) return ['Snow', '❄'];
  if (code <= 82) return ['Showers', '☂'];
  if (code <= 86) return ['Snow showers', '❄'];
  return ['Thunderstorm', '⚡'];
}

function buildBalloons() {
  const box = document.querySelector('#balloons');
  return CITIES.map((city, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'balloon-wrap';
    wrap.style.setProperty('--x', `${city.x}%`);
    wrap.style.top = `calc(var(--vh) * ${city.y - 90})`;   // #sky starts at 90vh
    wrap.style.animationDelay = `${-i * 1.3}s`;
    wrap.style.color = city.colour;
    wrap.innerHTML = `${art.balloon}
      <div class="panel"><p class="label"></p><p class="big">…</p><p class="small">Fetching</p></div>`;
    wrap.querySelector('.label').textContent = city.name;
    box.append(wrap);
    return wrap;
  });
}

async function loadWeather(balloons) {
  const params = new URLSearchParams({
    latitude: CITIES.map((c) => c.lat).join(','),
    longitude: CITIES.map((c) => c.lon).join(','),
    current: 'temperature_2m,weather_code,wind_speed_10m,is_day',
    timezone: 'auto',
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    let data = await res.json();
    if (!Array.isArray(data)) data = [data];   // one location → object, several → array

    data.forEach((place, i) => {
      const { temperature_2m: temp, weather_code: code, wind_speed_10m: wind, is_day: isDay } = place.current;
      const [words, symbol] = describeWeather(code, isDay);
      // Local time = now + that city's offset from UTC
      const local = new Date(Date.now() + place.utc_offset_seconds * 1000);
      const time = local.toISOString().slice(11, 16);
      balloons[i].querySelector('.big').textContent = `${symbol} ${Math.round(temp)}°C`;
      balloons[i].querySelector('.small').textContent = `${words} · ${Math.round(wind)} km/h · ${time}`;
    });
  } catch (err) {
    console.warn(err);
    balloons.forEach((b) => { b.querySelector('.small').textContent = 'Weather offline'; });
  }
}

// ======================= Earthquakes =======================

const USGS = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

function timeAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

async function loadQuakes() {
  const list = document.querySelector('#quakes');
  try {
    const res = await fetch(USGS);
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const data = await res.json();
    // Each "feature" is one earthquake: properties.mag, .place, .time (ms), .url
    const quakes = data.features
      .map((f) => ({ ...f.properties, depth: f.geometry.coordinates[2] }))
      .sort((a, b) => b.time - a.time);

    list.replaceChildren(...quakes.slice(0, 5).map((q) => {
      const li = document.createElement('li');
      const mag = document.createElement('span');
      mag.className = 'mag';
      mag.textContent = `M${q.mag.toFixed(1)}`;
      const a = document.createElement('a');
      a.href = q.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = `${q.place} · ${timeAgo(q.time)}`;
      li.append(mag, a);
      return li;
    }));
    drawSeismograph(quakes);
  } catch (err) {
    console.warn(err);
    list.replaceChildren(Object.assign(document.createElement('li'), { className: 'small', textContent: 'Seismograph offline' }));
    drawSeismograph([]);
  }
}

// Last 24 hours, left to right. Each quake is a spike; bigger magnitude = taller.
function drawSeismograph(quakes) {
  const canvas = document.querySelector('#seismo');
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * ratio; canvas.height = h * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  const now = Date.now(), day = 86400000;
  const spikes = quakes.filter((q) => now - q.time < day)
    .map((q) => ({ x: w * (1 - (now - q.time) / day), a: Math.min(h * 0.48, (q.mag - 2) * 9) }));

  ctx.strokeStyle = 'rgba(95,224,196,.25)';
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

  ctx.strokeStyle = '#bfe9ff';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 1) {
    let y = (Math.random() - 0.5) * 2;   // background tremble
    for (const s of spikes) {
      const d = x - s.x;
      if (d > -1 && d < 14) y += Math.sin(d * 2.2) * s.a * Math.exp(-d / 5);
    }
    if (x === 0) ctx.moveTo(x, h / 2 + y); else ctx.lineTo(x, h / 2 + y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(181,199,212,.7)';
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.fillText('24 h ago', 2, h - 3);
  ctx.fillText('now', w - 22, h - 3);
}

// ======================= Moon & tides =======================

const MOON_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
                    'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];

function moonSVG(phaseDeg) {
  // phaseDeg: 0 = new, 90 = first quarter, 180 = full, 270 = last quarter
  const r = 30, c = 32;
  const rad = (phaseDeg * Math.PI) / 180;
  const rx = Math.abs(Math.cos(rad)) * r;            // width of the shadow line
  const waxing = phaseDeg < 180;
  const gibbous = Math.cos(rad) < 0;                 // more than half lit
  // Lit half-circle on the bright side, closed by the terminator ellipse
  const limbSweep = waxing ? 1 : 0;
  const termSweep = gibbous ? limbSweep : 1 - limbSweep;
  const d = `M ${c} ${c - r} A ${r} ${r} 0 0 ${limbSweep} ${c} ${c + r} A ${rx} ${r} 0 0 ${termSweep} ${c} ${c - r} Z`;
  return `<svg viewBox="0 0 64 64">
    <circle cx="${c}" cy="${c}" r="${r}" fill="#23262e"/>
    <path d="${d}" fill="#f1ecd8"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,.25)"/>
  </svg>`;
}

function updateMoon() {
  const A = window.Astronomy;
  if (!A) return;
  const now = new Date();
  const phase = A.MoonPhase(now);                                    // degrees
  const lit = A.Illumination(A.Body.Moon, now).phase_fraction;       // 0..1
  const km = A.GeoVector(A.Body.Moon, now, true).Length() * 149_597_870.7;

  // Tidal force falls off with distance cubed
  const pull = Math.pow(384_400 / km, 3) * 100;
  // Sun and Moon in line (new/full) → spring tides; at right angles → neap tides
  const align = Math.abs(Math.cos((phase * Math.PI) / 180));
  const tideType = align > 0.75 ? 'spring tides (Sun and Moon in line)'
    : align < 0.35 ? 'neap tides (Sun and Moon at right angles)' : 'between spring and neap';

  document.querySelector('#moon-disc').innerHTML = moonSVG(phase);
  document.querySelector('#moon-phase').textContent =
    `${MOON_NAMES[Math.round(phase / 45) % 8]} · ${Math.round(lit * 100)}% lit`;
  document.querySelector('#moon-tide').textContent =
    `${Math.round(km).toLocaleString('en-GB')} km away · tidal pull ${pull.toFixed(0)}% of average · ${tideType}`;
}

// ======================= Population =======================
// No free API gives a live world population, so we do what the famous
// "world clocks" do: start from an official estimate and add the average
// rates. UN World Population Prospects 2024: ~8.23 billion people in mid-2025,
// ~132 million births and ~62 million deaths a year.

const BASE_DATE = Date.UTC(2025, 6, 1);
const BASE_POP = 8_231_613_070;
const YEAR_S = 365.25 * 24 * 3600;
const BIRTHS_PER_S = 132_000_000 / YEAR_S;   // ≈ 4.2 a second
const DEATHS_PER_S = 62_000_000 / YEAR_S;    // ≈ 2.0 a second

function startPopulation() {
  const count = document.querySelector('#pop-count');
  const stream = document.querySelector('#pop-stream');
  const birthsEl = document.querySelector('#births');
  const deathsEl = document.querySelector('#deaths');
  let births = 0, deaths = 0;

  // Random waits between events (an exponential distribution), so they arrive
  // unevenly like real life instead of on a metronome.
  const nextWait = (rate) => (-Math.log(1 - Math.random()) / rate) * 1000;

  function icon(kind) {
    const span = document.createElement('span');
    span.className = `pop-icon ${kind}`;
    span.style.left = `${Math.random() * 92}%`;
    span.innerHTML = personIcon;
    stream.append(span);
    setTimeout(() => span.remove(), 2500);
  }
  function birth() { births++; birthsEl.textContent = births; icon('born'); setTimeout(birth, nextWait(BIRTHS_PER_S)); }
  function death() { deaths++; deathsEl.textContent = deaths; icon('died'); setTimeout(death, nextWait(DEATHS_PER_S)); }
  setTimeout(birth, nextWait(BIRTHS_PER_S));
  setTimeout(death, nextWait(DEATHS_PER_S));

  function tick() {
    const seconds = (Date.now() - BASE_DATE) / 1000;
    const pop = BASE_POP + seconds * (BIRTHS_PER_S - DEATHS_PER_S);
    count.textContent = Math.round(pop).toLocaleString('en-GB');
  }
  tick();
  setInterval(tick, 250);
}

// ======================= Start =======================

export function startLiveData() {
  const balloons = buildBalloons();
  loadWeather(balloons);
  setInterval(() => loadWeather(balloons), 10 * 60 * 1000);   // every 10 minutes

  loadQuakes();
  setInterval(loadQuakes, 5 * 60 * 1000);                     // every 5 minutes

  updateMoon();
  setInterval(updateMoon, 60 * 1000);

  startPopulation();
}
