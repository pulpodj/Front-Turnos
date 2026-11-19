// src/components/ui/FeedbackProvider.jsx
import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import { FeedbackContext } from "./feedback.js";

const TOAST_ICON = {
  success: "check_circle",
  error: "error",
  warning: "warning",
  info: "info",
};
const TOAST_MS = { success: 3500, info: 4000, warning: 5000, error: 6000 };

export default function FeedbackProvider({ children }) {
  // ---------- Toasts ----------
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++seq.current;
      const ms = TOAST_MS[type] || 4000;
      // máximo 4 en pantalla: se descarta el más viejo
      setToasts((list) => [...list.slice(-3), { id, type, message, ms }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      warning: (m) => push("warning", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  // ---------- Confirmación ----------
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        setDialog({
          title: "¿Confirmás esta acción?",
          confirmText: "Confirmar",
          cancelText: "Cancelar",
          ...opts,
          resolve,
        });
      }),
    []
  );

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {createPortal(
        <div className="ui-toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`ui-toast ui-toast--${t.type}`}>
              <span className="material-symbols-rounded ui-toast__icon" aria-hidden>
                {TOAST_ICON[t.type]}
              </span>
              <span className="ui-toast__msg">{t.message}</span>
              <button
                type="button"
                className="ui-icon-btn"
                style={{ width: 24, height: 24 }}
                onClick={() => dismiss(t.id)}
                aria-label="Cerrar aviso"
              >
                <span className="material-symbols-rounded" aria-hidden style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
              <span className="ui-toast__bar" style={{ animationDuration: `${t.ms}ms` }} />
            </div>
          ))}
        </div>,
        document.body
      )}

      <Modal
        open={!!dialog}
        onClose={() => closeDialog(false)}
        size="sm"
        footer={
          <>
            {/* En acciones peligrosas el foco arranca en "Cancelar" (Enter no borra) */}
            <Button
              variant="secondary"
              onClick={() => closeDialog(false)}
              data-autofocus={dialog?.danger ? true : undefined}
            >
              {dialog?.cancelText}
            </Button>
            <Button
              variant={dialog?.danger ? "danger" : "primary"}
              onClick={() => closeDialog(true)}
              data-autofocus={dialog?.danger ? undefined : true}
            >
              {dialog?.confirmText}
            </Button>
          </>
        }
      >
        {dialog && (
          <div className={`ui-confirm ${dialog.danger ? "ui-confirm--danger" : ""}`}>
            <div className="ui-confirm__icon">
              <span className="material-symbols-rounded" aria-hidden>
                {dialog.icon || (dialog.danger ? "delete" : "help")}
              </span>
            </div>
            <div>
              <h3 className="ui-confirm__title">{dialog.title}</h3>
              {dialog.message && <p className="ui-confirm__msg">{dialog.message}</p>}
            </div>
          </div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
}
