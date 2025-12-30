// src/ui/Header.jsx
import { useMemo } from "react";
import { readSession } from "../utils/jwt.js";
import NotificationsBell from "./NotificationsBell.jsx";

function resolveDisplayName(payload, fallback) {
  const p = payload || {};
  return (
    p.prof_nombre?.trim?.() ||
    p.nombre?.trim?.() ||
    p.name?.trim?.() ||
    p.username?.trim?.() ||
    String(p.sub || "").trim() ||
    fallback ||
    "Usuario"
  );
}

export default function Header({
  doctorName,
  onLogout,
  enableHistorialButton,
  showNotifications = false, // ✅ NUEVO: campanita solo cuando lo habilites
}) {
  const sess = readSession();
  const payload = sess?.payload || null;

  const showHistorialInHeader = Boolean(enableHistorialButton);

  const openPatientsWindow = () => {
    window.open(
      "/pacientes/historial",
      "_blank",
      // ✅ IMPORTANTE: sin noopener/noreferrer para poder copiar token desde window.opener
      "width=1200,height=780,scrollbars=yes"
    );
  };

  const display = useMemo(
    () => resolveDisplayName(payload, doctorName),
    [payload, doctorName]
  );

  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo-dot" />
        <strong>Sistema gestor de turnos</strong>
      </div>

      <div className="header-actions">
        {/* ✅ Campanita (solo si showNotifications) */}
        {showNotifications && <NotificationsBell />}

        <div className="doctor">
          <span className="material-symbols-rounded" aria-hidden>
            stethoscope
          </span>
          <span>{display}</span>
        </div>

        {showHistorialInHeader && (
          <button
            className="btn-ghost"
            onClick={openPatientsWindow}
            title="Abrir historial clínico"
          >
            <span className="material-symbols-rounded" aria-hidden>
              clinical_notes
            </span>
            Historial clínico
          </button>
        )}

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
