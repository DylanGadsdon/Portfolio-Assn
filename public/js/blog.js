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
    app.replaceChildren(toolbar(), el('p', { class: 'empty' }, 'No logs yet.'));
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

  app.replaceChildren(toolbar(), el('ul', { class: 'post-list' }, ...items));
}

// The row above the list. The "New log" button only appears when signed in.
function toolbar() {
  return el('div', { class: 'toolbar' },
    el('p', { class: 'label' }, 'All logs'),
    currentUser
      ? el('a', { class: 'btn', href: '#/new' }, '+ New log')
      : null,
  );
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

function showNewPost() {
  if (!currentUser) {
    app.replaceChildren(
      el('p', { class: 'empty' }, 'Sign in to write a new log.'),
      el('a', { class: 'back', href: '#/' }, '← Back to the logbook'),
    );
    return;
  }

  const errorBox = el('p', { class: 'form-error', role: 'alert' });
  const submit = el('button', { class: 'btn', type: 'submit' }, 'Publish log');

  const form = el('form', { class: 'stack sheet-form' },
    el('label', {}, 'Title', el('input', { name: 'title', maxlength: 150, required: true })),
    el('label', {}, 'Category',
      el('select', { name: 'category' },
        ...['Journal', 'Film', 'Brand', 'Campaign', 'Experiments', 'Music', 'Code']
          .map((c) => el('option', { value: c }, c)),
      ),
    ),
    el('label', {}, 'Text (leave a blank line between paragraphs)',
      el('textarea', { name: 'body', required: true }),
    ),
    errorBox,
    el('div', { class: 'row' }, submit, el('a', { class: 'btn ghost', href: '#/' }, 'Cancel')),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Publishing…';
    const data = Object.fromEntries(new FormData(form));   // { title, category, body }
    try {
      const post = await api.createPost(data);
      location.hash = `#/post/${post.id}`;                  // jump to the new post
    } catch (err) {
      errorBox.textContent = err.message;
      submit.disabled = false;
      submit.textContent = 'Publish log';
    }
  });

  app.replaceChildren(
    el('a', { class: 'back', href: '#/' }, '← Back to the logbook'),
    el('div', { class: 'compose' }, el('p', { class: 'label' }, 'New log'), el('h2', {}, 'Write an entry'), form),
  );
}

// ---------- Router ----------

async function route() {
  const hash = location.hash || '#/';
  const match = hash.match(/^#\/post\/(\d+)$/);   // e.g. "#/post/3" → "3"

  try {
    if (match) await showPost(match[1]);
    else if (hash === '#/new') showNewPost();
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
// Find out who's signed in first, so the right buttons show on the first draw
refreshUser().catch(console.error).finally(route);
