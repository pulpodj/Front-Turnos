// src/api/movimientosBackend.js
import { httpJSON } from "./http.js";

// =========================================================
// Helpers
// =========================================================

export function emptyMovimientoForm() {
  return {
    id: null,
    id_movimiento_tipo: "",
    fecha: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: new Date().toISOString().slice(0, 10),
    debe: "",
    haber: "",
    baja: false,
    observaciones: "",
    // ✅ Según tu swagger/backend: id_cliente (NO id_paciente)
    id_cliente: "",
    saldo: 0,
  };
}

export function mapMovimientoToForm(m) {
  return {
    id: m?.id ?? null,
    id_movimiento_tipo: m?.id_movimiento_tipo ?? "",
    fecha: m?.fecha ?? "",
    fecha_vencimiento: m?.fecha_vencimiento ?? m?.fecha ?? "",
    debe: m?.debe ?? "",
    haber: m?.haber ?? "",
    baja: !!m?.baja,
    observaciones: m?.observaciones ?? "",
    // compat: si algún response viejo viene como id_paciente
    id_cliente: m?.id_cliente ?? m?.id_paciente ?? "",
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
 */
export async function listarMovimientos(params = {}) {
  const qs = new URLSearchParams();

  const fechaDesde = (params.fecha_desde ?? params.desde ?? "").toString().trim();
  const fechaHasta = (params.fecha_hasta ?? params.hasta ?? "").toString().trim();

  const idClienteRaw =
    params.id_cliente ?? params.idCliente ?? params.id_paciente ?? params.idPaciente;

  const idTipoRaw =
    params.id_movimiento_tipo ?? params.idMovimientoTipo ?? params.id_tipo ?? params.idTipo;

  if (fechaDesde) qs.set("fecha_desde", fechaDesde);
  if (fechaHasta) qs.set("fecha_hasta", fechaHasta);

  if (idClienteRaw !== undefined && idClienteRaw !== null && String(idClienteRaw) !== "") {
    qs.set("id_cliente", String(idClienteRaw));
  }

  if (idTipoRaw !== undefined && idTipoRaw !== null && String(idTipoRaw) !== "") {
    qs.set("id_movimiento_tipo", String(idTipoRaw));
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
