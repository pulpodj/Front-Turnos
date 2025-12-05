// src/ui/PagosPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { getBackendToken } from "../api/http.js";
import {
  listarMovimientos,
  crearMovimiento,
  modificarMovimiento,
  eliminarMovimiento,
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

  const [modo, setModo] = useState("form"); // 'form' | 'resumen'

  // -------- Formulario de nuevo pago --------
  const [form, setForm] = useState({
    pacienteId: "",
    tratamientoId: "",
    fecha: new Date().toISOString().slice(0, 10),
    debe: "",
    observacion: "",
  });
  const [errorForm, setErrorForm] = useState("");
  const [okForm, setOkForm] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);

  // -------- Listados --------
  const [pacientes, setPacientes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [errorResumen, setErrorResumen] = useState("");
  const [loadingResumen, setLoadingResumen] = useState(false);

  // -------- Filtros resumen (POR PACIENTE en el panel) --------
  const [filtroPacienteId, setFiltroPacienteId] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  // -------- Edición --------
  const [editing, setEditing] = useState(null);

  // -------- Carga inicial --------
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

  async function recargarMovimientos() {
    try {
      const mov = await listarMovimientos();
      if (Array.isArray(mov)) setMovimientos(mov);
    } catch (e) {
      console.error(e);
    }
  }

  // -------- Guardar pago con normalización de monto --------
  async function guardarPago(e) {
    e.preventDefault();
    setErrorForm("");
    setOkForm("");

    if (!form.pacienteId || !form.tratamientoId || !form.fecha || !form.debe) {
      setErrorForm("Completá paciente, tratamiento, fecha y monto.");
      return;
    }

    const raw = String(form.debe).trim();
    const normalizado = raw
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^0-9.]/g, "");

    const monto = Number(normalizado);

    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorForm("Ingresá un monto válido en el campo 'Debe'.");
      return;
    }

    setLoadingForm(true);
    try {
      const payload = {
        id_movimiento_tipo: Number(form.tratamientoId),
        fecha: form.fecha,
        fecha_vencimiento: form.fecha,
        debe: monto,
        haber: 0,
        baja: false,
        observaciones: form.observacion,
        id_cliente: Number(form.pacienteId),
        saldo: monto,
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

  // -------- Movimientos filtrados SOLO por paciente + fechas (panel) --------
  const movimientosFiltrados = useMemo(
    () =>
      movimientos.filter((m) => {
        if (!filtroPacienteId) return false; // 👈 sin paciente, no mostramos nada
        if (String(m.id_cliente) !== String(filtroPacienteId)) return false;
        if (filtroDesde && m.fecha < filtroDesde) return false;
        if (filtroHasta && m.fecha > filtroHasta) return false;
        return true;
      }),
    [movimientos, filtroPacienteId, filtroDesde, filtroHasta]
  );

  // Resumen de totales SOLO cuando hay paciente
  const resumenTotales = useMemo(() => {
    if (!filtroPacienteId) {
      return { totalDebe: 0, totalHaber: 0, saldo: 0 };
    }
    let totalDebe = 0;
    let totalHaber = 0;
    for (const m of movimientosFiltrados) {
      const d = Number(m.debe) || 0;
      const h = Number(m.haber) || 0;
      totalDebe += d;
      totalHaber += h;
    }
    const saldo = totalDebe - totalHaber;
    return { totalDebe, totalHaber, saldo };
  }, [movimientosFiltrados, filtroPacienteId]);

  // -------- Imprimir solo el área visible del panel --------
  function handlePrint() {
    const area = document.getElementById("movimientos-print-area");
    if (!area) {
      window.print();
      return;
    }

    const printContents = area.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=650");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Resumen de movimientos</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 16px;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f5f5f5;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  // -------- “Todos”: ventana nueva con TODOS los movimientos --------
  function handleVerTodos() {
    const win = window.open("", "_blank", "width=1000,height=700,scrollbars=yes");
    if (!win) return;

    const rowsHtml = movimientos
      .map((m) => {
        const paciente = pacPorId[String(m.id_cliente)] || m.id_cliente;
        const tratamiento =
          tratamientoPorId[String(m.id_movimiento_tipo)] || m.id_movimiento_tipo;
        return `
          <tr>
            <td>${m.fecha || ""}</td>
            <td>${paciente}</td>
            <td>${tratamiento}</td>
            <td>${m.debe ?? ""}</td>
            <td>${m.haber ?? ""}</td>
            <td>${m.observaciones ?? ""}</td>
          </tr>
        `;
      })
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Todos los movimientos</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              padding: 16px;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 6px 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f5f5f5;
              position: sticky;
              top: 0;
            }
          </style>
        </head>
        <body>
          <h1>Todos los movimientos</h1>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Tratamiento</th>
                <th>Debe</th>
                <th>Haber</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td colspan="6">No hay movimientos registrados.</td></tr>`}
            </tbody>
          </table>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
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
        // ================== FORMULARIO NUEVO PAGO ==================
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
            Tratamiento
            <select
              value={form.tratamientoId}
              onChange={(e) =>
                setForm((s) => ({ ...s, tratamientoId: e.target.value }))
              }
            >
              <option value="">-- Seleccionar --</option>
              {TRATAMIENTOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="inline" style={{ gap: 10 }}>
            <label style={{ flex: 1 }}>
              Fecha
              <input
                type="date"
                value={form.fecha}
                onChange={(e) =>
                  setForm((s) => ({ ...s, fecha: e.target.value }))
                }
              />
            </label>
            <label style={{ flex: 1 }}>
              Importe (Debe)
              <input
                type="text"
                placeholder="Ej: 1.500,00"
                value={form.debe}
                onChange={(e) =>
                  setForm((s) => ({ ...s, debe: e.target.value }))
                }
              />
            </label>
          </div>

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
        // ================== RESUMEN DE MOVIMIENTOS ==================
        <section className="pagos-resumen">
          {errorResumen && <div className="alert error">{errorResumen}</div>}

          {/* Filtros con estilo de formulario */}
          <div className="form" style={{ marginBottom: 8 }}>
            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Paciente
                <select
                  value={filtroPacienteId}
                  onChange={(e) => setFiltroPacienteId(e.target.value)}
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
                Desde
                <input
                  type="date"
                  value={filtroDesde}
                  onChange={(e) => setFiltroDesde(e.target.value)}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={filtroHasta}
                  onChange={(e) => setFiltroHasta(e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Resumen numérico SOLO si hay paciente seleccionado */}
          {filtroPacienteId && (
            <div
              className="inline"
              style={{
                gap: 16,
                marginBottom: 8,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="muted">
                Movimientos:{" "}
                <strong>{movimientosFiltrados.length}</strong>
              </div>
              <div className="inline" style={{ gap: 12, fontSize: 13 }}>
                <span>
                  Debe:{" "}
                  <strong>
                    ${resumenTotales.totalDebe.toLocaleString("es-AR")}
                  </strong>
                </span>
                <span>
                  Haber:{" "}
                  <strong>
                    ${resumenTotales.totalHaber.toLocaleString("es-AR")}
                  </strong>
                </span>
                <span>
                  Saldo:{" "}
                  <strong
                    style={{
                      color:
                        resumenTotales.saldo > 0
                          ? "var(--danger, #c62828)"
                          : resumenTotales.saldo < 0
                          ? "var(--success, #2e7d32)"
                          : "inherit",
                    }}
                  >
                    ${resumenTotales.saldo.toLocaleString("es-AR")}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* ✅ Solo esto se imprime desde el panel */}
          <div id="movimientos-print-area">
            <h1 style={{ display: "none" }}>Resumen de movimientos</h1>
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
                {!filtroPacienteId && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Seleccioná un paciente para ver sus movimientos.
                    </td>
                  </tr>
                )}

                {filtroPacienteId &&
                  movimientosFiltrados.map((m) => (
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
                          className="btn-ghost"
                          onClick={() => setEditing(mapMovimientoToForm(m))}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => eliminarMov(m.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}

                {filtroPacienteId && movimientosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      No hay movimientos para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Botones inferiores: Todos / Imprimir */}
          <div
            className="inline"
            style={{
              gap: 8,
              marginTop: 12,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={handleVerTodos}
            >
              Todos
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handlePrint}
            >
              🖨 Imprimir
            </button>
          </div>

          {/* Form de edición inline */}
          {editing && (
            <form
              className="form"
              onSubmit={guardarEdicion}
              style={{ marginTop: 16 }}
            >
              <h3>Editar movimiento #{editing.id}</h3>
              <div className="inline" style={{ gap: 10 }}>
                <label style={{ flex: 1 }}>
                  Fecha
                  <input
                    type="date"
                    value={editing.fecha}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s, fecha: e.target.value }))
                    }
                  />
                </label>
                <label style={{ flex: 1 }}>
                  Debe
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
                <label style={{ flex: 1 }}>
                  Haber
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.haber}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s, haber: e.target.value }))
                    }
                  />
                </label>
              </div>

              <label>
                Observación
                <textarea
                  rows={2}
                  value={editing.observaciones || ""}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      observaciones: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="inline" style={{ gap: 10 }}>
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
