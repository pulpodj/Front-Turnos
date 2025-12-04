// src/api/http.js
const BASE_URL = import.meta.env.VITE_API_BASE?.replace(/\/+$/, '') || 'https://backend-turnos-7n89.onrender.com'

const TOKEN_KEY = 'gt_backend_token';

/** Guardar/Borrar/Leer token backend (Bearer) */
export function setBackendToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}
export function getBackendToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

/** Fetch con JSON + Bearer + manejo de errores comunes */
export async function httpJSON(path, { method = 'GET', body, headers = {}, noAuth = false } = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const token = getBackendToken();

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(noAuth ? {} : (token ? { Authorization: `Bearer ${token}` } : {})),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Intentamos parsear JSON siempre que tenga cuerpo
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

export const apiBase = BASE_URL;
