// public/js/world/portfolio.js — the work, shown as exhibits below the surface.
//
// Only posts marked "featured" appear here (GET /api/posts?featured=1).
// Each one shows its YouTube thumbnail behind a layer of "ice"; clicking
// plays the video in a full-screen player over the ocean.

import { metresAt } from './stage.js';

// Depths in the world (vh from the top), down in the dark water
const SLOTS = [290, 345, 400, 455];

export async function placePortfolio() {
  const box = document.querySelector('#capsules');
  let pieces = [];
  try {
    const res = await fetch('/api/posts?featured=1');
    if (!res.ok) throw new Error(res.status);
    pieces = (await res.json()).slice(0, SLOTS.length);
  } catch (err) {
    console.warn('Could not load the portfolio', err);
    return;
  }

  pieces.forEach((post, i) => {
    const y = SLOTS[i];
    const depth = Math.round(-metresAt(y));

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'capsule';
    card.style.top = `calc(var(--vh) * ${y})`;
    card.style.left = i % 2 ? '66%' : '34%';
    card.setAttribute('aria-label', `${post.title}${post.youtube_id ? ': play video' : ''}`);

    if (post.youtube_id) {
      const thumb = document.createElement('span');
      thumb.className = 'thumb';
      const img = document.createElement('img');
      img.src = `https://i.ytimg.com/vi/${post.youtube_id}/hqdefault.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      thumb.append(img);
      thumb.insertAdjacentHTML('beforeend', '<span class="play" aria-hidden="true">▶</span>');
      card.append(thumb);
    } else {
      // No video yet: an empty dark frame waiting for the film
      card.insertAdjacentHTML('beforeend', '<span class="thumb empty" aria-hidden="true"><span class="play">▶</span></span>');
    }
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = `${post.category} · ${depth.toLocaleString('en-GB')} m`;
    const title = document.createElement('strong');
    title.textContent = post.title;
    card.append(label, title);

    card.addEventListener('click', () => {
      if (post.youtube_id) openPlayer(post);
      else window.location.href = `/blog#/post/${post.id}`;
    });
    box.append(card);
  });
}

// ---------- Full-screen video player ----------
// A <dialog> gives us a proper pop-up for free: it traps keyboard focus
// and closes with the Esc key.
function openPlayer(post) {
  const dialog = document.createElement('dialog');
  dialog.className = 'player';
  dialog.setAttribute('aria-label', post.title);
  dialog.innerHTML = `
    <div class="player-frame">
      <iframe allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
    </div>
    <div class="player-bar">
      <strong></strong>
      <a class="player-log" href="/blog#/post/${post.id}">Read the log →</a>
      <button type="button" class="player-close" aria-label="Close video">✕</button>
    </div>`;
  dialog.querySelector('iframe').src =
    `https://www.youtube-nocookie.com/embed/${post.youtube_id}?autoplay=1&rel=0&modestbranding=1`;
  dialog.querySelector('iframe').title = `Video: ${post.title}`;
  dialog.querySelector('strong').textContent = post.title;

  const close = () => dialog.close();
  dialog.querySelector('.player-close').addEventListener('click', close);
  // Clicking the dark area outside the video also closes it
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
  // Removing the dialog removes the iframe, which stops the video
  dialog.addEventListener('close', () => dialog.remove());

  document.body.append(dialog);
  dialog.showModal();
}
