// src/pages/Pagos.jsx
// Sección "Pagos": movimientos (cargos/pagos) de pacientes con filtros, totales y ABM.
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
  toYMD,
} from "../api/movimientosBackend.js";
import Modal from "../components/ui/Modal.jsx";
import Button, { IconButton } from "../components/ui/Button.jsx";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  Field,
  PageHeader,
  SkeletonRows,
  StatCard,
} from "../components/ui/Display.jsx";
import { useConfirm, useToast } from "../components/ui/feedback.js";

/* =========================================================
   Datos
   ========================================================= */

/**
 * Trae movimientos del backend y aplica TODOS los filtros también del lado
 * del cliente. El backend no respeta de forma confiable los query params
 * (por eso ya se re-filtraba paciente y tipo); las fechas no tenían ese
 * respaldo y por eso "Fecha desde/hasta" no filtraban.
 *
 * Fechas: se comparan como strings "YYYY-MM-DD" (orden lexicográfico = orden
 * cronológico), ambas inclusivas, sin pasar por Date para evitar corrimientos
 * por zona horaria.
 */
async function fetchMovimientosFiltrados({ idPaciente, tipos = [], desde = "", hasta = "" }) {
  const tiposToFetch = tipos.length ? tipos : [null];
  const fetched = [];

  for (const t of tiposToFetch) {
    const data = await searchMovimientos({
      ...(desde ? { fecha_desde: desde } : {}),
      ...(hasta ? { fecha_hasta: hasta } : {}),
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
    if (k && !byId.has(k)) byId.set(k, m);
  }

  const tiposStr = tipos.map(String);

  return Array.from(byId.values())
    .filter((m) => !m?.baja)
    .filter(
      (m) =>
        idPaciente === undefined ||
        String(m?.id_cliente ?? m?.id_paciente ?? "") === String(idPaciente)
    )
    .filter((m) => !tiposStr.length || tiposStr.includes(String(m?.id_movimiento_tipo)))
    .filter((m) => {
      if (!desde && !hasta) return true;
      const f = toYMD(m?.fecha);
      if (!f) return false; // sin fecha válida no puede estar dentro de un rango
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    })
    .sort(
      (a, b) =>
        toYMD(b?.fecha).localeCompare(toYMD(a?.fecha)) || (Number(b?.id) || 0) - (Number(a?.id) || 0)
    );
}

function sumTotals(list) {
  let debe = 0;
  let haber = 0;
  for (const m of list) {
    debe += Number(m.debe) || 0;
    haber += Number(m.haber) || 0;
  }
  return { debe, haber, saldo: debe - haber };
}

/* =========================================================
   Formato
   ========================================================= */

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const fmtMoney = (n) => money.format(Number(n) || 0);

/** "YYYY-MM-DD" -> "dd/mm/yyyy" para mostrar */
function fmtFecha(value) {
  const ymd = toYMD(value);
  if (!ymd) return value ? String(value) : "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

/** Importe escrito en formato AR ("1.500,50") -> número. "" si vacío, NaN si inválido. */
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

/** Número del backend (1500.5) -> texto editable en formato AR ("1.500,5"). */
function toMoneyInput(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "";
  return v.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

/** Observación guardada como "[SESION: 7] texto" <-> { sesion, obs } */
function buildObs({ sesion, obs }) {
  const cleanObs = String(obs || "").trim();
  const s = String(sesion || "").trim();
  if (!s) return cleanObs;
  return `[SESION: ${s}]${cleanObs ? " " + cleanObs : ""}`.trim();
}
function splitObs(raw) {
  const m = String(raw || "").match(/^\[SESION:\s*([^\]]*)\]\s*/);
  if (!m) return { sesion: "", obs: String(raw || "") };
  return { sesion: m[1].trim(), obs: String(raw).slice(m[0].length) };
}

const escHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const headers = ["id", "fecha", "paciente", "tipo", "debe", "haber", "saldo", "observaciones"];
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) {
    lines.push(
      [r.id, toYMD(r.fecha), r.pacienteNombre, r.tipoNombre, r.debe, r.haber, r.saldo, r.observaciones]
        .map(esc)
        .join(",")
    );
  }
  return lines.join("\n");
}

/* =========================================================
   Página
   ========================================================= */

const EMPTY_EDITOR = { kind: "debe", importe: "", sesion: "", obs: "" };

export default function Pagos() {
  const useBackend = !!getBackendToken();
  const toast = useToast();
  const confirm = useConfirm();

  // Datos base
  const [pacientes, setPacientes] = useState([]);
  const [movimientoTipos, setMovimientoTipos] = useState([]);

  // Filtros (vacío = sin filtro)
  const [pacienteId, setPacienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tiposSeleccionados, setTiposSeleccionados] = useState([]);
  const [openTipos, setOpenTipos] = useState(false);

  // Resultados
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [searched, setSearched] = useState(false);

  // Saldo total (on-demand)
  const [saldoTotal, setSaldoTotal] = useState(null);
  const [saldoTotalLoading, setSaldoTotalLoading] = useState(false);

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(() => emptyMovimientoForm());
  const [editor, setEditor] = useState(EMPTY_EDITOR);
  const [editorErr, setEditorErr] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!form.id;

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
      const [listPac, listTipos] = await Promise.all([
        listarPacientes().catch(() => []),
        listarMovimientoTipos().catch(() => []),
      ]);
      setPacientes(
        Array.isArray(listPac)
          ? [...listPac].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
          : []
      );
      // no mostrar tipos dados de baja
      setMovimientoTipos((Array.isArray(listTipos) ? listTipos : []).filter((t) => !t?.baja));
    })();
  }, [useBackend]);

  // ---------- Búsqueda ----------
  async function buscar(e) {
    e?.preventDefault();
    setErr("");

    if (desde && hasta && desde > hasta) {
      setErr("\"Desde\" no puede ser posterior a \"Hasta\".");
      return;
    }

    setSearched(true);
    setLoading(true);
    try {
      const list = await fetchMovimientosFiltrados({
        idPaciente: pacienteId ? Number(pacienteId) : undefined,
        tipos: tiposSeleccionados,
        desde,
        hasta,
      });
      setMovimientos(list);
    } catch (e2) {
      setErr(e2.message || "No se pudo buscar movimientos.");
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }

  function limpiarFiltros() {
    setPacienteId("");
    setDesde("");
    setHasta("");
    setTiposSeleccionados([]);
    setSaldoTotal(null);
    setErr("");
  }

  const hasFilters = !!(pacienteId || desde || hasta || tiposSeleccionados.length);

  // El saldo total depende de paciente/tipos: se guarda con esa "clave"
  // y deja de mostrarse si los filtros cambian.
  const saldoKey = `${pacienteId}|${tiposSeleccionados.join(",")}`;
  const saldoTotalVigente = saldoTotal?.key === saldoKey ? saldoTotal : null;

  async function calcularSaldoTotal() {
    setSaldoTotalLoading(true);
    try {
      // mismos filtros de paciente/tipo, SIN rango de fechas
      const list = await fetchMovimientosFiltrados({
        idPaciente: pacienteId ? Number(pacienteId) : undefined,
        tipos: tiposSeleccionados,
      });
      setSaldoTotal({ ...sumTotals(list), key: saldoKey });
    } catch (e) {
      toast.error(e.message || "No se pudo calcular el saldo total.");
    } finally {
      setSaldoTotalLoading(false);
    }
  }

  const totPeriodo = useMemo(() => sumTotals(movimientos), [movimientos]);

  const rows = useMemo(
    () =>
      movimientos.map((m) => ({
        ...m,
        pacienteNombre:
          pacPorId[String(m?.id_cliente ?? m?.id_paciente)] ||
          m?.paciente_nombre ||
          m?.cliente_nombre ||
          "",
        tipoNombre: tipoPorId[String(m.id_movimiento_tipo)] || m.id_movimiento_tipo,
      })),
    [movimientos, pacPorId, tipoPorId]
  );

  // ---------- Editor ----------
  function abrirNuevo() {
    const base = emptyMovimientoForm();
    base.id_cliente = pacienteId || "";
    base.id_movimiento_tipo = tiposSeleccionados.length === 1 ? tiposSeleccionados[0] : "";
    setForm(base);
    setEditor(EMPTY_EDITOR);
    setEditorErr("");
    setEditorOpen(true);
  }

  function abrirEditar(m) {
    const f = mapMovimientoToForm(m);
    const { sesion, obs } = splitObs(f.observaciones);
    const esDebe = (Number(f.debe) || 0) > 0 || !(Number(f.haber) > 0);
    setForm(f);
    setEditor({
      kind: esDebe ? "debe" : "haber",
      importe: toMoneyInput(esDebe ? f.debe : f.haber),
      sesion,
      obs,
    });
    setEditorErr("");
    setEditorOpen(true);
  }

  async function guardarEditor(e) {
    e.preventDefault();
    setEditorErr("");

    if (!form.id_cliente || !form.fecha || !form.id_movimiento_tipo) {
      setEditorErr("Completá paciente, fecha y tipo de movimiento.");
      return;
    }
    const importe = normalizeMoney(editor.importe);
    if (importe === "" || !Number.isFinite(importe) || importe <= 0) {
      setEditorErr("Ingresá un importe válido mayor a 0 (ej: 15.000,50).");
      return;
    }

    const debe = editor.kind === "debe" ? importe : 0;
    const haber = editor.kind === "haber" ? importe : 0;

    const payload = {
      ...form,
      id_cliente: Number(form.id_cliente), // backend usa id_cliente
      id_movimiento_tipo: Number(form.id_movimiento_tipo),
      debe,
      haber,
      saldo: debe - haber,
      observaciones: buildObs({ sesion: editor.sesion, obs: editor.obs }),
      fecha_vencimiento: form.fecha_vencimiento || form.fecha,
    };

    setSaving(true);
    try {
      if (isEdit) await modificarMovimiento(payload);
      else await crearMovimiento(payload);

      setEditorOpen(false);
      toast.success(isEdit ? "Movimiento actualizado." : "Movimiento registrado.");
      await buscar();
    } catch (e2) {
      setEditorErr(e2.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(m) {
    const ok = await confirm({
      title: `¿Eliminar el movimiento #${m.id}?`,
      message: `${m.pacienteNombre || "Paciente"} · ${fmtFecha(m.fecha)} · ${fmtMoney(
        Number(m.debe) || Number(m.haber)
      )}. El movimiento se da de baja y deja de sumar en los saldos.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;

    try {
      await eliminarMovimiento(m.id);
      toast.success(`Movimiento #${m.id} eliminado.`);
      await buscar();
    } catch (e) {
      toast.error(e.message || "No se pudo eliminar el movimiento.");
    }
  }

  // ---------- Exportar / imprimir ----------
  function exportarCsv() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${pacienteId || "todos"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.info(`Se exportaron ${rows.length} movimientos.`);
  }

  function imprimir() {
    if (!rows.length) return;
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) {
      toast.warning("El navegador bloqueó la ventana de impresión.");
      return;
    }
    const filtroTxt = [
      pacienteId ? `Paciente: ${pacPorId[String(pacienteId)] || pacienteId}` : "Todos los pacientes",
      desde || hasta ? `Período: ${desde ? fmtFecha(desde) : "…"} – ${hasta ? fmtFecha(hasta) : "…"}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    win.document.write(`
      <html><head><title>Movimientos</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:16px;color:#1b2a3d}
        h2{margin:0 0 4px} .muted{color:#5b7290;font-size:12px;margin-bottom:12px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border-bottom:1px solid #dce6f3;padding:6px 8px;font-size:12px;text-align:left}
        th{background:#f3f7fd;text-transform:uppercase;font-size:10px;letter-spacing:.05em;color:#5b7290}
        .num{text-align:right}
        .tot{margin-top:12px;display:flex;justify-content:flex-end;gap:16px;font-size:13px}
      </style></head><body>
        <h2>Movimientos</h2>
        <div class="muted">${escHtml(filtroTxt)}</div>
        <table><thead><tr>
          <th>#</th><th>Fecha</th><th>Paciente</th><th>Tipo</th>
          <th class="num">Debe</th><th class="num">Haber</th><th class="num">Saldo</th><th>Observaciones</th>
        </tr></thead><tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${escHtml(r.id)}</td><td>${escHtml(fmtFecha(r.fecha))}</td>
              <td>${escHtml(r.pacienteNombre)}</td><td>${escHtml(r.tipoNombre)}</td>
              <td class="num">${Number(r.debe) ? fmtMoney(r.debe) : ""}</td>
              <td class="num">${Number(r.haber) ? fmtMoney(r.haber) : ""}</td>
              <td class="num">${fmtMoney(r.saldo)}</td><td>${escHtml(r.observaciones)}</td>
            </tr>`
          )
          .join("")}
        </tbody></table>
        <div class="tot">
          <strong>Debe: ${fmtMoney(totPeriodo.debe)}</strong>
          <strong>Haber: ${fmtMoney(totPeriodo.haber)}</strong>
          <strong>Saldo: ${fmtMoney(totPeriodo.saldo)}</strong>
        </div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  // ---------- Render ----------
  if (!useBackend) {
    return (
      <div className="gt-page">
        <PageHeader title="Pagos" />
        <Alert variant="warning">Iniciá sesión contra el backend para usar el módulo de pagos.</Alert>
      </div>
    );
  }

  const tiposLabel = !tiposSeleccionados.length
    ? "Todos los tipos"
    : tiposSeleccionados.length === 1
    ? tipoPorId[String(tiposSeleccionados[0])] || "1 tipo"
    : `${tiposSeleccionados.length} tipos`;

  return (
    <div className="gt-page">
      <PageHeader
        title="Movimientos y pagos"
        subtitle={
          pacienteId
            ? `Cuenta de ${pacPorId[String(pacienteId)] || "paciente"}`
            : "Cargos y cobros de todos los pacientes"
        }
        actions={
          <>
            <Button icon="download" onClick={exportarCsv} disabled={!rows.length}>
              Exportar CSV
            </Button>
            <Button icon="print" onClick={imprimir} disabled={!rows.length}>
              Imprimir
            </Button>
            <Button variant="primary" icon="add" onClick={abrirNuevo}>
              Nuevo movimiento
            </Button>
          </>
        }
      />

      {/* Totales */}
      <div className="ui-stats">
        <StatCard label="Debe del período" value={fmtMoney(totPeriodo.debe)} icon="arrow_upward" tone="danger" />
        <StatCard label="Haber del período" value={fmtMoney(totPeriodo.haber)} icon="arrow_downward" tone="success" />
        <StatCard
          label="Saldo del período"
          value={fmtMoney(totPeriodo.saldo)}
          icon="account_balance_wallet"
          tone={totPeriodo.saldo > 0 ? "danger" : totPeriodo.saldo < 0 ? "success" : "primary"}
          hint={totPeriodo.saldo > 0 ? "Pendiente de cobro" : totPeriodo.saldo < 0 ? "Saldo a favor" : "Sin saldo"}
        />
        <StatCard
          label="Saldo total histórico"
          value={saldoTotalVigente ? fmtMoney(saldoTotalVigente.saldo) : "—"}
          icon="savings"
          tone="warning"
        >
          <button
            type="button"
            className="ui-link-btn"
            style={{ fontSize: ".8rem", marginTop: 2, alignSelf: "flex-start" }}
            onClick={calcularSaldoTotal}
            disabled={saldoTotalLoading}
          >
            {saldoTotalLoading ? "Calculando…" : saldoTotalVigente ? "Recalcular" : "Calcular"}
          </button>
        </StatCard>
      </div>

      {/* Filtros */}
      <Card>
        <form onSubmit={buscar} className="ui-form-grid pagos-filtros">
          <Field label="Paciente" className="pagos-filtros__pac">
            <select className="ui-input" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Todos los pacientes</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Desde">
            <input
              type="date"
              className="ui-input"
              value={desde}
              max={hasta || undefined}
              onChange={(e) => setDesde(e.target.value)}
            />
          </Field>

          <Field label="Hasta">
            <input
              type="date"
              className="ui-input"
              value={hasta}
              min={desde || undefined}
              onChange={(e) => setHasta(e.target.value)}
            />
          </Field>

          <div className="ui-field">
            <span className="ui-label">Tipo de movimiento</span>
            <button
              type="button"
              className="ui-input pagos-tipos-trigger"
              onClick={() => setOpenTipos(true)}
              aria-haspopup="dialog"
            >
              <span>{tiposLabel}</span>
              <span className="material-symbols-rounded" aria-hidden>
                tune
              </span>
            </button>
          </div>

          <div className="ui-inline pagos-filtros__actions">
            <Button type="submit" variant="primary" icon="search" loading={loading}>
              Buscar
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={limpiarFiltros}>
                Limpiar
              </Button>
            )}
          </div>
        </form>
        {err && (
          <div style={{ marginTop: 14 }}>
            <Alert variant="danger">{err}</Alert>
          </div>
        )}
      </Card>

      {/* Resultados */}
      <Card
        title="Movimientos"
        icon="receipt_long"
        flush
        actions={searched && !loading && <Badge variant="primary">{rows.length} resultados</Badge>}
      >
        {!searched ? (
          <EmptyState
            icon="manage_search"
            title="Buscá movimientos"
            description="Elegí un paciente, un rango de fechas o tipos (todo opcional) y tocá Buscar."
          />
        ) : !loading && rows.length === 0 ? (
          <EmptyState
            icon="receipt_long"
            title="No hay movimientos"
            description="No encontramos movimientos con estos filtros."
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th className="num">Debe</th>
                  <th className="num">Haber</th>
                  <th className="num">Saldo</th>
                  <th>Observaciones</th>
                  <th className="actions" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows rows={6} cols={8} />
                ) : (
                  rows.map((m) => (
                    <tr key={m.id} className="is-clickable" onClick={() => abrirEditar(m)}>
                      <td className="nowrap">
                        {fmtFecha(m.fecha)}
                        <div className="ui-soft" style={{ fontSize: ".75rem" }}>
                          #{m.id}
                        </div>
                      </td>
                      <td>{m.pacienteNombre || <span className="ui-soft">—</span>}</td>
                      <td>
                        <Badge variant="neutral">{m.tipoNombre}</Badge>
                      </td>
                      <td className="num">{Number(m.debe) ? fmtMoney(m.debe) : <span className="ui-soft">—</span>}</td>
                      <td className="num">{Number(m.haber) ? fmtMoney(m.haber) : <span className="ui-soft">—</span>}</td>
                      <td className={`num ${Number(m.saldo) > 0 ? "ui-money-pos" : Number(m.saldo) < 0 ? "ui-money-neg" : ""}`}>
                        {fmtMoney(m.saldo)}
                      </td>
                      <td className="truncate" title={m.observaciones || ""}>
                        {m.observaciones || <span className="ui-soft">—</span>}
                      </td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <IconButton icon="edit" label="Editar" onClick={() => abrirEditar(m)} />
                        <IconButton icon="delete" label="Eliminar" danger onClick={() => eliminar(m)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Editor */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        dismissible={!saving}
        title={isEdit ? `Editar movimiento #${form.id}` : "Nuevo movimiento"}
        subtitle={isEdit ? "Modificá los datos y guardá los cambios." : "Registrá un cargo o un pago del paciente."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="mov-editor" icon="check" loading={saving}>
              {isEdit ? "Guardar cambios" : "Registrar"}
            </Button>
          </>
        }
      >
        <form id="mov-editor" onSubmit={guardarEditor} noValidate>
          <div className="ui-segmented" role="radiogroup" aria-label="Tipo de importe" style={{ marginBottom: 16 }}>
            <button
              type="button"
              role="radio"
              aria-checked={editor.kind === "debe"}
              className={editor.kind === "debe" ? "is-active" : ""}
              onClick={() => setEditor((s) => ({ ...s, kind: "debe" }))}
            >
              <span className="material-symbols-rounded" aria-hidden>arrow_upward</span>
              Cargo (Debe)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={editor.kind === "haber"}
              className={editor.kind === "haber" ? "is-active" : ""}
              onClick={() => setEditor((s) => ({ ...s, kind: "haber" }))}
            >
              <span className="material-symbols-rounded" aria-hidden>arrow_downward</span>
              Pago (Haber)
            </button>
          </div>

          <div className="ui-row-2">
            <Field label="Paciente" required>
              <select
                className="ui-input"
                value={form.id_cliente}
                onChange={(e) => setForm((s) => ({ ...s, id_cliente: e.target.value }))}
              >
                <option value="">Seleccionar…</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha" required>
              <input
                type="date"
                className="ui-input"
                value={form.fecha}
                onChange={(e) => setForm((s) => ({ ...s, fecha: e.target.value }))}
              />
            </Field>
          </div>

          <div className="ui-row-2">
            <Field label="Tipo de movimiento" required>
              <select
                className="ui-input"
                value={form.id_movimiento_tipo}
                onChange={(e) => setForm((s) => ({ ...s, id_movimiento_tipo: e.target.value }))}
              >
                <option value="">Seleccionar…</option>
                {movimientoTipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tipo}
                  </option>
                ))}
              </select>
            </Field>
            <div className="ui-row-2" style={{ marginTop: 0 }}>
              <Field label="Importe" required>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  placeholder="15.000,50"
                  value={editor.importe}
                  onChange={(e) => setEditor((s) => ({ ...s, importe: e.target.value }))}
                />
              </Field>
              <Field label="Sesión #">
                <input
                  type="number"
                  min="1"
                  className="ui-input"
                  placeholder="Ej: 7"
                  value={editor.sesion}
                  onChange={(e) => setEditor((s) => ({ ...s, sesion: e.target.value }))}
                />
              </Field>
            </div>
          </div>

          <Field label="Observaciones">
            <textarea
              className="ui-input"
              rows={3}
              value={editor.obs}
              onChange={(e) => setEditor((s) => ({ ...s, obs: e.target.value }))}
            />
          </Field>

          {editorErr && (
            <div style={{ marginTop: 14 }}>
              <Alert variant="danger">{editorErr}</Alert>
            </div>
          )}
        </form>
      </Modal>

      {/* Selector de tipos */}
      <Modal
        open={openTipos}
        onClose={() => setOpenTipos(false)}
        size="sm"
        title="Tipos de movimiento"
        subtitle="Sin selección = todos los tipos"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTiposSeleccionados([])}>
              Ninguno
            </Button>
            <Button variant="ghost" onClick={() => setTiposSeleccionados(movimientoTipos.map((t) => t.id))}>
              Todos
            </Button>
            <span className="ui-spacer" />
            <Button variant="primary" onClick={() => setOpenTipos(false)}>
              Aplicar
            </Button>
          </>
        }
      >
        {movimientoTipos.length === 0 ? (
          <EmptyState icon="category" title="Sin tipos" description="No hay tipos de movimiento cargados." />
        ) : (
          <div className="ui-checklist">
            {movimientoTipos.map((t) => {
              const on = tiposSeleccionados.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className={`ui-check ${on ? "is-on" : ""}`}
                  onClick={() =>
                    setTiposSeleccionados((prev) =>
                      prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                    )
                  }
                >
                  <span className="ui-check__box">
                    {on && (
                      <span className="material-symbols-rounded" aria-hidden>
                        check
                      </span>
                    )}
                  </span>
                  {t.tipo}
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
