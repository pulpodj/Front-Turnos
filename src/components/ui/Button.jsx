// src/components/ui/Button.jsx
/**
 * Botón del sistema de diseño.
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant
 * @param {"md"|"sm"} size
 * @param {string} icon     nombre de Material Symbol (opcional)
 * @param {boolean} loading muestra spinner y deshabilita
 */
export default function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading = false,
  block = false,
  type = "button",
  className = "",
  disabled,
  children,
  ...rest
}) {
  const cls = [
    "ui-btn",
    `ui-btn--${variant}`,
    size === "sm" ? "ui-btn--sm" : "",
    block ? "ui-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <span className="ui-spinner" aria-hidden />
      ) : (
        icon && (
          <span className="material-symbols-rounded" aria-hidden>
            {icon}
          </span>
        )
      )}
      {children}
    </button>
  );
}

/** Botón solo ícono (requiere `label` para accesibilidad / tooltip). */
export function IconButton({ icon, label, danger = false, className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`ui-icon-btn ${danger ? "ui-icon-btn--danger" : ""} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <span className="material-symbols-rounded" aria-hidden>
        {icon}
      </span>
    </button>
  );
}
