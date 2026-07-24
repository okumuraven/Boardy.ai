const TOKEN_KEY = 'kuzana_session_token';
const API_URL = import.meta.env.VITE_API_URL;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Fires whenever a request comes back 401 - a session that was valid a
// moment ago (token expired, or was issued before a server restart
// rotated the signing secret) is functionally identical to "never
// logged in" from here on. App.jsx listens for this to drop back to
// the login screen instead of leaving the user stuck on a screen that
// can never successfully load data again.
const UNAUTHORIZED_EVENT = 'kuzana:unauthorized';

// Every backend request goes through this - it's the one place the
// session token is attached, so no call site can forget the
// `Authorization` header the way a hand-written `fetch` could.
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  return response;
}

export function onUnauthorized(callback) {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}
