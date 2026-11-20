// src/ui/MetodosPagoModal.jsx
// ABM de "Metodo de pago" (orígenes de movimiento del backend).
import { useState } from "react";
import Modal from "../components/ui/Modal.jsx";
import Button, { IconButton } from "../components/ui/Button.jsx";
import { Alert, EmptyState, Field } from "../components/ui/Display.jsx";
import { useConfirm, useToast } from "../components/ui/feedback.js";
import {
  METODOS_PAGO_DEFAULT,
  crearMovimientoOrigen,
  modificarMovimientoOrigen,
  eliminarMovimientoOrigen,
} from "../api/movimientosBackend.js";

const EMPTY = { id: null, tipo: "", descripcion: "" };
const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Props:
 *  - open, onClose
 *  - origenes: [{ id, tipo, descripcion }] activos
 *  - apiOk: true si el backend respondió la lista; false si la API no está disponible
 *  - onChanged: async () => recargar la lista
 */
export default function MetodosPagoModal({ open, onClose, origenes, apiOk, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function cerrar() {
    if (saving) return;
    setForm(EMPTY);
    setErr("");
    onClose();
  }

  async function guardar(e) {
    e.preventDefault();
    setErr("");
    const tipo = form.tipo.trim();
    if (!tipo) {
      setErr("Ingresá el nombre del método de pago.");
      return;
    }
    if (origenes.some((o) => norm(o.tipo) === norm(tipo) && String(o.id) !== String(form.id))) {
      setErr("Ya existe un método de pago con ese nombre.");
      return;
    }
    setSaving(true);
    try {
      const body = { id: form.id, tipo, descripcion: form.descripcion.trim() };
      if (form.id) await modificarMovimientoOrigen(body);
      else await crearMovimientoOrigen(body);
      toast.success(form.id ? "Método de pago actualizado." : "Método de pago agregado.");
      setForm(EMPTY);
      await onChanged();
    } catch (e2) {
      setErr(e2.message || "No se pudo guardar el método de pago.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(o) {
    const ok = await confirm({
      title: `¿Eliminar "${o.tipo}"?`,
      message: "Deja de aparecer en el desplegable. Los pagos ya cargados con este método no se modifican.",
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    try {
      await eliminarMovimientoOrigen(o.id);
      toast.success(`"${o.tipo}" eliminado.`);
      if (String(form.id) === String(o.id)) setForm(EMPTY);
      await onChanged();
    } catch (e) {
      toast.error(e.message || "No se pudo eliminar el método de pago.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={cerrar}
      dismissible={!saving}
      title="Métodos de pago"
      subtitle="Opciones del campo Metodo de pago en los pagos (Haber)."
      footer={
        <Button variant="secondary" onClick={cerrar} disabled={saving}>
          Cerrar
        </Button>
      }
    >
      {!apiOk ? (
        <>
          <Alert variant="warning">
            El backend todavía no responde la API de métodos de pago. Mientras tanto se usa esta lista fija:
          </Alert>
          <ul style={{ margin: "12px 0 0", paddingLeft: 20 }}>
            {METODOS_PAGO_DEFAULT.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {origenes.length === 0 ? (
            <EmptyState icon="payments" title="Sin métodos de pago" description="Agregá el primero abajo." />
          ) : (
            <div className="ui-table-wrap" style={{ marginBottom: 16 }}>
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="actions" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {origenes.map((o) => (
                    <tr key={o.id}>
                      <td>{o.tipo}</td>
                      <td>{o.descripcion || <span className="ui-soft">—</span>}</td>
                      <td className="actions">
                        <IconButton
                          icon="edit"
                          label="Editar"
                          onClick={() => setForm({ id: o.id, tipo: o.tipo || "", descripcion: o.descripcion || "" })}
                        />
                        <IconButton icon="delete" label="Eliminar" danger onClick={() => eliminar(o)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <form onSubmit={guardar} noValidate>
            <div className="ui-row-2">
              <Field label={form.id ? "Editar nombre" : "Nuevo método de pago"} required>
                <input
                  className="ui-input"
                  placeholder="Ej: MercadoPago - Milton Neffen"
                  value={form.tipo}
                  onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
                />
              </Field>
              <Field label="Descripción">
                <input
                  className="ui-input"
                  value={form.descripcion}
                  onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                />
              </Field>
            </div>
            <div className="ui-inline" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              {form.id && (
                <Button variant="ghost" onClick={() => setForm(EMPTY)} disabled={saving}>
                  Cancelar edición
                </Button>
              )}
              <Button type="submit" variant="primary" icon={form.id ? "check" : "add"} loading={saving}>
                {form.id ? "Guardar cambios" : "Agregar"}
              </Button>
            </div>
          </form>

          {err && (
            <div style={{ marginTop: 14 }}>
              <Alert variant="danger">{err}</Alert>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
