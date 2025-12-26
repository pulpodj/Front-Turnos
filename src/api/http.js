// src/api/http.js
const BASE_URL =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") ||
  "https://backend-turnos-7n89.onrender.com";

const TOKEN_KEY = "gt_backend_token";

/** Guardar/Borrar/Leer token backend (Bearer) */
export function setBackendToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getBackendToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function clearBackendToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** Fetch con JSON + Bearer + manejo de errores comunes */
export async function httpJSON(
  path,
  { method = "GET", body, headers = {}, noAuth = false } = {}
) {
  const url = path.startsWith("http")
    ? path
    : `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const token = getBackendToken();

  // ✅ Si body ya es string, NO lo volvemos a stringify
  const finalBody =
    body === undefined || body === null
      ? undefined
      : typeof body === "string"
      ? body
      : JSON.stringify(body);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(noAuth ? {} : token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: finalBody,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

export const apiBase = BASE_URL;
