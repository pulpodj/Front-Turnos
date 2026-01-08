// src/api/movimientosBackend.js
import { httpJSON } from "./http.js";

// ---- Helpers ----
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
    id_cliente: "",
    saldo: 0,
  };
}

export function mapMovimientoToForm(m) {
  return {
    id: m.id ?? null,
    id_movimiento_tipo: m.id_movimiento_tipo ?? "",
    fecha: m.fecha ?? "",
    fecha_vencimiento: m.fecha_vencimiento ?? m.fecha ?? "",
    debe: m.debe ?? "",
    haber: m.haber ?? "",
    baja: !!m.baja,
    observaciones: m.observaciones ?? "",
    id_cliente: m.id_cliente ?? "",
    saldo: m.saldo ?? 0,
  };
}

// ---- API ----

// Si ya tenías estas rutas con otro nombre en tu backend,
// avisame y lo alineamos. Yo las dejé en formato estándar.
export async function listarMovimientos() {
  // ✅ endpoint real (sin "s")
  return httpJSON("/API/movimiento", { method: "GET" });
}

export async function obtenerMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, { method: "GET" });
}

export async function crearMovimiento(payload) {
  return httpJSON("/API/movimiento", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function modificarMovimiento(payload) {
  if (!payload?.id) throw new Error("Falta id para modificar movimiento.");
  return httpJSON(`/API/movimiento/${payload.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function eliminarMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, { method: "DELETE" });
}

// GET /API/movimiento_tipos (si lo usás más adelante)
export async function listarMovimientoTipos() {
  return httpJSON("/API/movimiento_tipos", { method: "GET" });
}

// ✅ GET /API/searchMovimientos?fecha_desde=...&fecha_hasta=...&id_cliente=...&id_movimiento_tipo=...
export async function searchMovimientos(params = {}) {
  const qs = new URLSearchParams();

  // ✅ El backend espera SIEMPRE los 4 parámetros.
  // Defaults amplios para evitar 500 cuando el user deja filtros vacíos.
  const fechaDesde = params.fecha_desde || "1900-01-01";
  const fechaHasta = params.fecha_hasta || "2999-12-31";
  const idCliente = params.id_cliente ?? 0; // permite 0
  const idTipo = Array.isArray(params.id_movimiento_tipo)
    ? (params.id_movimiento_tipo[0] ?? 0)
    : params.id_movimiento_tipo ?? 0;

  qs.set("fecha_desde", String(fechaDesde));
  qs.set("fecha_hasta", String(fechaHasta));
  qs.set("id_cliente", String(idCliente));
  qs.set("id_movimiento_tipo", String(idTipo));

  const query = qs.toString();
  const path = query ? `/API/searchMovimientos?${query}` : "/API/searchMovimientos";
  return httpJSON(path, { method: "GET" });
}
