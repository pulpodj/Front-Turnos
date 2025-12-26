// src/api/historialClinicoBackend.js
import { httpJSON } from "./http.js";

// GET - todas las historias de un paciente
export async function listarHistoriasClinicasPaciente(id_paciente) {
  if (!id_paciente) return [];
  return httpJSON(`/API/historias-clinicas/${id_paciente}`);
}

// GET - una historia puntual
export async function traerHistoriaClinica(id) {
  return httpJSON(`/API/historia-clinica/${id}`);
}

// POST - crear
export async function crearHistoriaClinica(payload) {
  return httpJSON(`/API/historia-clinica`, {
    method: "POST",
    body: payload, // ✅ sin JSON.stringify
  });
}

// PUT - actualizar
export async function actualizarHistoriaClinica(payload) {
  return httpJSON(`/API/historia-clinica`, {
    method: "PUT",
    body: payload, // ✅ sin JSON.stringify
  });
}

// DELETE - borrar
export async function borrarHistoriaClinica(id) {
  return httpJSON(`/API/historia-clinica/${id}`, {
    method: "DELETE",
  });
}
