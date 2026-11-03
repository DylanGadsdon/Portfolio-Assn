// public/js/world/raid.js — something happening far away, in the background:
//   a perfect black sphere drifts in, charges one weapon, and destroys the
//   space station with a single beam. Then it leaves, and the station is
//   quietly rebuilt so it can happen again.
//   (Click the station to start it, or wait: it happens by itself.)
//
// Each step is an animation that returns a promise (anim.finished), so the
// whole story reads top-to-bottom with `await`, one step after another.

import { px, size, wait, rand, fx, worldRect, reducedMotion } from './stage.js';

const station = document.querySelector('#station');
const ship = document.querySelector('#warship');
let running = false;

export function setupRaid() {
  // The mothership is built from HTML and CSS: a sphere, a ring of light and a weapon port
  ship.innerHTML = '<div class="orb"><div class="orb-body"></div><div class="orb-ring"></div><div class="orb-port"></div></div>';

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
  // Station off to the right, the sphere further back on the left: both small, both far away
  station.style.left = `${size.width * 0.66}px`;
  station.style.top = `${px(30)}px`;
  ship.style.left = `${size.width * 0.3}px`;
  ship.style.top = `${px(8)}px`;
}

async function start() {
  if (running) return;
  running = true;
  try { await destroyStation(); } finally { running = false; }
}

async function destroyStation() {
  const orb = ship.querySelector('.orb');

  // 1. The sphere drifts in from the dark, slowly
  const arrive = ship.animate(
    [{ transform: 'translate(-30vw, -6vh) scale(.7)', opacity: 0 },
     { transform: 'translate(0, 0) scale(1)', opacity: 1 }],
    { duration: reducedMotion ? 10 : 5000, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' });
  await arrive.finished;
  await wait(600);

  // 2. It charges the weapon
  orb.classList.add('charging');
  await wait(2400);

  // 3. One beam, from the weapon port to the middle of the station
  const port = worldRect(ship.querySelector('.orb-port'));
  const s = worldRect(station);
  const x1 = port.cx, y1 = port.cy, x2 = s.cx, y2 = s.cy;
  const beam = fx('deathbeam', x1, y1, { life: 1400 });
  beam.style.width = `${Math.hypot(x2 - x1, y2 - y1)}px`;
  beam.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
  await wait(350);

  // 4. The station is gone: a blast, a shower of pieces, then nothing
  fx('blast', x2, y2, { life: 1600 });
  setTimeout(() => fx('blast', x2 + rand(-30, 30), y2 + rand(-15, 15), { life: 1600 }), 180);
  for (let i = 0; i < 26; i++) {
    const angle = rand(0, Math.PI * 2), dist = rand(60, 260);
    fx('shard', x2 + rand(-s.w / 3, s.w / 3), y2 + rand(-s.h / 4, s.h / 4), {
      life: 2600,
      vars: { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`,
              '--r': `${rand(-540, 540)}deg`, '--s': `${rand(3, 9)}px` },
    });
  }
  station.animate([{ opacity: 1, filter: 'brightness(3)' }, { opacity: 0, filter: 'brightness(1)' }],
    { duration: 500, fill: 'forwards' });
  orb.classList.remove('charging');
  await wait(1800);

  // 5. The sphere leaves the way it came
  const leave = ship.animate(
    [{ transform: 'translate(0, 0) scale(1)', opacity: 1 },
     { transform: 'translate(-30vw, -8vh) scale(.6)', opacity: 0 }],
    { duration: reducedMotion ? 10 : 4500, easing: 'ease-in', fill: 'forwards' });
  await leave.finished;
  arrive.cancel();
  leave.cancel();
  await wait(5000);

  // 6. The station is rebuilt, quietly
  station.getAnimations().forEach((a) => a.cancel());
  station.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 2500 });
}
