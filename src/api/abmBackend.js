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
// Nota: tu colección usa dos variantes de login.
// La que nos pasaste para ABM: POST http://localhost:41601/API/login
// También habías usado /API/loginProfesional en otra prueba.
// Dejamos helper por si lo necesitás.
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
  // Si tu backend expone /API/profesionales, lo usamos; si no, error controlado.
  return httpJSON('/API/profesionales', { method: 'GET' });
}

// Obras sociales
export async function listarObrasSociales() {
  return httpJSON('/API/obras_sociales', { method: 'GET' });
}

/* ===========================
   PACIENTE(S)
   =========================== */
export async function crearPaciente(payload) {
  // POST /API/paciente  (Bearer)
  return httpJSON('/API/paciente', { method: 'POST', body: payload });
}
export async function traerPaciente(id) {
  // GET /API/paciente/:id  (Bearer)
  return httpJSON(`/API/paciente/${id}`, { method: 'GET' });
}
export async function modificarPaciente(payload) {
  // PUT /API/paciente  (Bearer)
  return httpJSON('/API/paciente', { method: 'PUT', body: payload });
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
export function mapPacienteABMForm(p) {
  return {
    id: p.id ?? null,
    nombre: p.nombre ?? '',
    dni: p.dni ?? '',
    celular: p.celular ?? '',
    mail: p.mail ?? '',
    fechaNacimiento: p.fechaNacimiento ?? '',
    direccion: p.direccion ?? '',
    usuario: p.usuario ?? '',
    clave: p.clave ?? '',
    idObraSocial: p.idObraSocial ?? '',
    baja: p.baja ?? false,
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
