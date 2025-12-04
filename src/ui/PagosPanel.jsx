// src/ui/PagosPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { getBackendToken } from "../api/http.js";
import {
  listarMovimientos,
  crearMovimiento,
  modificarMovimiento,
  eliminarMovimiento,
  emptyMovimientoForm,
  mapMovimientoToForm,
} from "../api/movimientosBackend.js";
import { listarPacientes } from "../api/abmBackend.js";

const TRATAMIENTOS = [
  { id: 1, nombre: "Terapia Manual" },
  { id: 2, nombre: "Kinesiología Convencional" },
  { id: 3, nombre: "Ejercicios Adaptados" },
];

export default function PagosPanel() {
  const useBackend = !!getBackendToken();

  const [pacientes, setPacientes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [modo, setModo] = useState("form"); // "form" | "resumen"

  // Formulario de nuevo pago
  const [form, setForm] = useState(() => ({
    pacienteId: "",
    tratamientoId: "",
    fecha: new Date().toISOString().slice(0, 10),
    debe: "",
    observacion: "",
  }));
  const [loadingForm, setLoadingForm] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [okForm, setOkForm] = useState("");

  // Filtros resumen
  const [filtroPacienteId, setFiltroPacienteId] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [editing, setEditing] = useState(null); // formulario de edición
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [errorResumen, setErrorResumen] = useState("");

  // Carga inicial
  useEffect(() => {
    if (!useBackend) return;
    (async () => {
      try {
        const [pac, mov] = await Promise.all([
          listarPacientes().catch(() => []),
          listarMovimientos().catch(() => []),
        ]);
        if (Array.isArray(pac)) setPacientes(pac);
        if (Array.isArray(mov)) setMovimientos(mov);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [useBackend]);

  const pacPorId = useMemo(
    () =>
      Object.fromEntries(
        pacientes.map((p) => [String(p.id), p.nombre || `Paciente ${p.id}`])
      ),
    [pacientes]
  );

  const tratamientoPorId = useMemo(
    () => Object.fromEntries(TRATAMIENTOS.map((t) => [String(t.id), t.nombre])),
    []
  );

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroPacienteId && String(m.id_cliente) !== String(filtroPacienteId))
        return false;
      if (filtroDesde && m.fecha < filtroDesde) return false;
      if (filtroHasta && m.fecha > filtroHasta) return false;
      return true;
    });
  }, [movimientos, filtroPacienteId, filtroDesde, filtroHasta]);

  async function recargarMovimientos() {
    try {
      const mov = await listarMovimientos();
      if (Array.isArray(mov)) setMovimientos(mov);
    } catch (e) {
      console.error(e);
    }
  }

  async function guardarPago(e) {
    e.preventDefault();
    setErrorForm("");
    setOkForm("");

    if (!form.pacienteId || !form.tratamientoId || !form.fecha || !form.debe) {
      setErrorForm("Completá paciente, tratamiento, fecha y monto.");
      return;
    }

    setLoadingForm(true);
    try {
      const payload = {
        id_movimiento_tipo: Number(form.tratamientoId),
        fecha: form.fecha,
        fecha_vencimiento: form.fecha,
        debe: Number(form.debe),
        haber: 0,
        baja: false,
        observaciones: form.observacion,
        id_cliente: Number(form.pacienteId),
        saldo: Number(form.debe),
      };

      await crearMovimiento(payload);
      setOkForm("Pago registrado correctamente.");
      setForm((s) => ({
        ...s,
        fecha: new Date().toISOString().slice(0, 10),
        debe: "",
        observacion: "",
      }));
      recargarMovimientos();
    } catch (err) {
      setErrorForm(err.message || "No se pudo guardar el pago.");
    } finally {
      setLoadingForm(false);
    }
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editing) return;
    setErrorResumen("");
    setLoadingResumen(true);
    try {
      await modificarMovimiento(editing);
      setEditing(null);
      recargarMovimientos();
    } catch (err) {
      setErrorResumen(err.message || "No se pudo modificar el movimiento.");
    } finally {
      setLoadingResumen(false);
    }
  }

  async function eliminarMov(id) {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    setLoadingResumen(true);
    setErrorResumen("");
    try {
      await eliminarMovimiento(id);
      recargarMovimientos();
    } catch (err) {
      setErrorResumen(err.message || "No se pudo eliminar el movimiento.");
    } finally {
      setLoadingResumen(false);
    }
  }

  function handlePrint() {
    window.print(); // después podés tunear con @media print
  }

  if (!useBackend) {
    return (
      <div className="card pagos-card">
        <h2>Pagos</h2>
        <p className="muted">
          Iniciá sesión contra el backend para gestionar pagos reales.
        </p>
      </div>
    );
  }

  return (
    <div className="card pagos-card">
      <header className="pagos-header">
        <h2>Pagos</h2>
        <div className="segmented">
          <button
            type="button"
            className={modo === "form" ? "active" : ""}
            onClick={() => setModo("form")}
          >
            Registrar pago
          </button>
          <button
            type="button"
            className={modo === "resumen" ? "active" : ""}
            onClick={() => setModo("resumen")}
          >
            Resumen de movimientos
          </button>
        </div>
      </header>

      {modo === "form" ? (
        <form className="form" onSubmit={guardarPago}>
          {errorForm && <div className="alert error">{errorForm}</div>}
          {okForm && <div className="alert success">{okForm}</div>}

          <label>
            Paciente
            <select
              value={form.pacienteId}
              onChange={(e) =>
                setForm((s) => ({ ...s, pacienteId: e.target.value }))
              }
            >
              <option value="">-- Seleccionar paciente --</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo de tratamiento
            <select
              value={form.tratamientoId}
              onChange={(e) =>
                setForm((s) => ({ ...s, tratamientoId: e.target.value }))
              }
            >
              <option value="">-- Seleccionar tratamiento --</option>
              {TRATAMIENTOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Fecha del tratamiento
            <input
              type="date"
              value={form.fecha}
              onChange={(e) =>
                setForm((s) => ({ ...s, fecha: e.target.value }))
              }
            />
          </label>

          <label>
            Importe (Debe)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.debe}
              onChange={(e) =>
                setForm((s) => ({ ...s, debe: e.target.value }))
              }
            />
          </label>

          <label>
            Observación
            <textarea
              rows={2}
              value={form.observacion}
              onChange={(e) =>
                setForm((s) => ({ ...s, observacion: e.target.value }))
              }
            />
          </label>

          <button
            type="submit"
            className={`primary ${loadingForm ? "loading" : ""}`}
            disabled={loadingForm}
          >
            {loadingForm ? "Guardando..." : "Guardar"}
          </button>
        </form>
      ) : (
        <section className="pagos-resumen">
          {errorResumen && <div className="alert error">{errorResumen}</div>}

          <div className="inline" style={{ gap: 10, marginBottom: 10 }}>
            <label style={{ flex: 2 }}>
              Paciente
              <select
                value={filtroPacienteId}
                onChange={(e) => setFiltroPacienteId(e.target.value)}
              >
                <option value="">Todos</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Desde
              <input
                type="date"
                value={filtroDesde}
                onChange={(e) => setFiltroDesde(e.target.value)}
              />
            </label>
            <label style={{ flex: 1 }}>
              Hasta
              <input
                type="date"
                value={filtroHasta}
                onChange={(e) => setFiltroHasta(e.target.value)}
              />
            </label>
            <button type="button" className="btn-ghost" onClick={handlePrint}>
              🖨 Imprimir
            </button>
          </div>

          <table className="tabla-movimientos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Tratamiento</th>
                <th>Debe</th>
                <th>Haber</th>
                <th>Observación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>{pacPorId[String(m.id_cliente)] || m.id_cliente}</td>
                  <td>
                    {tratamientoPorId[String(m.id_movimiento_tipo)] ||
                      m.id_movimiento_tipo}
                  </td>
                  <td>{m.debe}</td>
                  <td>{m.haber}</td>
                  <td>{m.observaciones}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-mini"
                      onClick={() => setEditing(mapMovimientoToForm(m))}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-mini btn-danger"
                      onClick={() => eliminarMov(m.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {movimientosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {editing && (
            <form className="form" onSubmit={guardarEdicion}>
              <h3>Editar movimiento #{editing.id}</h3>
              <label>
                Fecha
                <input
                  type="date"
                  value={editing.fecha}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, fecha: e.target.value }))
                  }
                />
              </label>
              <label>
                Importe (Debe)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.debe}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, debe: e.target.value }))
                  }
                />
              </label>
              <label>
                Observación
                <textarea
                  rows={2}
                  value={editing.observaciones}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      observaciones: e.target.value,
                    }))
                  }
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`primary ${
                    loadingResumen ? "loading" : ""
                  }`}
                  disabled={loadingResumen}
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
