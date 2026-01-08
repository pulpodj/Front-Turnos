// src/api/abmBackend.js
import { httpJSON } from './http.js';

/* ===========================
   USUARIOS (Admin)
   =========================== */
export async function crearUsuario(payload) {
  // POST https://.../API/usuario
  return httpJSON('/API/usuario', { method: 'POST', body: payload, noAuth: true });
}
export async function modificarUsuario(payload) {
  // PUT https://.../API/usuario (requiere Bearer)
  return httpJSON('/API/usuario', { method: 'PUT', body: payload });
}

/* ===========================
   LOGIN
   =========================== */
export async function loginUsuario(payload) {
  return httpJSON('/API/login', { method: 'POST', body: payload, noAuth: true });
}

/* ===========================
   PROFESIONALES
   =========================== */
export async function traerProfesional(id) {
  if (!id) {
    throw new Error('ID de profesional requerido');
  }
  return httpJSON(`/API/profesional/${id}`, { method: 'GET' });
}
export async function crearProfesional(payload) {
  // POST /API/profesional  (Bearer)
  return httpJSON('/API/profesional', { method: 'POST', body: payload });
}
export async function modificarProfesional(payload) {
  // PUT /API/profesional  (Bearer)
  return httpJSON('/API/profesional', { method: 'PUT', body: payload });
}

/* (Opcional) listado si existiera en tu API */
export async function listarProfesionales() {
  return httpJSON('/API/profesionales', { method: 'GET' });
}

// Obras sociales
export async function listarObrasSociales() {
  return httpJSON('/API/obras_sociales', { method: 'GET' });
}

/* ===========================
   PACIENTE(S)
   =========================== */

/**
 * ✅ Normaliza payload para el BACKEND:
 * - mail -> email
 * - fechaNacimiento -> fecha_nacimiento
 * - idObraSocial -> id_obra_social
 * - asegura tipos y evita mandar undefined
 */
function toBackendPacientePayload(p = {}, { includeId = false } = {}) {
  const out = {};

  if (includeId) {
    const idNum = Number(p.id);
    if (Number.isFinite(idNum) && idNum > 0) out.id = idNum;
  }

  // Campos "normales"
  if (p.nombre != null) out.nombre = String(p.nombre);
  if (p.dni != null) out.dni = String(p.dni);
  if (p.celular != null) out.celular = String(p.celular);
  if (p.direccion != null) out.direccion = String(p.direccion);
  if (p.usuario != null) out.usuario = String(p.usuario);
  if (p.clave != null) out.clave = String(p.clave);

  // ✅ mail/email -> email
  const email = p.email ?? p.mail;
  if (email != null) out.email = String(email);

  // ✅ fechaNacimiento/fecha_nacimiento -> fecha_nacimiento
  const fn = p.fecha_nacimiento ?? p.fechaNacimiento;
  if (fn != null) out.fecha_nacimiento = String(fn);

  // ✅ idObraSocial/id_obra_social -> id_obra_social
  const os = p.id_obra_social ?? p.idObraSocial ?? p.obra_social_id;
  if (os !== "" && os != null) {
    const osNum = Number(os);
    out.id_obra_social = Number.isFinite(osNum) ? osNum : os;
  } else {
    // si el backend lo requiere, podrías comentar esto:
    out.id_obra_social = 0;
  }

  return out;
}

export async function crearPaciente(payload) {
  // POST /API/paciente  (Bearer)
  // ✅ no mandamos id en alta
  const body = toBackendPacientePayload(payload, { includeId: false });
  return httpJSON('/API/paciente', { method: 'POST', body });
}

export async function traerPaciente(id) {
  // GET /API/paciente/:id  (Bearer)
  return httpJSON(`/API/paciente/${id}`, { method: 'GET' });
}

export async function modificarPaciente(payload) {
  // PUT /API/paciente  (Bearer)
  // ✅ mandamos snake_case y con id
  const body = toBackendPacientePayload(payload, { includeId: true });
  return httpJSON('/API/paciente', { method: 'PUT', body });
}

export async function listarPacientes() {
  // GET /API/pacientes  (Bearer)
  return httpJSON('/API/pacientes', { method: 'GET' });
}

/* =======================
   TURNOS
   ======================= */
export async function crearTurno(payload) {
  return httpJSON('/API/turno', { method: 'POST', body: payload });
}
export async function traerTurno(id) {
  return httpJSON(`/API/turno/${id}`, { method: 'GET' });
}
export async function modificarTurno(payload) {
  return httpJSON('/API/turno', { method: 'PUT', body: payload });
}
export async function cancelarTurno(id) {
  return httpJSON(`/API/turno/${id}`, { method: 'DELETE' });
}

/* ========= Helpers ========= */
export function mapPacienteABMForm(p = {}) {
  return {
    id: p.id ?? p.ID ?? p.paciente_id ?? null,
    nombre: p.nombre ?? "",
    dni: p.dni ?? "",
    celular: p.celular ?? "",
    // acepta mail o email
    mail: p.mail ?? p.email ?? "",
    // acepta camelCase o snake_case
    fechaNacimiento: p.fechaNacimiento ?? p.fecha_nacimiento ?? "",
    direccion: p.direccion ?? "",
    usuario: p.usuario ?? "",
    clave: p.clave ?? "",
    // acepta camelCase o snake_case
    idObraSocial:
      p.idObraSocial ??
      p.id_obra_social ??
      (p.obra_social_id ?? "") ??
      "",
  };
}

export function mapProfesionalABMForm(p) {
  return {
    id: p.id ?? null,
    nombre: p.nombre ?? '',
    especialidad: p.especialidad ?? '',
    celular: p.celular ?? '',
    mail: p.mail ?? '',
    usuario: p.usuario ?? '',
    clave: p.clave ?? '',
    baja: p.baja ?? false,
  };
}
