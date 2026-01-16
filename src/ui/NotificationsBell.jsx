// src/ui/NotificationsBell.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listarNotificaciones,
  actualizarNotificacion,
  borrarNotificacion,
} from "../api/notificacionesBackend.js";

function pickField(n, ...keys) {
  for (const k of keys) {
    const v = n?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

// El backend suele traer los datos del solicitante embebidos en `detalle`.
// Ej: "Nuevo contacto desde la landing: | Nombre: Santiago Aimar | Email: ... | Teléfono: ..."
function parseContactFromDetalle(detalleRaw) {
  const detalle = String(detalleRaw ?? "");
  if (!detalle) return { nombre: "", apellido: "", email: "", telefono: "" };

  const get = (re) => {
    const m = detalle.match(re);
    return m && m[1] ? String(m[1]).trim() : "";
  };

  const nombreFull =
    get(/\bNombre\s*:\s*([^|\n\r]+)/i) || get(/\bPaciente\s*:\s*([^|\n\r]+)/i);
  const email =
    get(/\bEmail\s*:\s*([^|\n\r]+)/i) || get(/\bMail\s*:\s*([^|\n\r]+)/i);
  const telefono =
    get(/\bTel[eé]fono\s*:\s*([^|\n\r]+)/i) ||
    get(/\bTelefono\s*:\s*([^|\n\r]+)/i) ||
    get(/\bTel\s*:\s*([^|\n\r]+)/i);

  // Separación suave nombre/apellido (si viene "Nombre Apellido")
  let nombre = nombreFull;
  let apellido = "";
  if (nombreFull) {
    const parts = nombreFull.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      nombre = parts[0];
      apellido = parts.slice(1).join(" ");
    }
  }

  return { nombre, apellido, email, telefono };
}
function isRead(n) {
  const v =
    n?.leida ?? n?.leído ?? n?.leido ?? n?.read ?? n?.visto ?? n?.estado;
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (v === true || v === 1) return true;
  if (["true", "1", "leida", "leído", "leido", "visto", "read"].includes(s))
    return true;
  return false;
}

function isBaja(n) {
  const v = n?.baja ?? n?.deleted ?? n?.is_deleted ?? n?.activo;
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (v === true || v === 1) return true;
  if (["true", "1"].includes(s)) return true;
  if (v === false || v === 0) return true; // si viene activo=false
  if (["false", "0"].includes(s)) return true;
  return false;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(null);

  async function reload() {
    setErr("");
    setLoading(true);
    try {
      const data = await listarNotificaciones();
      // ocultar bajas lógicas por las dudas
      const clean = (Array.isArray(data) ? data : []).filter((n) => !isBaja(n));
      // orden: más nuevas arriba si hay fecha
      clean.sort((a, b) => {
        const ta =
          new Date(
            pickField(a, "createdAt", "fecha", "created_at"),
          ).getTime() || 0;
        const tb =
          new Date(
            pickField(b, "createdAt", "fecha", "created_at"),
          ).getTime() || 0;
        return tb - ta;
      });
      setList(clean);
    } catch (e) {
      setErr(e?.message || "Error cargando notificaciones");
    } finally {
      setLoading(false);
    }
  }

  // carga inicial + polling suave
  useEffect(() => {
    reload();
    const t = setInterval(() => reload(), 15000); // 15s
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cerrar al click afuera + ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  // cuando abrís, refresca
  useEffect(() => {
    if (open) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const unreadCount = useMemo(
    () => list.reduce((acc, n) => acc + (isRead(n) ? 0 : 1), 0),
    [list],
  );

  async function markAsRead(n) {
    const id = n?.id ?? n?._id;
    if (!id) return;

    // intentamos varias variantes de payload (por si tu backend usa otro nombre)
    const payload = {
      id,
      leido: 1,
      leida: true,
      visto: true,
      read: true,
      estado: "leido",
    };

    try {
      await actualizarNotificacion(payload);
      await reload();
    } catch (e) {
      // si falla, no rompemos UI
      console.error(e);
      setErr(e?.message || "No se pudo marcar como leída");
    }
  }

  async function removeNotif(n) {
    const id = n?.id ?? n?._id;
    if (!id) return;
    try {
      await borrarNotificacion(id);
      await reload();
    } catch (e) {
      console.error(e);
      setErr(e?.message || "No se pudo eliminar");
    }
  }

  return (
    <div className="notif-wrap" ref={ref}>
      <button
        type="button"
        className="btn-ghost notif-btn"
        aria-label="Notificaciones"
        title="Notificaciones"
        onClick={() => setOpen((s) => !s)}
      >
        <span className="material-symbols-rounded" aria-hidden>
          notifications
        </span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-pop">
          <div className="notif-head">
            <div className="notif-title">Notificaciones</div>
            <div className="notif-actions">
              <button
                type="button"
                className="btn-mini"
                onClick={reload}
                disabled={loading}
              >
                {loading ? "…" : "Refrescar"}
              </button>
            </div>
          </div>

          {err && <div className="notif-error">{err}</div>}

          <div className="notif-body">
            {list.length === 0 ? (
              <div className="notif-empty muted">
                {loading ? "Cargando…" : "No hay notificaciones."}
              </div>
            ) : (
              list.map((n) => {
                const detalle = pickField(
                  n,
                  "detalle",
                  "Detalle",
                  "mensaje",
                  "message",
                );
                const parsed = parseContactFromDetalle(detalle);

                const nombre =
                  pickField(n, "Nombre", "nombre") || parsed.nombre;
                const apellido =
                  pickField(n, "Apellido", "apellido") || parsed.apellido;
                const email =
                  pickField(n, "Email", "email", "mail") || parsed.email;
                const telefono =
                  pickField(n, "Telefono", "telefono", "tel", "celular") ||
                  parsed.telefono;

                const unread = !isRead(n);

                return (
                  <div
                    key={String(n.id ?? n._id ?? Math.random())}
                    className={`notif-item ${unread ? "is-unread" : "is-read"}`}
                  >
                    <div className="notif-top">
                      <div className="notif-name">
                        {nombre || "—"} {apellido || ""}
                      </div>
                    </div>

                    <div className="notif-line">
                      <span className="material-symbols-rounded">mail</span>
                      <span>{email || "—"}</span>
                    </div>

                    <div className="notif-line">
                      <span className="material-symbols-rounded">call</span>
                      <span>{telefono || "—"}</span>
                    </div>

                    <div className="notif-actions">
                      <button
                        type="button"
                        className="btn-mini danger"
                        onClick={() => removeNotif(n)}
                        title="Eliminar (baja lógica)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
