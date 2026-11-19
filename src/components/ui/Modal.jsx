// src/components/ui/Modal.jsx
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Modal accesible.
 * - Se renderiza en <body> (portal) para que ningún contenedor lo recorte.
 * - ESC y click afuera cierran (salvo `dismissible={false}`, p. ej. mientras guarda).
 * - Bloquea el scroll del fondo y enfoca el primer campo al abrir;
 *   al cerrar devuelve el foco a donde estaba.
 *
 * @param {"sm"|"md"|"lg"} size
 * @param {React.ReactNode} footer  Botones de acción (van abajo, fijos)
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  footer,
  dismissible = true,
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: primer campo editable, o el diálogo
    const t = setTimeout(() => {
      const root = dialogRef.current;
      const el =
        root?.querySelector("[data-autofocus]") ||
        root?.querySelector(
          "input:not([type=hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled)"
        );
      (el || root)?.focus();
    }, 30);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      if (prevFocus instanceof HTMLElement) prevFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="ui-modal-overlay"
      onMouseDown={(e) => {
        // solo si el click empezó en el fondo (no al soltar un drag desde un input)
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className="ui-modal__header">
            <div>
              <h2 id={titleId} className="ui-modal__title">
                {title}
              </h2>
              {subtitle && <p className="ui-modal__subtitle">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="ui-icon-btn"
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Cerrar"
            >
              <span className="material-symbols-rounded" aria-hidden>
                close
              </span>
            </button>
          </div>
        )}

        <div className="ui-modal__body">{children}</div>

        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
