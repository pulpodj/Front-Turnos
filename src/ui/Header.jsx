// src/ui/Header.jsx
import { readSession } from "../utils/jwt.js";

function resolveDisplayName(propName) {
  const sess = readSession();
  if (!sess?.payload) return propName || "Gestor";

  const { role, prof_nombre, sub } = sess.payload;

  if (role === "medico") {
    // Prioriza nombre del profesional; fallback a 'sub' (usuario) o prop
    return prof_nombre?.trim?.() || String(sub || "").trim() || propName || "Profesional";
  }
  if (role === "admin") {
    return "Administración";
  }
  if (role === "paciente") {
    return "Pacientes";
  }
  return propName || "Gestor";
}

export default function Header({ doctorName, onLogout }) {
  const display = resolveDisplayName(doctorName);

  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo-dot" />
        <strong>Gestor de Turnos</strong>
      </div>
      <div className="header-actions">
        <div className="doctor">
          <span className="material-symbols-rounded" aria-hidden>
            stethoscope
          </span>
          <span>{display}</span>
        </div>
        <button className="btn-ghost" onClick={onLogout}>
          <span className="material-symbols-rounded" aria-hidden>
            logout
          </span>
          Salir
        </button>
      </div>
    </header>
  );
}

