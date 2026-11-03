// public/js/world/raid.js — the cycle up in space:
//   click the space station → an alien warship attacks → the station falls
//   back into the iceberg → it's rebuilt and the cycle can start again.
//   (It also happens by itself if the station has been on screen for a while.)
//
// Each step is an animation that returns a promise (anim.finished), so the
// whole story reads top-to-bottom with `await`, one step after another.

import { SEA, px, size, wait, rand, fx, splash, toast, worldRect, reducedMotion } from './stage.js';
import { scatter } from './creatures.js';

const iceberg = document.querySelector('#iceberg');
const station = document.querySelector('#station');
const warship = document.querySelector('#warship');
let running = false;

export function setupRaid() {
  placeStation();
  addEventListener('resize', placeStation);
  station.style.cursor = 'pointer';
  station.title = 'Click the station';
  station.addEventListener('click', start);

  // If the station has been on screen for 25 s with nothing happening,
  // the fleet arrives anyway.
  let visibleSince = null;
  new IntersectionObserver(([entry]) => {
    visibleSince = entry.isIntersecting ? Date.now() : null;
  }, { threshold: 0.6 }).observe(station);
  setInterval(() => {
    if (!running && visibleSince && Date.now() - visibleSince > 25000) {
      start().finally(() => { visibleSince = Date.now(); });
    }
  }, 2000);
}

async function start() {
  if (running) return;
  running = true;
  try { await raidAndCrash(); } finally { running = false; }
}

function placeStation() {
  // off to the right and small: something happening in the background
  station.style.left = `${size.width * 0.68}px`;
  station.style.top = `${px(30)}px`;
}

// Keep an element in the middle of the screen while it moves (a "camera")
function follow(el, until) {
  if (reducedMotion) return;
  let done = false;
  until.then(() => { done = true; }, () => { done = true; });
  (function step() {
    if (done) return;
    const r = el.getBoundingClientRect();
    const target = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo(0, window.scrollY + (target - window.scrollY) * 0.14);
    requestAnimationFrame(step);
  })();
}

async function raidAndCrash() {
  const s = worldRect(station);

  // 3. The warship arrives from the top right
  toast('⚠ Unidentified fleet approaching', 3000);
  Object.assign(warship.style, { left: `${size.width * 0.04}px`, top: `${Math.max(0, s.y - px(30))}px` });
  const arrive = warship.animate(
    [{ transform: `translate(${size.width}px, -${px(20)}px) scale(.6)`, opacity: 0 },
     { transform: 'translate(0, 0) scale(1)', opacity: 1 }],
    { duration: reducedMotion ? 10 : 2600, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
  follow(warship, arrive.finished);
  await arrive.finished;
  await wait(500);

  // 4. Three volleys of beams from the warship's guns to the station
  const w = worldRect(warship);
  const guns = [[0.06, 0.5], [0.29, 0.26], [0.29, 0.74]];
  for (let volley = 0; volley < 3; volley++) {
    for (const [gx, gy] of guns) {
      const x1 = w.x + w.w * gx, y1 = w.y + w.h * gy;
      const x2 = s.x + rand(0.3, 0.7) * s.w, y2 = s.y + rand(0.3, 0.7) * s.h;
      const beam = fx('beamline', x1, y1, { life: 500 });
      beam.style.width = `${Math.hypot(x2 - x1, y2 - y1)}px`;
      beam.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
      setTimeout(() => fx('boom', x2, y2, { life: 800 }), 120);
    }
    station.animate([{ filter: 'none' }, { filter: 'brightness(2.5) sepia(1) hue-rotate(-30deg)' }, { filter: 'none' }], { duration: 400 });
    await wait(650);
  }
  fx('boom', s.cx, s.cy, { life: 800 });
  toast('Station hit! It’s going down…');

  // 5. The station falls, tumbling, into the tip of the iceberg
  const tip = worldRect(document.querySelector('#name'));
  const dx = tip.cx - s.cx, dy = tip.y - s.cy;
  const fall = station.animate(
    [{ transform: 'translate(0,0) rotate(0) scale(1)' },
     { transform: `translate(${dx * 0.4}px, ${dy * 0.35}px) rotate(70deg) scale(.85)`, offset: 0.4 },
     { transform: `translate(${dx}px, ${dy}px) rotate(200deg) scale(.55)` }],
    { duration: reducedMotion ? 10 : 4200, easing: 'cubic-bezier(.5,0,1,1)', fill: 'forwards' });
  const smoke = setInterval(() => {
    const p = worldRect(station);
    fx('boom', p.cx + rand(-20, 20), p.cy, { life: 800 });
  }, 180);
  warship.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${size.width}px, -${px(40)}px) scale(.5)`, opacity: 0 }],
    { duration: 4000, delay: 800, easing: 'ease-in', fill: 'forwards' });
  follow(station, fall.finished);
  await fall.finished;
  clearInterval(smoke);

  // 6. Impact
  document.body.append(Object.assign(document.createElement('div'), { className: 'flash' }));
  setTimeout(() => document.querySelector('.flash')?.remove(), 1300);
  iceberg.classList.remove('rising', 'shake');
  void iceberg.offsetWidth;            // restart the CSS animation
  iceberg.classList.add('shake');
  splash(tip.cx, px(SEA), 30);
  scatter();
  station.style.opacity = '0';
  toast('…and right back where it started.', 3000);
  await wait(3000);

  // 7. Rebuild: the cycle can start again
  fall.cancel();
  station.getAnimations().forEach((a) => a.cancel());
  warship.getAnimations().forEach((a) => a.cancel());
  warship.style.opacity = '';
  station.style.opacity = '';
  station.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 1500 });
  toast('Station rebuilt. Click it to go again.', 3200);
}
