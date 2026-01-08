// src/pages/Pagos.jsx
import { useEffect, useMemo, useState } from "react";
import { getBackendToken } from "../api/http.js";
import { listarPacientes } from "../api/abmBackend.js";
import {
  crearMovimiento,
  modificarMovimiento,
  eliminarMovimiento,
  emptyMovimientoForm,
  mapMovimientoToForm,
  searchMovimientos,
  listarMovimientoTipos,
} from "../api/movimientosBackend.js";


function buildObs({ sesion, obs }) {
  const cleanObs = String(obs || "").trim();
  const s = String(sesion || "").trim();
  if (!s) return cleanObs;
  return `[SESION: ${s}]${cleanObs ? " " + cleanObs : ""}`.trim();
}

function normalizeMoney(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return "";
  const normalized = txt
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const headers = ["id", "fecha", "paciente", "tipo", "debe", "haber", "saldo", "observaciones"];
  const lines = [headers.map(esc).join(",")];

  for (const r of rows) {
    lines.push(
      [r.id, r.fecha, r.pacienteNombre, r.tipoNombre, r.debe, r.haber, r.saldo, r.observaciones]
        .map(esc)
        .join(",")
    );
  }
  return lines.join("\n");
}

export default function Pagos() {
  const useBackend = !!getBackendToken();

  // Datos base
  const [pacientes, setPacientes] = useState([]);
  const [movimientoTipos, setMovimientoTipos] = useState([]);

  // Filtros
  const [pacienteId, setPacienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // ✅ vacío = sin filtro de tipo
  const [tiposSeleccionados, setTiposSeleccionados] = useState([]);
  const [openTipos, setOpenTipos] = useState(false);

  // Resultados
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [searched, setSearched] = useState(false);

  // Selección / Editor
  const [selectedId, setSelectedId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("new"); // new | edit
  const [sesion, setSesion] = useState("");
  const [form, setForm] = useState(() => emptyMovimientoForm());
  const debeFilled = String(form.debe || "").trim() !== "";
  const haberFilled = String(form.haber || "").trim() !== "";

  // Mapas
  const pacPorId = useMemo(
    () => Object.fromEntries(pacientes.map((p) => [String(p.id), p.nombre])),
    [pacientes]
  );
  const tipoPorId = useMemo(
    () => Object.fromEntries(movimientoTipos.map((t) => [String(t.id), t.tipo])),
    [movimientoTipos]
  );

  useEffect(() => {
    if (!useBackend) return;
    (async () => {
      try {
        const [listPac, listTipos] = await Promise.all([
          listarPacientes().catch(() => []),
          listarMovimientoTipos().catch(() => []),
        ]);

        setPacientes(Array.isArray(listPac) ? listPac : []);

        const tipos = Array.isArray(listTipos) ? listTipos : [];
        // ✅ filtrar bajas (no mostrar)
        setMovimientoTipos(tipos.filter((t) => !t?.baja));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [useBackend]);

  const tiposIds = useMemo(() => movimientoTipos.map((t) => t.id), [movimientoTipos]);

  // Buscar (no trae todo solo: se ejecuta con botón)
  async function buscar() {
    setErr("");
    setSearched(true);

    const idPaciente = pacienteId ? Number(pacienteId) : undefined;
    const fechaDesde = desde || undefined;
    const fechaHasta = hasta || undefined;
    // vacío => sin filtro de tipo
    const tipos = tiposSeleccionados && tiposSeleccionados.length ? tiposSeleccionados : [];

    setLoading(true);
    try {
      // ✅ Si hay 0 tipos seleccionados: 1 request (sin filtro por tipo)
      // ✅ Si hay 1 tipo: 1 request
      // ✅ Si hay N tipos (UI multi): N requests y unimos
      const fetched = [];
      const tiposToFetch = tipos.length ? tipos : [null];

      for (const t of tiposToFetch) {
        const data = await searchMovimientos({
          ...(fechaDesde ? { fecha_desde: fechaDesde } : {}),
          ...(fechaHasta ? { fecha_hasta: fechaHasta } : {}),
          ...(idPaciente !== undefined ? { id_cliente: idPaciente } : {}),
          ...(t !== null ? { id_movimiento_tipo: t } : {}),
        });

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.movimientos)
          ? data.movimientos
          : [];

        fetched.push(...list);
      }

      // de-dupe por id
      const byId = new Map();
      for (const m of fetched) {
        const k = String(m?.id ?? "");
        if (!k) continue;
        if (!byId.has(k)) byId.set(k, m);
      }

      // ✅ no mostrar movimientos dados de baja
      const merged = Array.from(byId.values()).filter((m) => !m?.baja);
      // orden por fecha desc (si existe)
      merged.sort((a, b) => {
        const ta = new Date(a?.fecha || 0).getTime();
        const tb = new Date(b?.fecha || 0).getTime();
        return tb - ta;
      });

      setMovimientos(merged.filter(m => idPaciente === undefined || String(m?.id_cliente ?? m?.id_paciente ?? "") === String(idPaciente)).filter(m => !tipos.length || tipos.includes(m?.id_movimiento_tipo)));
      setSelectedId(null);
    } catch (e) {
      setErr(e.message || "No se pudo buscar movimientos.");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }

  // Totales período (resultado actual)
  const totPeriodo = useMemo(() => {
    let d = 0,
      h = 0;
    for (const m of movimientos) {
      d += Number(m.debe) || 0;
      h += Number(m.haber) || 0;
    }
    return { debe: d, haber: h, saldo: d - h };
  }, [movimientos]);

  // Saldo total (on-demand)
  const [saldoTotal, setSaldoTotal] = useState(null);
  const [saldoTotalLoading, setSaldoTotalLoading] = useState(false);

  async function calcularSaldoTotal() {
    setSaldoTotal(null);

    const idPaciente = pacienteId ? Number(pacienteId) : undefined;
    const tipos = tiposSeleccionados && tiposSeleccionados.length ? tiposSeleccionados : [];

    setSaldoTotalLoading(true);
    try {
      const fetched = [];
      const tiposToFetch = tipos.length ? tipos : [null];

      for (const t of tiposToFetch) {
        const data = await searchMovimientos({
          ...(idPaciente !== undefined ? { id_cliente: idPaciente } : {}),
          ...(t !== null ? { id_movimiento_tipo: t } : {}),
        });

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.movimientos)
          ? data.movimientos
          : [];

        fetched.push(...list);
      }

      // de-dupe por id
      const byId = new Map();
      for (const m of fetched) {
        const k = String(m?.id ?? "");
        if (!k) continue;
        if (!byId.has(k)) byId.set(k, m);
      }

      const list = Array.from(byId.values()).filter((m) => !m?.baja).filter(m => idPaciente === undefined || String(m?.id_cliente ?? m?.id_paciente ?? "") === String(idPaciente)).filter(m => !tipos.length || tipos.includes(m?.id_movimiento_tipo));

      let d = 0,
        h = 0;
      for (const m of list) {
        d += Number(m.debe) || 0;
        h += Number(m.haber) || 0;
      }

      setSaldoTotal({ debe: d, haber: h, saldo: d - h });
    } catch (e) {
      setErr(e.message || "No se pudo calcular saldo total.");
    } finally {
      setSaldoTotalLoading(false);
    }
  }

  const rows = useMemo(() => {
    return movimientos.map((m) => ({
      ...m,
      pacienteNombre:
        pacPorId[String(m?.id_cliente ?? m?.id_paciente)] ||
        m?.paciente_nombre ||
        m?.cliente_nombre ||
        "",
      tipoNombre: tipoPorId[String(m.id_movimiento_tipo)] || m.id_movimiento_tipo,
    }));
  }, [movimientos, pacPorId, tipoPorId]);

  function onNuevo() {
    setEditorMode("new");
    const base = emptyMovimientoForm();
    base.id_cliente = pacienteId || "";
    base.id_movimiento_tipo = tiposSeleccionados[0] ?? "";
    setForm(base);
    setSesion("");
    setEditorOpen(true);
  }

  function onAbrir() {
    const m = movimientos.find((x) => x.id === selectedId);
    if (!m) return;
    setEditorMode("edit");
    setForm(mapMovimientoToForm(m));
    setSesion("");
    setEditorOpen(true);
  }

  async function onBaja() {
    const m = movimientos.find((x) => x.id === selectedId);
    if (!m) return;

    const ok = window.confirm(`¿Dar de baja/eliminar el movimiento #${m.id}?`);
    if (!ok) return;

    setLoading(true);
    try {
      await eliminarMovimiento(m.id);
      await buscar();
    } catch (e) {
      setErr(e.message || "No se pudo eliminar el movimiento.");
    } finally {
      setLoading(false);
    }
  }

  function onExportar() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${pacienteId || "sin_paciente"}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function imprimirTablaMovimientos() {
    if (!rows.length) return;

    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;

    const html = `
      <html>
        <head>
          <title>Resumen de Movimientos</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 16px; }
            h2 { margin-bottom: 4px; }
            .muted { color: #666; font-size: 12px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
            th { background: #f2f2f2; }
            .totales { margin-top: 12px; display: flex; justify-content: flex-end; gap: 16px; font-size: 13px; }
          </style>
        </head>
        <body>
          <h2>Movimientos</h2>
          <div class="muted">${pacienteId ? `Paciente: ${pacPorId[String(pacienteId)] || pacienteId}` : "Todos los pacientes"}</div>

          <table>
            <thead>
              <tr>
                <th>ID movimiento</th>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Tipo de movimiento</th>
                <th>Debe</th>
                <th>Haber</th>
                <th>Saldo</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (r) => `
                <tr>
                  <td>${r.id ?? ""}</td>
                  <td>${r.fecha || ""}</td>
                  <td>${r.pacienteNombre || ""}</td>
                  <td>${r.tipoNombre}</td>
                  <td>${r.debe ?? ""}</td>
                  <td>${r.haber ?? ""}</td>
                  <td>${r.saldo ?? ""}</td>
                  <td>${r.observaciones ?? ""}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totales">
            <strong>Debe: $${totPeriodo.debe.toLocaleString("es-AR")}</strong>
            <strong>Haber: $${totPeriodo.haber.toLocaleString("es-AR")}</strong>
            <strong>Saldo: $${totPeriodo.saldo.toLocaleString("es-AR")}</strong>
          </div>
        </body>
      </html>
    `;

    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  async function guardarEditor(e) {
    e.preventDefault();
    setErr("");

    if (!form.id_cliente || !form.fecha || !form.id_movimiento_tipo) {
      setErr("Completá Paciente, Fecha y Tipo.");
      return;
    }

    const debeN = normalizeMoney(form.debe);
    const haberN = normalizeMoney(form.haber);

    const dFilled = String(form.debe || "").trim() !== "";
    const hFilled = String(form.haber || "").trim() !== "";

    if (!dFilled && !hFilled) {
      setErr("Completá Debe o Haber (uno solo).");
      return;
    }
    if (dFilled && hFilled) {
      setErr("No podés completar Debe y Haber a la vez.");
      return;
    }
    if (dFilled && (!Number.isFinite(debeN) || debeN <= 0)) {
      setErr("Ingresá un valor válido en Debe.");
      return;
    }
    if (hFilled && (!Number.isFinite(haberN) || haberN <= 0)) {
      setErr("Ingresá un valor válido en Haber.");
      return;
    }

    const obs = buildObs({ sesion, obs: form.observaciones });

    const payload = {
      ...form,
      // ✅ backend usa id_cliente
      id_cliente: Number(form.id_cliente),
      id_movimiento_tipo: Number(form.id_movimiento_tipo),
      debe: dFilled ? debeN : 0,
      haber: hFilled ? haberN : 0,
      observaciones: obs,
      saldo: (dFilled ? debeN : 0) - (hFilled ? haberN : 0),
      fecha_vencimiento: form.fecha_vencimiento || form.fecha,
    };

    setLoading(true);
    try {
      if (editorMode === "new") await crearMovimiento(payload);
      else await modificarMovimiento(payload);

      setEditorOpen(false);
      await buscar();
    } catch (e2) {
      setErr(e2.message || "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  if (!useBackend) {
    return (
      <div className="page pagos-page">
        <main className="container pagos-main" style={{ padding: "18px 0" }}>
          <div className="card">
            <h2>ABM Pagos</h2>
            <p className="muted">Iniciá sesión contra el backend para usar el ABM de pagos.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page pagos-page">

      <main className="container pagos-main" style={{ padding: "18px 0" }}>
        {/* Barra superior de filtros (layout fino) */}
          <div className="pagos-filtros-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr auto auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <label>Paciente</label>
              <select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
                <option value="">-- Seleccionar paciente --</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Fecha desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>

            <div>
              <label>Fecha hasta</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>

            <button type="button" className="btn-ghost" onClick={() => setOpenTipos(true)}>
              Tipos ▾
            </button>

            <button
              type="button"
              className={`primary ${loading ? "loading" : ""}`}
              onClick={buscar}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {err && (
            <div className="alert error" style={{ marginTop: 10 }}>
              {err}
            </div>
          )}

        {/* Layout central: grilla + acciones */} 
        <div className="pagos-layout">
          {/* Grilla */} 
          <div className="card" style={{ overflow: "auto" }}>
            <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Movimientos</h2>
              <div className="muted" style={{ fontSize: 13 }}>
                {pacienteId
                  ? `Paciente: ${pacPorId[String(pacienteId)] || pacienteId}`
                  : "Todos los pacientes"}
              </div>
            </div>

            <table className="tabla-movimientos" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>ID movimiento</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Tipo de movimiento</th>
                  <th>Debe</th>
                  <th>Haber</th>
                  <th>Saldo</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {!searched && (
                  <tr>
                    <td colSpan={8} className="muted">
                      Usá los filtros (opcional) y tocá Buscar.
                    </td>
                  </tr>
                )}

                {searched && !loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted">
                      No hay movimientos para los filtros actuales.
                    </td>
                  </tr>
                )}

                {rows.map((m) => {
                  const selected = m.id === selectedId;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      style={{
                        cursor: "pointer",
                        background: selected ? "rgba(38,132,254,0.10)" : "transparent",
                      }}
                    >
                      <td>{m.id}</td>
                      <td>{m.fecha || ""}</td>
                      <td>{m.pacienteNombre || ""}</td>
                      <td>{m.tipoNombre}</td>
                      <td>{m.debe ?? ""}</td>
                      <td>{m.haber ?? ""}</td>
                      <td>{m.saldo ?? ""}</td>
                      <td
                        style={{
                          maxWidth: 360,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.observaciones ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sidebar */}
          <div className="card pagos-tabla" style={{ height: "fit-content" }}>
            <h3 style={{ marginTop: 0 }}>Acciones</h3>

            <div style={{ display: "grid", gap: 8 }}>
              <button className="primary" type="button" onClick={onNuevo} disabled={!pacienteId || loading}>
                Nuevo
              </button>

              <button className="btn-ghost" type="button" onClick={onAbrir} disabled={!selectedId || loading}>
                Abrir
              </button>

              <button className="btn-ghost" type="button" onClick={onBaja} disabled={!selectedId || loading}>
                Baja
              </button>

              <button className="btn-ghost" type="button" onClick={onExportar} disabled={rows.length === 0}>
                Exportar CSV
              </button>
            </div>

            <hr style={{ margin: "12px 0", opacity: 0.2 }} />

            <h3 style={{ marginTop: 0 }}>Reporte</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={imprimirTablaMovimientos}
                disabled={rows.length === 0}
              >
                Imprimir tabla
              </button>
            </div>

            <hr style={{ margin: "12px 0", opacity: 0.2 }} />

            <h3 style={{ marginTop: 0 }}>Totales</h3>

            <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <span className="muted">Debe período</span>
                <strong>${totPeriodo.debe.toLocaleString("es-AR")}</strong>
              </div>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <span className="muted">Haber período</span>
                <strong>${totPeriodo.haber.toLocaleString("es-AR")}</strong>
              </div>
              <div className="inline" style={{ justifyContent: "space-between" }}>
                <span className="muted">Saldo período</span>
                <strong>${totPeriodo.saldo.toLocaleString("es-AR")}</strong>
              </div>

              <button
                className="btn-ghost"
                type="button"
                onClick={calcularSaldoTotal}
                disabled={saldoTotalLoading}
                style={{ marginTop: 6 }}
              >
                {saldoTotalLoading ? "Calculando..." : "Calcular saldo total"}
              </button>

              {saldoTotal && (
                <>
                  <div className="inline" style={{ justifyContent: "space-between", marginTop: 6 }}>
                    <span className="muted">Saldo total</span>
                    <strong>${saldoTotal.saldo.toLocaleString("es-AR")}</strong>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    (Sin rango de fechas, ${pacienteId ? "mismo paciente" : "todos los pacientes"}/tipos)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Editor modal */}
      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-head">
              <h3 style={{ margin: 0 }}>
                {editorMode === "new" ? "Nuevo movimiento" : `Editar movimiento #${form.id}`}
              </h3>
              <button className="btn-ghost" onClick={() => setEditorOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={guardarEditor} className="form" style={{ marginTop: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
                <label style={{ margin: 0 }}>
                  Paciente
                  <select
                    value={form.id_cliente}
                    onChange={(e) => setForm((s) => ({ ...s, id_cliente: e.target.value }))}
                  >
                    <option value="">-- Seleccionar --</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ margin: 0 }}>
                  Fecha
                  <input type="date" value={form.fecha} onChange={(e) => setForm((s) => ({ ...s, fecha: e.target.value }))} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10, marginTop: 10 }}>
                <label style={{ margin: 0 }}>
                  Tipo
                  <select
                    value={form.id_movimiento_tipo}
                    onChange={(e) => setForm((s) => ({ ...s, id_movimiento_tipo: e.target.value }))}
                  >
                    <option value="">-- Seleccionar --</option>
                    {movimientoTipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tipo}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ margin: 0 }}>
                  Sesión #
                  <input type="number" min="1" value={sesion} onChange={(e) => setSesion(e.target.value)} placeholder="Ej: 7" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                <label style={{ margin: 0 }}>
                  Debe
                  <input
                    type="text"
                    value={form.debe}
                    disabled={haberFilled}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, debe: e.target.value, haber: e.target.value.trim() ? "" : s.haber }))
                    }
                    placeholder="Ej: 1500"
                  />
                </label>

                <label style={{ margin: 0 }}>
                  Haber
                  <input
                    type="text"
                    value={form.haber}
                    disabled={debeFilled}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, haber: e.target.value, debe: e.target.value.trim() ? "" : s.debe }))
                    }
                    placeholder="Ej: 1500"
                  />
                </label>
              </div>

              <label style={{ marginTop: 10 }}>
                Observaciones
                <textarea
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditorOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`primary ${loading ? "loading" : ""}`} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tipos */}
      {openTipos && (
  <div className="modal-overlay" onClick={() => setOpenTipos(false)}>
    <div
      className="card modal pagos-tipos-modal"
      onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 520 }}
    >
      <div className="modal-head">
        <h3 style={{ margin: 0 }}>Tipos de movimiento</h3>
        <button className="btn-ghost" type="button" onClick={() => setOpenTipos(false)}>
          ✕
        </button>
      </div>

      <div className="pagos-tipos-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setTiposSeleccionados(tiposIds)}
        >
          Todos
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => setTiposSeleccionados([])}
        >
          Ninguno
        </button>
      </div>

      <div className="pagos-tipos-list">
        {movimientoTipos.map((t) => {
          const checked = tiposSeleccionados.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`pagos-tipos-item ${checked ? "is-on" : ""}`}
              onClick={() => {
                setTiposSeleccionados((prev) => {
                  if (prev.includes(t.id)) return prev.filter((x) => x !== t.id);
                  return [...prev, t.id];
                });
              }}
            >
              <input
                className="pagos-tipos-checkbox"
                type="checkbox"
                checked={checked}
                readOnly
              />
              <span className="pagos-tipos-label">{t.tipo}</span>
            </button>
          );
        })}
      </div>

      <div className="modal-actions">
        <button type="button" className="primary" onClick={() => setOpenTipos(false)}>
          Aplicar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
