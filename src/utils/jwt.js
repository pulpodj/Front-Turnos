// src/utils/jwt.js
const TOKEN_KEY = "gt_session_jwt";
const BACKEND_TOKEN_KEY = "gt_backend_token";

function base64UrlDecode(str) {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  return base64UrlDecode(parts[1]);
}

// ===== Helpers de storage (session -> local fallback) =====
function setBoth(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function getEither(key) {
  try {
    const v = sessionStorage.getItem(key);
    if (v) return v;
  } catch {}
  try {
    const v2 = localStorage.getItem(key);
    if (v2) return v2;
  } catch {}
  return "";
}

function removeBoth(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function saveSessionToken(token) {
  // ✅ Guardamos en ambos para que el popup (otra pestaña) tenga sesión
  setBoth(TOKEN_KEY, token);
}

export function readSessionToken() {
  // ✅ Lee sessionStorage y si no existe, localStorage
  return getEither(TOKEN_KEY);
}

// (Opcional pero recomendado) Si querés guardar también el backend token desde acá
export function saveBackendToken(token) {
  setBoth(BACKEND_TOKEN_KEY, token);
}

export function readBackendToken() {
  return getEither(BACKEND_TOKEN_KEY);
}

export function clearSession() {
  // ✅ limpiamos ambos para evitar “sesión fantasma” y para logout completo
  removeBoth(TOKEN_KEY);
  removeBoth(BACKEND_TOKEN_KEY);
}

export function readSession() {
  // 1) Primero intentamos el token “de sesión” clásico
  const tokenA = readSessionToken();
  let payload = decodeJwt(tokenA);

  // 2) Fallback: si no hay sesión, intentamos el backend token (tu caso real)
  if (!payload) {
    const tokenB = readBackendToken();
    payload = decodeJwt(tokenB);
    if (!payload) return null;
    return { token: tokenB, payload };
  }

  return { token: tokenA, payload };
}
