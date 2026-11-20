// src/api/movimientosBackend.js
import { httpJSON } from "./http.js";

// =========================================================
// Helpers
// =========================================================

/**
 * Normaliza cualquier fecha del backend a "YYYY-MM-DD".
 * Acepta "2025-03-10", "2025-03-10T00:00:00.000Z", "10/03/2025" o Date.
 * Devuelve "" si no se puede interpretar.
 */
export function toYMD(value) {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  // ISO (con o sin hora): tomamos la parte de fecha tal cual, sin pasar por
  // new Date() para no correr el día por zona horaria (UTC-3).
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/yyyy
  const ar = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ar) return `${ar[3]}-${ar[2].padStart(2, "0")}-${ar[1].padStart(2, "0")}`;
  return "";
}

/** Hoy en hora local (no UTC) como "YYYY-MM-DD". */
export function todayYMD() {
  return toYMD(new Date());
}

export function emptyMovimientoForm() {
  return {
    id: null,
    id_movimiento_tipo: "",
    fecha: todayYMD(),
    fecha_vencimiento: todayYMD(),
    debe: "",
    haber: "",
    baja: false,
    observaciones: "",
    // ✅ Según tu swagger/backend: id_cliente (NO id_paciente)
    id_cliente: "",
    // método de pago (solo Haber) -> orígenes de movimiento
    id_movimiento_origen: "",
    saldo: 0,
  };
}

export function mapMovimientoToForm(m) {
  return {
    id: m?.id ?? null,
    id_movimiento_tipo: m?.id_movimiento_tipo ?? "",
    // input type="date" solo acepta YYYY-MM-DD
    fecha: toYMD(m?.fecha),
    fecha_vencimiento: toYMD(m?.fecha_vencimiento ?? m?.fecha),
    debe: m?.debe ?? "",
    haber: m?.haber ?? "",
    baja: !!m?.baja,
    observaciones: m?.observaciones ?? "",
    // compat: si algún response viejo viene como id_paciente
    id_cliente: m?.id_cliente ?? m?.id_paciente ?? "",
    id_movimiento_origen: m?.id_movimiento_origen ?? m?.id_origen ?? "",
    saldo: m?.saldo ?? 0,
  };
}

// =========================================================
// API (alineado al swagger que me pasaste)
// =========================================================

/**
 * GET /API/movimientos
 * Filtros (opcionales):
 * - id_cliente
 * - fecha_desde
 * - fecha_hasta
 * - id_movimiento_tipo
 * - id_movimiento_origen (método de pago)
 */
export async function listarMovimientos(params = {}) {
  const qs = new URLSearchParams();

  const fechaDesde = (params.fecha_desde ?? params.desde ?? "").toString().trim();
  const fechaHasta = (params.fecha_hasta ?? params.hasta ?? "").toString().trim();

  const idClienteRaw =
    params.id_cliente ?? params.idCliente ?? params.id_paciente ?? params.idPaciente;

  const idTipoRaw =
    params.id_movimiento_tipo ?? params.idMovimientoTipo ?? params.id_tipo ?? params.idTipo;

  const idOrigenRaw = params.id_movimiento_origen ?? params.idMovimientoOrigen;

  if (fechaDesde) qs.set("fecha_desde", fechaDesde);
  if (fechaHasta) qs.set("fecha_hasta", fechaHasta);

  if (idClienteRaw !== undefined && idClienteRaw !== null && String(idClienteRaw) !== "") {
    qs.set("id_cliente", String(idClienteRaw));
  }

  if (idTipoRaw !== undefined && idTipoRaw !== null && String(idTipoRaw) !== "") {
    qs.set("id_movimiento_tipo", String(idTipoRaw));
  }

  if (idOrigenRaw !== undefined && idOrigenRaw !== null && String(idOrigenRaw) !== "") {
    qs.set("id_movimiento_origen", String(idOrigenRaw));
  }

  const query = qs.toString();
  const path = query ? `/API/movimientos?${query}` : "/API/movimientos";
  return httpJSON(path, { method: "GET" });
}

/** GET /API/movimiento/{id} */
export async function obtenerMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, { method: "GET" });
}

/** POST /API/movimiento */
export async function crearMovimiento(payload) {
  return httpJSON("/API/movimiento", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /API/movimiento (body lleva id) */
export async function modificarMovimiento(payload) {
  if (!payload?.id) throw new Error("Falta id para modificar movimiento.");
  return httpJSON("/API/movimiento", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /API/movimiento/{id} */
export async function eliminarMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, { method: "DELETE" });
}

/** GET /API/movimiento_tipos */
export async function listarMovimientoTipos() {
  return httpJSON("/API/movimiento_tipos", { method: "GET" });
}

/** Alias (para no refactorizar imports viejos) */
export async function searchMovimientos(params = {}) {
  return listarMovimientos(params);
}

/**
 * Métodos de pago predeterminados. Se usan como lista fija si la API de
 * orígenes no responde, y como "faltantes" sugeridos en el ABM.
 */
export const METODOS_PAGO_DEFAULT = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "MercadoPago - Milton Neffen",
  "MercadoPago - Ignacio Pioli",
];

// =========================================================
// Orígenes de movimiento = "Metodo de pago" (Efectivo, Transferencia, MercadoPago…)
// GET devuelve { id, origen, descripcion, baja }.
// POST/PUT: el backend nuevo lee `origen`; el publicado hasta ahora lee `tipo`.
// Se mandan los dos con el mismo valor (se puede sacar `tipo` cuando el cambio esté en producción).
// En el front se normaliza a { id, tipo, descripcion, baja } (tipo = nombre que se muestra).
// =========================================================

// Rutas verificadas contra el backend (GET lista y GET /{id}).
const ORIGENES_PATH = "/API/movimiento_origenes"; // GET lista
const ORIGEN_PATH = "/API/movimiento_origen"; //    GET/DELETE /{id}, POST, PUT

/** El SP puede devolver un array directo o envuelto ({ data | origenes | result }). */
function unwrapList(data) {
  if (Array.isArray(data)) return data;
  for (const k of ["data", "origenes", "movimiento_origenes", "result", "rows"]) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

const normOrigen = (o) => ({ ...o, tipo: o?.origen ?? o?.tipo ?? "", descripcion: o?.descripcion ?? "" });

/** GET lista de orígenes (métodos de pago). */
export async function listarMovimientoOrigenes() {
  return unwrapList(await httpJSON(ORIGENES_PATH, { method: "GET" })).map(normOrigen);
}

/** GET /{id} */
export async function obtenerMovimientoOrigen(id) {
  return normOrigen(await httpJSON(`${ORIGEN_PATH}/${id}`, { method: "GET" }));
}

/** POST { origen, descripcion } */
export async function crearMovimientoOrigen({ tipo, descripcion = "" }) {
  return httpJSON(ORIGEN_PATH, { method: "POST", body: { origen: tipo, tipo, descripcion } });
}

/** PUT { id, origen, descripcion } */
export async function modificarMovimientoOrigen({ id, tipo, descripcion = "" }) {
  if (!id) throw new Error("Falta id para modificar el método de pago.");
  return httpJSON(ORIGEN_PATH, { method: "PUT", body: { id, origen: tipo, tipo, descripcion } });
}

/** DELETE /{id} (baja lógica) */
export async function eliminarMovimientoOrigen(id) {
  return httpJSON(`${ORIGEN_PATH}/${id}`, { method: "DELETE" });
}
