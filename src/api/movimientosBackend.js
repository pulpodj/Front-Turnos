// src/api/movimientosBackend.js
import { httpJSON } from "./http.js";

/* ============ MOVIMIENTOS ============ */

// GET /API/movimientos
export async function listarMovimientos() {
  return httpJSON("/API/movimientos", { method: "GET" });
}

// GET /API/movimiento/:id
export async function traerMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, { method: "GET" });
}

// POST /API/movimiento
export async function crearMovimiento(payload) {
  return httpJSON("/API/movimiento", {
    method: "POST",
    body: payload,
  });
}

// PUT /API/movimiento
export async function modificarMovimiento(payload) {
  return httpJSON("/API/movimiento", {
    method: "PUT",
    body: payload,
  });
}

// DELETE /API/movimiento/:id
export async function eliminarMovimiento(id) {
  return httpJSON(`/API/movimiento/${id}`, {
    method: "DELETE",
  });
}

/* ============ TIPOS DE MOVIMIENTO ============ */

// GET /API/movimiento_tipos
export async function listarMovimientoTipos() {
  return httpJSON("/API/movimiento_tipos", { method: "GET" });
}

// GET /API/movimiento_tipo/:id
export async function traerMovimientoTipo(id) {
  return httpJSON(`/API/movimiento_tipo/${id}`, { method: "GET" });
}

// POST /API/movimiento_tipo
export async function crearMovimientoTipo(payload) {
  return httpJSON("/API/movimiento_tipo", {
    method: "POST",
    body: payload,
  });
}

// PUT /API/movimiento_tipo
export async function modificarMovimientoTipo(payload) {
  return httpJSON("/API/movimiento_tipo", {
    method: "PUT",
    body: payload,
  });
}

// DELETE /API/movimiento_tipo/:id
export async function eliminarMovimientoTipo(id) {
  return httpJSON(`/API/movimiento_tipo/${id}`, {
    method: "DELETE",
  });
}

/* ============ Helpers para formularios ============ */

export function emptyMovimientoForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: null,
    id_movimiento_tipo: "",
    fecha: today,
    fecha_vencimiento: today,
    debe: "",
    haber: "",
    baja: false,
    observaciones: "",
    id_cliente: "",
    saldo: "",
  };
}

export function mapMovimientoToForm(m) {
  if (!m) return emptyMovimientoForm();
  return {
    id: m.id ?? null,
    id_movimiento_tipo: m.id_movimiento_tipo ?? "",
    fecha: m.fecha ?? "",
    fecha_vencimiento: m.fecha_vencimiento ?? "",
    debe: m.debe ?? "",
    haber: m.haber ?? "",
    baja: m.baja ?? false,
    observaciones: m.observaciones ?? "",
    id_cliente: m.id_cliente ?? "",
    saldo: m.saldo ?? "",
  };
}

export function emptyTipoMovimientoForm() {
  return {
    id: null,
    tipo: "",
    descripcion: "",
  };
}

export function mapTipoMovimientoToForm(t) {
  if (!t) return emptyTipoMovimientoForm();
  return {
    id: t.id ?? null,
    tipo: t.tipo ?? "",
    descripcion: t.descripcion ?? "",
  };
}
