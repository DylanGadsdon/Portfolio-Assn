// public/js/world/main.js — starts everything on the world page.

import { SEA, WORLD_HEIGHT, size, measure, px, metresAt, zoneAt } from './stage.js';
import { art } from './art.js';
import { spawnCreatures, startLoop } from './creatures.js';
import { startLiveData } from './livedata.js';
import { setupRaid } from './raid.js';
import { placePortfolio } from './portfolio.js';

measure();

// ---------- Dylan's photos (replace the drawings wherever they exist) ----------
let photos = {};
try { photos = await (await fetch('/api/gallery/world')).json(); } catch { /* drawings it is */ }

const photoOr = (name, drawing) =>
  photos[name] ? `<img class="art photo" src="${photos[name]}" alt="" draggable="false">` : drawing;

document.querySelector('#station').innerHTML = photoOr('station', art.station);
document.querySelector('#warship').innerHTML = photoOr('warship', art.warship);
document.querySelector('#buoy .buoy-art').innerHTML = photoOr('buoy', art.buoy);

for (const [name, selector] of [['sky', '#sky'], ['ocean', '#sea']]) {
  if (!photos[name]) continue;
  const el = document.querySelector(selector);
  el.style.setProperty('--photo', `url("${photos[name]}")`);
  el.classList.add('photo');
}
if (photos.iceberg) {
  // iceberg photo: an "over-under" shot. Its waterline is assumed to be halfway
  // down; change --waterline in world.css if yours sits higher or lower.
  document.querySelector('#iceberg-photo').src = photos.iceberg;
  document.querySelector('#iceberg').classList.add('photo');
}

// ---------- Stars ----------
function drawStars() {
  const canvas = document.querySelector('#stars');
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const count = Math.round((canvas.clientWidth * canvas.clientHeight) / 2200);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * canvas.clientWidth;
    const y = Math.random() * canvas.clientHeight;
    // fewer stars near the bottom, where the atmosphere starts
    if (Math.random() < y / canvas.clientHeight - 0.25) continue;
    const r = Math.random() < 0.03 ? 1.6 : Math.random() * 1.1;
    ctx.fillStyle = `hsla(${200 + Math.random() * 60}, 80%, ${80 + Math.random() * 20}%, ${0.4 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- Depth gauge ----------
const gaugeValue = document.querySelector('#gauge-value');
const gaugeZone = document.querySelector('#gauge-zone');
const gaugeDot = document.querySelector('#gauge-dot');

function formatMetres(m) {
  if (m >= 1000) return `${Math.round(m / 1000).toLocaleString('en-GB')} km up`;
  if (m > 0) return `${Math.round(m)} m up`;
  if (m > -1) return '0 m';
  return `${Math.round(-m).toLocaleString('en-GB')} m deep`;
}

let gaugeQueued = false;
function updateGauge() {
  gaugeQueued = false;
  const centreVh = (window.scrollY + window.innerHeight / 2) / size.vh;
  gaugeValue.textContent = formatMetres(metresAt(centreVh));
  gaugeZone.textContent = zoneAt(centreVh);
  gaugeDot.style.top = `${Math.min(100, (centreVh / WORLD_HEIGHT) * 100)}%`;
}
window.addEventListener('scroll', () => {
  if (!gaugeQueued) { gaugeQueued = true; requestAnimationFrame(updateGauge); }
  if (window.scrollY > 40) document.querySelector('.hint').classList.add('gone');
}, { passive: true });

// ---------- Resize ----------
let lastWidth = size.width;
window.addEventListener('resize', () => {
  if (Math.abs(document.documentElement.clientWidth - lastWidth) < 40) return;   // ignore URL-bar jiggle
  lastWidth = document.documentElement.clientWidth;
  measure();
  drawStars();
});

// ---------- Start ----------
drawStars();
// Open at sea level, with the iceberg tip in view, then let it rise
window.history.scrollRestoration = 'manual';
window.scrollTo(0, px(SEA) - window.innerHeight * 0.62);
document.querySelector('#iceberg').classList.add('rising');
updateGauge();

placePortfolio();
spawnCreatures(photos);
startLoop();
startLiveData();
setupRaid();
