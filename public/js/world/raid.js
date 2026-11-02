// public/js/world/raid.js — the cycle:
//   little guy boards the rocket → flies to the space station → an alien warship
//   attacks → the station falls back into the iceberg → everything resets.
//
// Each step is an animation that returns a promise (anim.finished), so the
// whole story reads top-to-bottom with `await`, one step after another.

import { art } from './art.js';
import { SEA, px, size, world, wait, rand, fx, splash, toast, worldRect, reducedMotion } from './stage.js';
import { scatter } from './creatures.js';

const iceberg = document.querySelector('#iceberg');
const station = document.querySelector('#station');
const warship = document.querySelector('#warship');
let guy, rocket, running = false;

export function setupRaid() {
  guy = document.createElement('button');
  guy.id = 'guy';
  guy.className = 'thing';
  guy.setAttribute('aria-label', 'Little guy: launch the rocket to the space station');
  guy.innerHTML = `${art.guy}<span class="tip">Take me to space</span>`;

  rocket = document.createElement('div');
  rocket.id = 'rocket';
  rocket.className = 'thing';
  rocket.innerHTML = art.rocket;

  iceberg.append(rocket, guy);
  placeStation();
  window.addEventListener('resize', placeStation);

  guy.addEventListener('click', launch);
  rocket.addEventListener('click', launch);
  station.addEventListener('click', () => { if (!running) toast('Click the little guy on the iceberg to fly up here.'); });

  // The cycle also repeats by itself: if the station has been on screen
  // for 25 seconds with nothing happening, the fleet arrives anyway.
  let visibleSince = null;
  new IntersectionObserver(([entry]) => {
    visibleSince = entry.isIntersecting ? Date.now() : null;
  }, { threshold: 0.6 }).observe(station);
  setInterval(() => {
    if (!running && visibleSince && Date.now() - visibleSince > 25000) {
      running = true;
      raidAndCrash().finally(() => { running = false; visibleSince = Date.now(); });
    }
  }, 2000);
}

function placeStation() {
  station.style.left = `${size.width * 0.5 - station.offsetWidth / 2}px`;
  station.style.top = `${px(58)}px`;
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

async function launch() {
  if (running) return;
  running = true;
  try {
    // 1. The little guy hops into the rocket
    const g = worldRect(guy), r = worldRect(rocket);
    await guy.animate(
      [{ transform: 'none', opacity: 1 },
       { transform: `translate(${r.cx - g.cx}px, ${r.cy - g.cy}px) scale(.3)`, opacity: 0 }],
      { duration: 700, easing: 'ease-in', fill: 'forwards' }).finished;

    // 2. Liftoff: move the rocket out of the iceberg into the open world,
    //    then fly it to the station's docking port
    toast('3… 2… 1… liftoff');
    rocket.classList.add('firing');
    const start = worldRect(rocket);
    world.append(rocket);
    Object.assign(rocket.style, { left: `${start.x}px`, top: `${start.y}px`, width: `${start.w}px` });
    splash(start.cx, px(SEA), 10);

    const s = worldRect(station);
    const flight = rocket.animate(
      [{ transform: 'translate(0, 0) rotate(0)' },
       { transform: `translate(${(s.x + s.w * 0.15 - start.x) * 0.3}px, ${(s.cy - start.y) * 0.5}px) rotate(8deg)`, offset: 0.55 },
       { transform: `translate(${s.x + s.w * 0.15 - start.x}px, ${s.cy - start.y - start.h / 2}px) rotate(80deg)` }],
      { duration: reducedMotion ? 10 : 5200, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' });
    follow(rocket, flight.finished);
    await flight.finished;
    rocket.classList.remove('firing');
    await rocket.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished;
    toast('Docked. Lovely view up here.');
    await wait(1800);

    await raidAndCrash();
  } finally {
    resetRocket();
    running = false;
  }
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
  toast('Station rebuilt. Click the little guy to go again.', 3200);
}

function resetRocket() {
  rocket.getAnimations().forEach((a) => a.cancel());
  rocket.removeAttribute('style');
  rocket.classList.remove('firing');
  iceberg.append(rocket);
  guy.getAnimations().forEach((a) => a.cancel());
  guy.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
}
