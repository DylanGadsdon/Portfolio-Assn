// public/js/world/main.js — starts everything on the world page.

import { SEA, size, measure, px, metresAt, zoneAt } from './stage.js';
import { art } from './art.js';
import { spawnCreatures, startLoop } from './creatures.js';
import { startLiveData } from './livedata.js';
import { setupRaid } from './raid.js';

measure();

// ---------- Static pieces of art ----------
document.querySelector('#station').innerHTML = art.station;
document.querySelector('#warship').innerHTML = art.warship;
document.querySelector('#buoy .buoy-art').innerHTML = art.buoy;

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

// ---------- Portfolio capsules frozen in the iceberg ----------
async function placeCapsules() {
  const box = document.querySelector('#capsules');
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error(res.status);
    const posts = (await res.json()).slice(0, 8);
    // Spread them down the underwater part of the iceberg (vh from its top)
    const top = 70, bottom = 400;
    const step = posts.length > 1 ? (bottom - top) / (posts.length - 1) : 0;
    posts.forEach((post, i) => {
      const a = document.createElement('a');
      a.className = 'capsule';
      a.href = `/blog#/post/${post.id}`;
      a.style.top = `calc(var(--vh) * ${top + i * step})`;
      a.style.left = i % 2 ? '66%' : '34%';
      const depth = Math.round(-metresAt(SEA - 38 + top + i * step));
      a.innerHTML = `<span class="label"></span><strong></strong>`;
      a.querySelector('.label').textContent = `${post.category} · ${depth.toLocaleString('en-GB')} m`;
      a.querySelector('strong').textContent = post.title;
      box.append(a);
    });
  } catch (err) {
    console.warn('Could not load posts for the iceberg', err);
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
  gaugeDot.style.top = `${Math.min(100, (centreVh / 1160) * 100)}%`;
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

placeCapsules();
spawnCreatures();
startLoop();
startLiveData();
setupRaid();
