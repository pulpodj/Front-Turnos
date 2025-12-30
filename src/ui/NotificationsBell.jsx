// src/ui/NotificationsBell.jsx
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "gt_landing_leads"; // [{nombre,apellido,email,telefono,createdAt}]

function readLeads() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState(() => readLeads());
  const rootRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setLeads(readLeads()), 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unreadCount = leads.length;

  return (
    <div className="notif" ref={rootRef}>
      <button
        type="button"
        className="btn-ghost notif-btn"
        onClick={() => setOpen((s) => !s)}
        title="Notificaciones"
      >
        <span className="material-symbols-rounded" aria-hidden>
          notifications
        </span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-pop__head">
            <strong>Notificaciones</strong>
            <span className="muted" style={{ marginLeft: "auto" }}>
              Landing
            </span>
          </div>

          {leads.length === 0 ? (
            <div className="notif-empty">No hay mensajes todavía.</div>
          ) : (
            <div className="notif-list">
              {leads
                .slice()
                .reverse()
                .slice(0, 20)
                .map((n, idx) => (
                  <div key={idx} className="notif-item">
                    <div className="notif-item__title">
                      {n.nombre || ""} {n.apellido || ""}
                    </div>
                    <div className="notif-item__meta">
                      {n.email || "—"} • {n.telefono || "—"}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
