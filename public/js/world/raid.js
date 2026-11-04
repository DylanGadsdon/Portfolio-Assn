// public/js/world/raid.js — the raid on the space station, far away in the background.
//   A grey sphere-ship drifts in, its one small weapon port warms up (very
//   faintly), it fires a single green beam, and the station breaks apart.
//   Then the ship leaves and the station is quietly rebuilt.
//   Click the station to start it, or wait: it happens by itself.
//
// Each step is an animation that returns a promise (anim.finished), so the
// whole story reads top-to-bottom with `await`, one step after another.

import { px, size, wait, rand, fx, worldRect, reducedMotion } from './stage.js';

const station = document.querySelector('#station');
const ship = document.querySelector('#warship');
let running = false;

// Where the weapon port sits on the ship picture (fractions of its width/height)
const PORT = { x: 0.817, y: 0.704 };

export function setupRaid() {
  ship.innerHTML = `
    <img class="art photo" src="/media/world/mothership.svg" alt="" draggable="false">
    <span class="port-glow" style="left:${PORT.x * 100}%; top:${PORT.y * 100}%"></span>`;

  place();
  addEventListener('resize', place);
  station.style.cursor = 'pointer';
  station.title = 'Space station';
  station.addEventListener('click', start);

  // If the station has been on screen for 20 s with nothing happening, it happens anyway
  let visibleSince = null;
  new IntersectionObserver(([entry]) => {
    visibleSince = entry.isIntersecting ? Date.now() : null;
  }, { threshold: 0.6 }).observe(station);
  setInterval(() => {
    if (!running && visibleSince && Date.now() - visibleSince > 20000) {
      start().finally(() => { visibleSince = Date.now(); });
    }
  }, 2000);
}

function place() {
  // Station off to the right; the ship further back on the left. Both small: far away.
  station.style.left = `${size.width * 0.62}px`;
  station.style.top = `${px(30)}px`;
  ship.style.left = `${size.width * 0.27}px`;
  ship.style.top = `${px(9)}px`;
}

async function start() {
  if (running) return;
  running = true;
  try { await raid(); } finally { running = false; }
}

async function raid() {
  // 1. The ship drifts in out of the dark, slowly
  const arrive = ship.animate(
    [{ transform: 'translate(-24vw, -5vh) scale(.8)', opacity: 0 },
     { transform: 'translate(0, 0) scale(1)', opacity: 1 }],
    { duration: reducedMotion ? 10 : 6000, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' });
  await arrive.finished;
  await wait(800);

  // 2. The weapon port warms up: only a little
  ship.classList.add('charging');
  await wait(2200);

  // 3. One green beam from the port to the middle of the station
  const port = worldRect(ship.querySelector('.port-glow'));
  const s = worldRect(station);
  const beam = fx('deathbeam green', port.cx, port.cy, { life: 1400 });
  beam.style.width = `${Math.hypot(s.cx - port.cx, s.cy - port.cy)}px`;
  beam.style.transform = `rotate(${Math.atan2(s.cy - port.cy, s.cx - port.cx)}rad)`;
  await wait(350);

  // 4. The station breaks apart: a green flash and a shower of pieces
  fx('blast green', s.cx, s.cy, { life: 1600 });
  setTimeout(() => fx('blast green', s.cx + rand(-30, 30), s.cy + rand(-15, 15), { life: 1600 }), 180);
  for (let i = 0; i < 28; i++) {
    const angle = rand(0, Math.PI * 2), dist = rand(60, 260);
    fx('shard', s.cx + rand(-s.w / 3, s.w / 3), s.cy + rand(-s.h / 4, s.h / 4), {
      life: 2600,
      vars: { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`,
              '--r': `${rand(-540, 540)}deg`, '--s': `${rand(3, 9)}px` },
    });
  }
  station.animate([{ opacity: 0.8, filter: 'brightness(3)' }, { opacity: 0, filter: 'brightness(1)' }],
    { duration: 500, fill: 'forwards' });
  ship.classList.remove('charging');
  await wait(2000);

  // 5. The ship leaves the way it came
  const leave = ship.animate(
    [{ transform: 'translate(0, 0) scale(1)', opacity: 1 },
     { transform: 'translate(-24vw, -7vh) scale(.75)', opacity: 0 }],
    { duration: reducedMotion ? 10 : 5000, easing: 'ease-in', fill: 'forwards' });
  await leave.finished;
  arrive.cancel();
  leave.cancel();
  await wait(5000);

  // 6. The station is rebuilt, quietly
  station.getAnimations().forEach((a) => a.cancel());
  station.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 2500 });
}
