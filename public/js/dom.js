// public/js/dom.js — small helpers shared by the page scripts.

// el('p', { class: 'x' }, 'Hello') builds <p class="x">Hello</p>.
// Text is added with createTextNode, never innerHTML, so text typed by
// users (posts, comments) can never be run as HTML/JavaScript. This
// protects against an attack called XSS (cross-site scripting).
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value);   // onclick → 'click'
    } else if (value !== false && value != null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// Each post is "logged" deeper than the last: post 1 → 120 m, post 2 → 240 m…
export function depthFor(id) {
  return Number(id) * 120;
}

// Turn "see https://figma.com/x for more" into text + a real <a> + text.
// Built with DOM nodes (not innerHTML), so it stays safe from XSS.
export function linkify(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g)) {
    parts.push(text.slice(last, match.index));
    parts.push(el('a', { href: match[0], target: '_blank', rel: 'noopener' }, match[0]));
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

// A responsive YouTube player. youtube-nocookie.com = YouTube's privacy mode:
// no tracking cookies until the viewer presses play.
export function youtubePlayer(id, title, { autoplay = false } = {}) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', ...(autoplay ? { autoplay: '1' } : {}) });
  return el('div', { class: 'video' },
    el('iframe', {
      src: `https://www.youtube-nocookie.com/embed/${id}?${params}`,
      title: `Video: ${title}`,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: '',
      loading: 'lazy',
    }),
  );
}
