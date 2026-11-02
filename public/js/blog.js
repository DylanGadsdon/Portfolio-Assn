// public/js/blog.js — the journal page.
//
// How navigation works ("hash routing"):
//   /blog#/          → show the list of posts
//   /blog#/post/3    → show post number 3
// Changing the part after # doesn't reload the page. We listen for the
// "hashchange" event and redraw #app to match the new hash.

import { el, formatDate, depthFor, linkify, youtubePlayer } from './dom.js';
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

// The current search, kept between visits to the list
const filters = { q: '', category: '' };

async function showList() {
  // Controls are built once; only the results area redraws while typing,
  // so the search box keeps its focus.
  const results = el('div', { class: 'results' }, el('p', { class: 'empty' }, 'Pinging sonar…'));

  const search = el('input', {
    type: 'search',
    placeholder: 'Search the logs…',
    'aria-label': 'Search posts',
    value: filters.q,
  });

  // "Debounce": wait until typing pauses for 250 ms before asking the server,
  // instead of sending a request on every single keystroke.
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      filters.q = search.value.trim();
      drawResults(results);
    }, 250);
  });

  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by category' });
  async function drawChips() {
    const categories = await api.listCategories();
    const all = [{ category: '', label: 'All' }, ...categories.map((c) => ({ ...c, label: c.category }))];
    chips.replaceChildren(...all.map((c) =>
      el('button', {
        type: 'button',
        class: 'chip',
        'aria-pressed': String(filters.category === c.category),
        onclick: () => {
          filters.category = c.category;
          drawChips();
          drawResults(results);
        },
      }, c.label),
    ));
  }

  app.replaceChildren(toolbar(), el('div', { class: 'filters' }, search, chips), results);
  await Promise.all([drawChips(), drawResults(results)]);
}

async function drawResults(results) {
  const posts = await api.listPosts(filters);

  if (posts.length === 0) {
    results.replaceChildren(el('p', { class: 'empty' }, 'Nothing on sonar. Try another search.'));
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
        // Teaser: the AI summary if there is one, otherwise the first paragraph
        el('p', {}, post.summary || post.body.split('\n')[0]),
      ),
    ),
  );

  results.replaceChildren(el('ul', { class: 'post-list' }, ...items));
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

  // Split the body on blank lines so each chunk becomes a <p>.
  // linkify() turns any web addresses in the text into real links.
  const paragraphs = post.body.split(/\n\s*\n/).map((text) => el('p', {}, ...linkify(text)));

  app.replaceChildren(
    el('a', { class: 'back', href: '#/' }, '← Back to the logbook'),
    el('article', { class: 'sheet' },
      el('div', { class: 'meta' },
        el('span', { class: 'label' }, post.category),
        el('span', { class: 'label' }, formatDate(post.created_at)),
      ),
      el('h2', {}, post.title),
      post.youtube_id ? youtubePlayer(post.youtube_id, post.title) : null,
      summaryBox(post),
      el('div', { class: 'body' }, ...paragraphs),
      post.link_url
        ? el('a', { class: 'btn project-link', href: post.link_url, target: '_blank', rel: 'noopener' }, 'Open the project ↗')
        : null,
    ),
    commentsSection(post.id),
  );
  window.scrollTo(0, 0);
}

// ---------- AI summary ----------

function summaryBox(post) {
  const text = el('p', {}, post.summary ?? '');
  const box = el('aside', { class: 'summary', hidden: !post.summary && !currentUser },
    el('p', { class: 'label' }, '✦ AI summary'),
    text,
  );

  // Signed-in crew get a button to (re)generate it
  if (currentUser) {
    const button = el('button', { class: 'btn ghost small', type: 'button' },
      post.summary ? 'Regenerate' : 'Generate summary');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Thinking…';
      try {
        const { summary } = await api.summarise(post.id);
        text.textContent = summary;
        button.textContent = 'Regenerate';
      } catch (err) {
        text.textContent = err.message;
        button.textContent = 'Try again';
      } finally {
        button.disabled = false;
      }
    });
    box.append(button);
  }
  return box;
}

// ---------- Comments ----------

function commentsSection(postId) {
  const list = el('ol', { class: 'comment-list' });
  const heading = el('h3', {}, 'Comments');

  async function loadComments() {
    const comments = await api.listComments(postId);
    heading.textContent = `Comments (${comments.length})`;
    list.replaceChildren(
      ...(comments.length
        ? comments.map(commentItem)
        : [el('li', { class: 'empty' }, 'No comments yet. Be the first.')]),
    );
  }

  const errorBox = el('p', { class: 'form-error', role: 'alert' });
  const submit = el('button', { class: 'btn', type: 'submit' }, 'Post comment');
  const form = el('form', { class: 'stack' },
    el('label', {}, 'Name', el('input', { name: 'name', maxlength: 60, required: true, value: currentUser ?? '' })),
    el('label', {}, 'Comment', el('textarea', { name: 'body', maxlength: 2000, required: true, rows: 4 })),
    // Honeypot: hidden from people, visible to bots (see server/routes/posts.js)
    el('label', { class: 'honeypot', 'aria-hidden': 'true' }, 'Website',
      el('input', { name: 'website', tabindex: '-1', autocomplete: 'off' })),
    errorBox,
    el('div', { class: 'row' }, submit),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    errorBox.textContent = '';
    try {
      await api.addComment(postId, Object.fromEntries(new FormData(form)));
      form.elements.body.value = '';
      await loadComments();
    } catch (err) {
      errorBox.textContent = err.message;
    } finally {
      submit.disabled = false;
    }
  });

  loadComments().catch(() => list.replaceChildren(el('li', { class: 'error' }, 'Could not load comments.')));

  return el('section', { class: 'comments' }, heading, list, form);
}

function commentItem(c) {
  return el('li', { class: 'comment' },
    el('div', { class: 'meta' },
      el('span', { class: 'label' }, c.name),
      el('span', { class: 'label' }, formatDate(c.created_at)),
    ),
    el('p', {}, c.body),
  );
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
    el('label', {}, 'YouTube link (optional)',
      el('input', { name: 'video_url', type: 'url', placeholder: 'https://youtu.be/…' })),
    el('label', {}, 'Project link (optional, e.g. Figma)',
      el('input', { name: 'link_url', type: 'url', placeholder: 'https://…' })),
    el('label', { class: 'check' },
      el('input', { name: 'featured', type: 'checkbox' }),
      'Feature this in the iceberg (portfolio)'),
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
