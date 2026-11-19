// src/components/ui/feedback.js
// Hooks para mostrar toasts y pedir confirmación desde cualquier pantalla.
// El estado vive en <FeedbackProvider> (montado en main.jsx).
import { createContext, useContext } from "react";

export const FeedbackContext = createContext(null);

const noop = () => {};

/**
 * const toast = useToast();
 * toast.success("Guardado"); toast.error("No se pudo..."); toast.info(...); toast.warning(...)
 */
export function useToast() {
  const ctx = useContext(FeedbackContext);
  return ctx?.toast || { success: noop, error: noop, info: noop, warning: noop };
}

/**
 * const confirm = useConfirm();
 * if (!(await confirm({ title, message, confirmText, danger: true }))) return;
 * Reemplaza window.confirm (que bloquea el navegador y no respeta el diseño).
 */
export function useConfirm() {
  const ctx = useContext(FeedbackContext);
  return ctx?.confirm || (async ({ message }) => window.confirm(message));
}
