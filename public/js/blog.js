// public/js/blog.js — the journal page.
//
// How navigation works ("hash routing"):
//   /blog#/          → show the list of posts
//   /blog#/post/3    → show post number 3
// Changing the part after # doesn't reload the page. We listen for the
// "hashchange" event and redraw #app to match the new hash.

import { el, formatDate, depthFor } from './dom.js';
import { api } from './api.js';

const app = document.querySelector('#app');
const crew = document.querySelector('#crew');

// Who is signed in? null = nobody. Filled in by refreshUser().
let currentUser = null;

// ---------- Sign in / sign out ----------

async function refreshUser() {
  const { username } = await api.me();
  currentUser = username;
  drawCrewPanel();
}

function drawCrewPanel() {
  if (currentUser) {
    crew.replaceChildren(
      el('span', { class: 'label' }, `Signed in · ${currentUser}`),
      el('button', { class: 'btn ghost', type: 'button', onclick: signOut }, 'Sign out'),
    );
  } else {
    crew.replaceChildren(
      el('button', { class: 'btn ghost', type: 'button', onclick: openSignIn }, 'Crew sign-in'),
    );
  }
}

function openSignIn() {
  const errorBox = el('p', { class: 'form-error', role: 'alert' });

  const form = el('form', { class: 'stack', method: 'dialog' },
    el('p', { class: 'label' }, 'Crew only'),
    el('h2', {}, 'Sign in'),
    el('label', {}, 'Username', el('input', { name: 'username', autocomplete: 'username', required: true })),
    el('label', {}, 'Password', el('input', { name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
    errorBox,
    el('div', { class: 'row' },
      el('button', { class: 'btn', type: 'submit' }, 'Sign in'),
      el('button', { class: 'btn ghost', type: 'button', onclick: () => dialog.close() }, 'Cancel'),
    ),
  );

  const dialog = el('dialog', { class: 'dialog' }, form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();                       // stop the browser's own form submit
    const data = new FormData(form);
    try {
      await api.login(data.get('username'), data.get('password'));
      dialog.close();
      await refreshUser();
      route();                                    // redraw so signed-in controls appear
    } catch (err) {
      errorBox.textContent = err.message;
    }
  });

  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

async function signOut() {
  await api.logout();
  await refreshUser();
  route();
}

// ---------- Views ----------

async function showList() {
  app.replaceChildren(el('p', { class: 'empty' }, 'Pinging sonar…'));
  const posts = await api.listPosts();

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
  const post = await api.getPost(id);

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
refreshUser().catch(console.error);
route();
