// api.js - small fetch wrapper (JWT + JSON + consistent errors)

const TOKEN_KEY = 'life3600_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

async function apiRequest(path, options = {}) {
  const url = path; // endpoints are mounted on same origin

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

window.life3600Api = {
  apiRequest,
  getToken,
  setToken,
};

