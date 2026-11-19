// src/utils/session.js
// Punto único para saber "quién está logueado" y con qué rol.
import { getBackendToken, clearBackendToken } from "../api/http.js";
import { readSession, clearSession } from "./jwt.js";
import { resolveRole } from "./role.js";

const ROLE_KEY = "gt_role";

/** Roles que ven las pantallas de secretaría */
export const ROLES_SECRETARIA = ["admin", "secretaria"];

export function saveRole(role) {
  try {
    if (role) sessionStorage.setItem(ROLE_KEY, role);
    else sessionStorage.removeItem(ROLE_KEY);
  } catch {
    /* storage no disponible */
  }
}

export function isLoggedIn() {
  return !!getBackendToken();
}

/**
 * Rol actual: "admin" | "secretaria" | "medico" | "paciente" | "".
 * 1) el que guardó el login, 2) el del payload del JWT,
 * 3) con sesión pero sin rol reconocible => "medico"
 *    (mismo criterio que usa el login de colaboradores).
 */
export function getRole() {
  if (!isLoggedIn()) return "";
  try {
    const stored = sessionStorage.getItem(ROLE_KEY);
    if (stored) return stored;
  } catch {
    /* noop */
  }
  const fromJwt = resolveRole(readSession()?.payload);
  return fromJwt === "unknown" ? "medico" : fromJwt;
}

/** Pantalla de inicio de cada rol */
export function homeForRole(role) {
  if (ROLES_SECRETARIA.includes(role)) return "/turnos";
  if (role === "paciente") return "/mis-turnos";
  if (role === "medico") return "/agenda";
  return "/login";
}

/** Nombre a mostrar del usuario logueado */
export function getDisplayName(fallback = "Usuario") {
  const p = readSession()?.payload || {};
  return (
    p.prof_nombre?.trim?.() ||
    p.nombre?.trim?.() ||
    p.name?.trim?.() ||
    p.username?.trim?.() ||
    String(p.sub || "").trim() ||
    fallback
  );
}

/** Logout completo: el JWT también se guarda en localStorage (ver jwt.js) */
export function logout() {
  clearBackendToken();
  clearSession();
  saveRole("");
  window.location.href = "/login";
}
