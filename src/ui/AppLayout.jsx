// src/ui/AppLayout.jsx
// Shell de la app logueada: sidebar (menú por rol, agrupado) + header + contenido.
import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import NotificationsBell from "./NotificationsBell.jsx";
import { Avatar } from "../components/ui/Display.jsx";
import {
  ROLES_SECRETARIA,
  getDisplayName,
  getRole,
  homeForRole,
  isLoggedIn,
  logout,
} from "../utils/session.js";

/**
 * Menú por rol, agrupado. `roles` define quién ve (y puede entrar a) cada sección.
 * `desc` se muestra como subtítulo en el header.
 */
const NAV_GROUPS = [
  {
    label: "Agenda",
    items: [
      { to: "/turnos", label: "Agenda y turnos", icon: "calendar_month", desc: "Turnos de la semana por profesional", roles: ROLES_SECRETARIA },
      { to: "/agenda", label: "Mi agenda", icon: "event_note", desc: "Tus turnos de la semana", roles: ["medico"] },
      { to: "/mis-turnos", label: "Mis turnos", icon: "event_available", desc: "Tus próximos turnos y datos", roles: ["paciente"] },
    ],
  },
  {
    label: "Gestión",
    items: [
      { to: "/pacientes", label: "Pacientes", icon: "group", desc: "Alta y edición de pacientes", roles: ROLES_SECRETARIA },
      { to: "/pagos", label: "Pagos", icon: "payments", desc: "Cobros, cargos y saldos de pacientes", roles: ROLES_SECRETARIA },
      { to: "/historial", label: "Historial clínico", icon: "clinical_notes", desc: "Historias clínicas por paciente", roles: ["medico"] },
    ],
  },
];

const ROLE_LABEL = {
  admin: "Secretaría",
  secretaria: "Secretaría",
  medico: "Profesional",
  paciente: "Paciente",
};

const COLLAPSED_KEY = "gt_sidebar_collapsed";

export default function AppLayout() {
  const location = useLocation();
  const role = getRole();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [collapsed]);

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.roles.includes(role)),
  })).filter((g) => g.items.length);
  const current = groups.flatMap((g) => g.items).find((it) => location.pathname.startsWith(it.to));
  const userName = getDisplayName(ROLE_LABEL[role]);

  return (
    <div
      className={[
        "gt-shell",
        collapsed ? "is-collapsed" : "",
        mobileOpen ? "is-mobile-open" : "",
      ].join(" ")}
    >
      <aside className="gt-sidebar" aria-label="Menú principal">
        <div className="gt-sidebar__header">
          <div className="gt-sidebar__brand">
            <span className="gt-sidebar__logo" aria-hidden>
              <span className="material-symbols-rounded">health_and_safety</span>
            </span>
            <span className="gt-sidebar__text gt-sidebar__brand-text">
              <strong>Gestor de turnos</strong>
              <small>{ROLE_LABEL[role] || "Panel"}</small>
            </span>
          </div>
          <button
            type="button"
            className="gt-sidebar__toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            <span className="material-symbols-rounded" aria-hidden>
              {collapsed ? "menu" : "menu_open"}
            </span>
          </button>
        </div>

        <nav className="gt-sidebar__nav">
          {groups.map((g, i) => (
            <div key={g.label} className="gt-sidebar__group">
              {i > 0 && <div className="gt-sidebar__separator" />}
              <div className="gt-sidebar__group-label gt-sidebar__text">{g.label}</div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={({ isActive }) => `gt-nav-link${isActive ? " is-active" : ""}`}
                  title={collapsed ? it.label : undefined}
                  onClick={() => setMobileOpen(false)} // en mobile, cerrar al navegar
                >
                  <span className="material-symbols-rounded" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="gt-sidebar__text">{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="gt-sidebar__footer gt-sidebar__text">
          v{import.meta.env.VITE_APP_VERSION} · © {new Date().getFullYear()} Pulpo Net Computación
        </div>
      </aside>

      {/* Fondo oscuro para cerrar el menú en mobile */}
      <div className="gt-backdrop" onClick={() => setMobileOpen(false)} aria-hidden />

      <div className="gt-main">
        <header className="gt-topbar">
          <button
            type="button"
            className="ui-icon-btn gt-burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <span className="material-symbols-rounded" aria-hidden>
              menu
            </span>
          </button>

          <div className="gt-topbar__heading">
            <h1 className="gt-topbar__title">{current?.label || ""}</h1>
            {current?.desc && <p className="gt-topbar__desc">{current.desc}</p>}
          </div>

          <div className="gt-topbar__actions">
            {ROLES_SECRETARIA.includes(role) && <NotificationsBell />}
            <UserMenu name={userName} roleLabel={ROLE_LABEL[role]} />
          </div>
        </header>

        <main className="gt-content">
          {/* key: re-monta la animación de entrada al cambiar de sección */}
          <div className="ui-route" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function UserMenu({ name, roleLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar con click afuera o ESC
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="gt-user" ref={ref}>
      <button
        type="button"
        className="gt-user__btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={name} solid />
        <span className="gt-user__text gt-hide-sm">
          <strong>{name}</strong>
          <small>{roleLabel}</small>
        </span>
        <span className="material-symbols-rounded gt-hide-sm" aria-hidden>
          expand_more
        </span>
      </button>

      {open && (
        <div className="ui-dropdown" role="menu">
          <div className="ui-dropdown__head">
            <strong style={{ display: "block" }}>{name}</strong>
            <small className="ui-muted">{roleLabel}</small>
          </div>
          <button type="button" role="menuitem" className="ui-dropdown__item ui-dropdown__item--danger" onClick={logout}>
            <span className="material-symbols-rounded" aria-hidden>
              logout
            </span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

/** Protege una ruta por rol; si no corresponde, manda al inicio del rol. */
export function RoleRoute({ roles, children }) {
  const role = getRole();
  if (!roles.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }
  return children;
}
