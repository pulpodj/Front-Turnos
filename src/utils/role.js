// src/utils/role.js
/**
 * Normaliza roles aunque el backend use distintos nombres.
 * Devuelve: "admin" | "medico" | "secretaria" | "paciente" | "unknown"
 */
export function resolveRole(payload) {
  if (!payload || typeof payload !== "object") return "unknown";

  // candidatos típicos
  const raw =
    payload.role ??
    payload.rol ??
    payload.perfil ??
    payload.tipo ??
    payload.userRole ??
    payload.user_role ??
    payload.profile ??
    payload.claimsRole ??
    payload.claims_role;

  const s = String(raw || "").trim().toLowerCase();

  if (!s) return "unknown";

  // admin
  if (s.includes("admin")) return "admin";

  // secretaria
  if (s.includes("secret")) return "secretaria";

  // medico / profesional
  if (s.includes("medic") || s.includes("doctor") || s.includes("profes")) return "medico";

  // paciente / cliente
  if (s.includes("pacient") || s.includes("client")) return "paciente";

  return "unknown";
}
