/**
 * API client.
 *
 * Every failure from the server is { error: { code, message, detail } }, so the
 * client branches on a stable code instead of matching message strings.
 * ApiError carries that code through to the components.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(status, code, message, detail) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
  /** A stale write the UI should reconcile, not report as an error. */
  get isStale() { return this.code === 'STALE_REV'; }
  get isAuth() { return this.status === 401; }
}

async function call(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',          // the session is an httpOnly cookie
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    // Unreachable server is a different problem from a rejected request, and
    // the user needs to be told which one it is.
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
  }

  if (res.status === 204) return null;

  let payload = null;
  try { payload = await res.json(); } catch { /* empty or non-JSON body */ }

  if (!res.ok) {
    const e = payload?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'UNKNOWN', e.message ?? `Request failed (${res.status})`, e.detail);
  }
  return payload;
}

export const api = {
  register: (email, password) => call('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => call('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => call('/api/auth/logout', { method: 'POST' }),
  me: (signal) => call('/api/auth/me', { signal }),

  listKits: () => call('/api/kits'),
  createKit: (input) => call('/api/kits', { method: 'POST', body: input }),
  createBatch: (cases) => call('/api/kits/batch', { method: 'POST', body: { cases } }),
  getKit: (id, signal) => call(`/api/kits/${id}`, { signal }),
  getStatus: (id, signal) => call(`/api/kits/${id}/status`, { signal }),
  retryKit: (id) => call(`/api/kits/${id}/retry`, { method: 'POST' }),
  deleteKit: (id) => call(`/api/kits/${id}`, { method: 'DELETE' }),

  editItem: (id, body) => call(`/api/kits/${id}/items`, { method: 'PATCH', body }),
  addItem: (id, body) => call(`/api/kits/${id}/items`, { method: 'POST', body }),
  removeItem: (id, section, itemId) => call(`/api/kits/${id}/items/${section}/${itemId}`, { method: 'DELETE' }),
  reorder: (id, body) => call(`/api/kits/${id}/order`, { method: 'PATCH', body }),
  moveCategory: (id, itemId, body) => call(`/api/kits/${id}/items/${itemId}/category`, { method: 'PATCH', body }),
  setPin: (id, section, itemId, pinned) => call(`/api/kits/${id}/items/${section}/${itemId}/pin`, { method: 'PATCH', body: { pinned } }),
  regenerate: (id, body) => call(`/api/kits/${id}/regenerate`, { method: 'POST', body }),

  getPractice: (id) => call(`/api/kits/${id}/practice`),
  recordPractice: (id, cardId, confidence) => call(`/api/kits/${id}/practice`, { method: 'POST', body: { cardId, confidence } }),
};
