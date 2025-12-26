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
  return httpJSON("/API/movimientos", { method: "GET" });
}

export async function obtenerMovimiento(id) {
  return httpJSON(`/API/movimientos/${id}`, { method: "GET" });
}

export async function crearMovimiento(payload) {
  return httpJSON("/API/movimientos", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function modificarMovimiento(payload) {
  if (!payload?.id) throw new Error("Falta id para modificar movimiento.");
  return httpJSON(`/API/movimientos/${payload.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function eliminarMovimiento(id) {
  return httpJSON(`/API/movimientos/${id}`, { method: "DELETE" });
}

// GET /API/movimiento_tipos (si lo usás más adelante)
export async function listarMovimientoTipos() {
  return httpJSON("/API/movimiento_tipos", { method: "GET" });
}

// ✅ GET /API/searchMovimientos?fecha_desde=...&fecha_hasta=...&id_cliente=...&id_movimiento_tipo=...
export async function searchMovimientos(params = {}) {
  const qs = new URLSearchParams();

  if (params.fecha_desde) qs.set("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) qs.set("fecha_hasta", params.fecha_hasta);
  if (params.id_cliente) qs.set("id_cliente", String(params.id_cliente));

  // soporta: number | string | array -> CSV "1,2,3"
  if (params.id_movimiento_tipo != null && params.id_movimiento_tipo !== "") {
    const v = Array.isArray(params.id_movimiento_tipo)
      ? params.id_movimiento_tipo.join(",")
      : String(params.id_movimiento_tipo);
    qs.set("id_movimiento_tipo", v);
  }

  const query = qs.toString();
  const path = query ? `/API/searchMovimientos?${query}` : "/API/searchMovimientos";
  return httpJSON(path, { method: "GET" });
}
