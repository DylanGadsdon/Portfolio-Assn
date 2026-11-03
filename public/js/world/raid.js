// public/js/world/raid.js — the raid on the space station.
//   Click the station: the mothership's attack plays as a short cinematic
//   (Dylan's clip, /media/world/raid.mp4). When it ends, the station in the
//   scene goes up in a green flash and breaks apart, then is quietly rebuilt
//   a little later so it can happen again.

import { wait, rand, fx, worldRect } from './stage.js';

const station = document.querySelector('#station');
let running = false;

export function setupRaid() {
  place();
  addEventListener('resize', place);
  station.style.cursor = 'pointer';
  station.title = 'Space station';
  station.addEventListener('click', start);
}

function place() {
  // off to the right and small: something happening in the background
  station.style.left = `${innerWidth * 0.66}px`;
  station.style.top = `calc(var(--vh) * 30)`;
}

async function start() {
  if (running) return;
  running = true;
  try {
    await playCinematic();
    await destroyStation();
  } finally { running = false; }
}

// ---------- 1. The cinematic ----------
// A <dialog> over the page with the clip in it. It closes when the clip ends,
// when you click outside it, or with Esc.
function playCinematic() {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'cinematic';
    dialog.setAttribute('aria-label', 'The raid');
    const video = document.createElement('video');
    Object.assign(video, { src: '/media/world/raid.mp4', playsInline: true, autoplay: true });
    dialog.append(video);
    document.body.append(dialog);
    dialog.showModal();
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });

    const finish = () => { if (dialog.open) dialog.close(); };
    video.addEventListener('ended', finish);
    dialog.addEventListener('click', (e) => { if (e.target === dialog) finish(); });
    dialog.addEventListener('close', () => {
      dialog.classList.add('out');
      setTimeout(() => { dialog.remove(); resolve(); }, 400);
    });
  });
}

// ---------- 2. Back in the scene: the station is gone ----------
async function destroyStation() {
  const s = worldRect(station);
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
  await wait(12000);

  // Rebuilt, quietly
  station.getAnimations().forEach((a) => a.cancel());
  station.animate([{ opacity: 0 }, { opacity: 0.8 }], { duration: 2500 });
}
