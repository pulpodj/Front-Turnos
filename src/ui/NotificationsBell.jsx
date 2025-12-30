// src/ui/NotificationsBell.jsx
import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "gt_landing_notifications_v1";

function safeJsonParse(s, fallback) {
  try {
    const v = JSON.parse(s);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function readNotifications() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const arr = safeJsonParse(raw, []);
  return Array.isArray(arr) ? arr : [];
}

function writeNotifications(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function pushLandingNotification(data) {
  // data: {nombre, apellido, email, telefono}
  const now = Date.now();
  const item = {
    id: crypto?.randomUUID?.() ?? String(now),
    createdAt: now,
    read: false,
    ...data,
  };

  const list = readNotifications();
  list.unshift(item);
  writeNotifications(list);
  return item;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(() => readNotifications());
  const ref = useRef(null);

  const unreadCount = useMemo(
    () => list.reduce((acc, n) => acc + (n.read ? 0 : 1), 0),
    [list]
  );

  function refresh() {
    setList(readNotifications());
  }

  function markAllRead() {
    const next = list.map((n) => ({ ...n, read: true }));
    setList(next);
    writeNotifications(next);
  }

  function clearAll() {
    setList([]);
    writeNotifications([]);
  }

  function markOneRead(id) {
    const next = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    setList(next);
    writeNotifications(next);
  }

  useEffect(() => {
    // refresca si otra pestaña o la landing escribe en localStorage
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        type="button"
        className="icon-btn notif-btn"
        aria-label="Notificaciones"
        title="Notificaciones"
        onClick={() => setOpen((s) => !s)}
      >
        <span className="material-symbols-rounded">notifications</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-head">
            <div className="notif-title">Notificaciones</div>
            <div className="notif-actions">
              <button type="button" className="btn-mini" onClick={markAllRead}>
                Marcar leídas
              </button>
              <button type="button" className="btn-mini" onClick={clearAll}>
                Limpiar
              </button>
            </div>
          </div>

          <div className="notif-body">
            {list.length === 0 ? (
              <div className="notif-empty muted">No hay notificaciones.</div>
            ) : (
              list.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${n.read ? "is-read" : "is-unread"}`}
                  onClick={() => markOneRead(n.id)}
                  title="Click para marcar como leída"
                >
                  <div className="notif-top">
                    <div className="notif-name">
                      {n.nombre || "-"} {n.apellido || ""}
                    </div>
                    <div className="notif-date">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="notif-line">
                    <span className="material-symbols-rounded">mail</span>
                    <span>{n.email || "-"}</span>
                  </div>

                  <div className="notif-line">
                    <span className="material-symbols-rounded">call</span>
                    <span>{n.telefono || "-"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
