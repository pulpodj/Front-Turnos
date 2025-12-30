// src/api/notificacionesBackend.js
import { httpJSON } from "./http.js";

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.notificaciones)) return data.notificaciones;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

export async function listarNotificaciones() {
  const data = await httpJSON("/API/notificaciones");
  return normalizeList(data);
}

export async function getNotificacion(id) {
  return httpJSON(`/API/notificacion/${id}`);
}

export async function crearNotificacion(payload) {
  return httpJSON("/API/notificacion", { method: "POST", body: payload });
}

export async function actualizarNotificacion(payload) {
  // tu backend espera PUT /notificacion (sin :id) según screenshot
  return httpJSON("/API/notificacion", { method: "PUT", body: payload });
}

export async function borrarNotificacion(id) {
  // baja lógica
  return httpJSON(`/API/notificacion/${id}`, { method: "DELETE" });
}
