// src/components/ui/Display.jsx
// Piezas de presentación chicas del sistema de diseño.

/** Encabezado de página: título, subtítulo y acciones a la derecha. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ui-page-header">
      <div>
        <h1 className="ui-page-title">{title}</h1>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  );
}

/** Card con header opcional (título + acciones). */
export function Card({ title, icon, actions, flush = false, className = "", children }) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || actions) && (
        <div className="ui-card__header">
          {title && (
            <h2 className="ui-card__title">
              {icon && (
                <span className="material-symbols-rounded" aria-hidden style={{ color: "var(--ui-primary)" }}>
                  {icon}
                </span>
              )}
              {title}
            </h2>
          )}
          {actions && <div className="ui-inline">{actions}</div>}
        </div>
      )}
      <div className={flush ? "ui-card__body--flush" : "ui-card__body"}>{children}</div>
    </section>
  );
}

/** Indicador numérico (KPI). tone: primary | success | danger | warning */
export function StatCard({ label, value, icon, tone = "primary", hint, children }) {
  return (
    <div className={`ui-stat ui-stat--${tone}`}>
      {icon && (
        <div className="ui-stat__icon">
          <span className="material-symbols-rounded" aria-hidden>
            {icon}
          </span>
        </div>
      )}
      <div className="ui-stat__info">
        <span className="ui-stat__label">{label}</span>
        <span className="ui-stat__value">{value}</span>
        {hint && <span className="ui-stat__hint">{hint}</span>}
        {children}
      </div>
    </div>
  );
}

/** Estado vacío con ícono, texto y acción opcional. */
export function EmptyState({ icon = "inbox", title, description, action }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon">
        <span className="material-symbols-rounded" aria-hidden>
          {icon}
        </span>
      </div>
      <h3 className="ui-empty__title">{title}</h3>
      {description && <p className="ui-empty__desc">{description}</p>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}

/** Etiqueta de estado. variant: primary | success | warning | danger | neutral | accent */
export function Badge({ variant = "neutral", icon, children }) {
  return (
    <span className={`ui-badge ui-badge--${variant}`}>
      {icon && (
        <span className="material-symbols-rounded" aria-hidden style={{ fontSize: 14 }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/** Mensaje en línea. variant: danger | success | warning | info */
export function Alert({ variant = "info", children }) {
  const icon = { danger: "error", success: "check_circle", warning: "warning", info: "info" }[variant];
  return (
    <div className={`ui-alert ui-alert--${variant}`} role={variant === "danger" ? "alert" : "status"}>
      <span className="material-symbols-rounded" aria-hidden>
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}

/** Avatar con iniciales. */
export function Avatar({ name, size, solid = false }) {
  const initials =
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || "?";
  return (
    <span
      className={`ui-avatar ${size === "lg" ? "ui-avatar--lg" : ""} ${solid ? "ui-avatar--solid" : ""}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Filas "fantasma" mientras carga una tabla. */
export function SkeletonRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden>
      {Array.from({ length: cols }, (_, c) => (
        <td key={c}>
          <span className="ui-skeleton" style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
        </td>
      ))}
    </tr>
  ));
}

/** Campo de formulario: label + control + ayuda/error. */
export function Field({ label, required, hint, error, className = "", children }) {
  return (
    <label className={`ui-field ${className}`}>
      {label && (
        <span className="ui-label">
          {label}
          {required && <span className="ui-req"> *</span>}
        </span>
      )}
      {children}
      {error ? <span className="ui-field-error">{error}</span> : hint && <span className="ui-hint">{hint}</span>}
    </label>
  );
}
