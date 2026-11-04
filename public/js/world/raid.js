// public/js/world/raid.js — the raid on the space station, in the background.
//   Dylan's mothership clip (/media/world/raid.mp4) is blended straight into
//   the sky: its black background drops out (mix-blend-mode: screen), the edges
//   fade into space (a radial mask) and it's tinted to match the scene. When it
//   finishes firing, the station breaks apart in green, then is quietly rebuilt.
//   Click the station to start it, or wait: it happens by itself.

import { px, size, wait, rand, fx, worldRect } from './stage.js';

const station = document.querySelector('#station');
let ship;          // the <video>, created in setupRaid
let running = false;

export function setupRaid() {
  ship = document.createElement('video');
  ship.id = 'mothership';
  Object.assign(ship, { src: '/media/world/raid.mp4', muted: true, playsInline: true, preload: 'auto' });
  ship.setAttribute('aria-hidden', 'true');
  station.after(ship);

  place();
  addEventListener('resize', place);
  station.style.cursor = 'pointer';
  station.title = 'Space station';
  station.addEventListener('click', () => start(true));

  // If the station has been on screen for 20 s with nothing happening, it happens anyway (silently)
  let visibleSince = null;
  new IntersectionObserver(([entry]) => {
    visibleSince = entry.isIntersecting ? Date.now() : null;
  }, { threshold: 0.6 }).observe(station);
  setInterval(() => {
    if (!running && visibleSince && Date.now() - visibleSince > 20000) {
      start(false).finally(() => { visibleSince = Date.now(); });
    }
  }, 2000);
}

function place() {
  // Station off to the right; the mothership looms further back on the left
  station.style.left = `${size.width * 0.66}px`;
  station.style.top = `${px(30)}px`;
  ship.style.left = `${size.width * 0.28}px`;
  ship.style.top = `${px(4)}px`;
}

async function start(withSound) {
  if (running) return;
  running = true;
  try { await raid(withSound); } finally { running = false; }
}

async function raid(withSound) {
  // 1. The clip fades up out of the dark and plays
  ship.currentTime = 0;
  ship.muted = !withSound;
  ship.classList.add('on');
  try { await ship.play(); } catch { ship.muted = true; await ship.play().catch(() => {}); }
  await new Promise((resolve) => ship.addEventListener('ended', resolve, { once: true }));

  // 2. The final shot crosses the sky: one green beam from the ship to the station
  const s = worldRect(station);
  const m = worldRect(ship);
  const x1 = m.x + m.w * 0.7, y1 = m.y + m.h * 0.45;
  const beam = fx('deathbeam green', x1, y1, { life: 1400 });
  beam.style.width = `${Math.hypot(s.cx - x1, s.cy - y1)}px`;
  beam.style.transform = `rotate(${Math.atan2(s.cy - y1, s.cx - x1)}rad)`;
  await wait(350);

  // 3. The station is hit: a green blast and a shower of pieces, then nothing
  ship.classList.remove('on');
  fx('blast green', s.cx, s.cy, { life: 1600 });
  setTimeout(() => fx('blast green', s.cx + rand(-30, 30), s.cy + rand(-15, 15), { life: 1600 }), 180);
  for (let i = 0; i < 26; i++) {
    const angle = rand(0, Math.PI * 2), dist = rand(60, 260);
    fx('shard', s.cx + rand(-s.w / 3, s.w / 3), s.cy + rand(-s.h / 4, s.h / 4), {
      life: 2600,
      vars: { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`,
              '--r': `${rand(-540, 540)}deg`, '--s': `${rand(3, 9)}px` },
    });
  }
  station.animate([{ opacity: 1, filter: 'brightness(3)' }, { opacity: 0, filter: 'brightness(1)' }],
    { duration: 500, fill: 'forwards' });
  await wait(10000);

  // 4. Rebuilt, quietly
  station.getAnimations().forEach((a) => a.cancel());
  station.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 2500 });
}
