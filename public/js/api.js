// public/js/api.js — every request the journal page makes to our server.
// Keeping them in one file makes the browser → server flow easy to follow.

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Pass the server's own error message up, e.g. "Wrong username or password"
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Posts
  // URLSearchParams turns { q: 'elf', category: 'Film' } into "q=elf&category=Film"
  listPosts: (filters = {}) => request('GET', `/api/posts?${new URLSearchParams(filters)}`),
  listCategories: () => request('GET', '/api/posts/categories'),
  getPost: (id) => request('GET', `/api/posts/${id}`),
  createPost: (post) => request('POST', '/api/posts', post),

  // Comments
  listComments: (postId) => request('GET', `/api/posts/${postId}/comments`),
  addComment: (postId, comment) => request('POST', `/api/posts/${postId}/comments`, comment),

  // Auth
  me: () => request('GET', '/api/auth/me'),
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  logout: () => request('POST', '/api/auth/logout'),
};
