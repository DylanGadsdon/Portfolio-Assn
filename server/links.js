// server/links.js — checking the links people attach to a post.

// Accepts the usual YouTube link shapes and returns just the 11-character
// video id, or null if it isn't a YouTube link:
//   https://www.youtube.com/watch?v=ID   https://youtu.be/ID
//   https://www.youtube.com/shorts/ID    https://www.youtube.com/embed/ID
export function youtubeId(input) {
  try {
    const url = new URL(String(input).trim());
    const host = url.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    }
    return /^[\w-]{11}$/.test(id ?? '') ? id : null;
  } catch {
    return null;
  }
}

// Only allow normal web links (no "javascript:" or other tricks)
export function safeHttpUrl(input) {
  try {
    const url = new URL(String(input).trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
