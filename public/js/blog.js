// public/js/blog.js — the journal page.
//
// How navigation works ("hash routing"):
//   /blog#/          → show the list of posts
//   /blog#/post/3    → show post number 3
// Changing the part after # doesn't reload the page. We listen for the
// "hashchange" event and redraw #app to match the new hash.

import { el, formatDate, depthFor } from './dom.js';

const app = document.querySelector('#app');

// ---------- Talking to the server ----------

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

// ---------- Views ----------

async function showList() {
  app.replaceChildren(el('p', { class: 'empty' }, 'Pinging sonar…'));
  const posts = await getJSON('/api/posts');

  if (posts.length === 0) {
    app.replaceChildren(el('p', { class: 'empty' }, 'No logs yet.'));
    return;
  }

  // Turn each post object into a list item with a link
  const items = posts.map((post) =>
    el('li', {},
      el('a', { class: 'post-card', href: `#/post/${post.id}` },
        el('div', { class: 'meta' },
          el('span', { class: 'label' }, post.category),
          el('span', { class: 'label' }, `Depth ${depthFor(post.id)} m`),
          el('span', { class: 'label' }, formatDate(post.created_at)),
        ),
        el('h2', {}, post.title),
        el('p', {}, post.body.split('\n')[0]),   // first paragraph as a teaser
      ),
    ),
  );

  app.replaceChildren(el('ul', { class: 'post-list' }, ...items));
}

async function showPost(id) {
  app.replaceChildren(el('p', { class: 'empty' }, 'Descending…'));
  const post = await getJSON(`/api/posts/${id}`);

  // Split the body on blank lines so each chunk becomes a <p>
  const paragraphs = post.body.split(/\n\s*\n/).map((text) => el('p', {}, text));

  app.replaceChildren(
    el('a', { class: 'back', href: '#/' }, '← Back to the logbook'),
    el('article', { class: 'sheet' },
      el('div', { class: 'meta' },
        el('span', { class: 'label' }, post.category),
        el('span', { class: 'label' }, formatDate(post.created_at)),
      ),
      el('h2', {}, post.title),
      el('div', { class: 'body' }, ...paragraphs),
    ),
  );
  window.scrollTo(0, 0);
}

// ---------- Router ----------

async function route() {
  const hash = location.hash || '#/';
  const match = hash.match(/^#\/post\/(\d+)$/);   // e.g. "#/post/3" → "3"

  try {
    if (match) await showPost(match[1]);
    else await showList();
  } catch (err) {
    console.error(err);
    app.replaceChildren(
      el('p', { class: 'error' }, 'Lost contact with the surface. Try again.'),
      el('a', { class: 'back', href: '#/' }, '← Back to the logbook'),
    );
  }
}

window.addEventListener('hashchange', route);
route();
