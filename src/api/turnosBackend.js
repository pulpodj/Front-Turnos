// src/api/turnosBackend.js
import { httpJSON } from "./http.js";

// Helper para formatear fechas a YYYY-MM-DD
const fmt = (d) => {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
};

// Normaliza distintas formas posibles de respuesta del backend
function normalizeTurnosResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.turnos)) return data.turnos;
  if (data.turno) return [data.turno]; // caso "success: true, turno: {...}"
  return [];
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hhRaw, mmRaw] = String(timeStr).split(":");
  const hh = Number(hhRaw);
  const mm = Number(mmRaw || 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

// Convierte un "turno" del backend a la estructura usada por la agenda
export function mapTurnoToAppointment(t, baseDateForOffset) {
  if (!t) return null;

  const fecha = t.fecha || t.date;
  const startMin = parseTimeToMinutes(t.hora_inicio || t.horaInicio);
  const endMin = parseTimeToMinutes(t.hora_fin || t.horaFin);

  const hour = startMin != null ? Math.floor(startMin / 60) : 0;
  let duration = 1;
  if (startMin != null && endMin != null && endMin > startMin) {
    duration = (endMin - startMin) / 60;
  }

  let dayOffset = 0;
  if (baseDateForOffset && fecha) {
    const base = typeof baseDateForOffset === "string"
      ? new Date(baseDateForOffset)
      : baseDateForOffset;
    const d = new Date(fecha);
    dayOffset = Math.round((d - base) / 86400000);
  }

  const estado = (t.estado || "").toLowerCase();

  return {
    id: t.id,
    date: fecha,
    hour,
    duration,
    dayOffset,
    // IDs
    patientId: t.paciente_id ?? t.patient_id ?? t.patientId ?? null,
    doctorId: t.profesional_id ?? t.doctor_id ?? t.doctorId ?? null,
    // Nombres
    patient: t.paciente_nombre ?? t.paciente ?? t.patient_name ?? t.patientName ?? "",
    doctorName: t.profesional_nombre ?? t.doctor ?? t.doctor_name ?? t.doctorName ?? "",
    // Tratamiento / etiqueta
    treatment: t.tratamiento ?? t.treatment ?? "Sesión",
    // Estado
    status: estado || t.estado || "pendiente",
    active: estado !== "cancelado",
    // Por si después querés ver el crudo:
    raw: t,
  };
}

/* ===================== SECRETARÍA ===================== */

/**
 * Todos los turnos (de todos los profesionales) para una fecha.
 * wrap de GET /API/turnos?fecha=YYYY-MM-DD
 */
export async function fetchTurnosSecretariaPorFecha(fecha) {
  const f = fmt(fecha);
  const data = await httpJSON(`/API/turnos?fecha=${encodeURIComponent(f)}`);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t, f));
}

/**
 * Turnos de la semana (lun–vie) para la secretaria.
 * Opcionalmente filtra por doctorId en el front.
 */
export async function fetchTurnosSecretariaSemana(anchorISO, doctorId) {
  const base = new Date(anchorISO);
  const days = Array.from({ length: 5 }, (_, i) =>
    fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );

  const results = await Promise.all(
    days.map(async (f) => {
      try {
        const data = await httpJSON(`/API/turnos?fecha=${encodeURIComponent(f)}`);
        let turnos = normalizeTurnosResponse(data);
        if (doctorId) {
          const idNum = Number(doctorId);
          turnos = turnos.filter(
            (t) =>
              Number(t.profesional_id ?? t.doctor_id ?? t.doctorId) === idNum
          );
        }
        return turnos.map((t) => mapTurnoToAppointment(t, days[0]));
      } catch (err) {
        console.error("Error cargando turnos para fecha", f, err);
        return [];
      }
    })
  );

  return results.flat();
}

/* ===================== PACIENTE ===================== */

/**
 * Turnos de un paciente en una fecha dada.
 * wrap de GET /API/turnosCliente?id=ID&fecha=YYYY-MM-DD
 */
export async function fetchTurnosClientePorFecha(clienteId, fecha) {
  const f = fmt(fecha);
  const path = `/API/turnosCliente?id=${encodeURIComponent(
    clienteId
  )}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

/* ===================== PROFESIONAL ===================== */

/**
 * Turnos de un profesional en una fecha dada.
 * wrap de GET /API/turnosProfesional?id=ID&fecha=YYYY-MM-DD
 */
export async function fetchTurnosProfesionalPorFecha(profesionalId, fecha) {
  const f = fmt(fecha);
  const path = `/API/turnosProfesional?id=${encodeURIComponent(
    profesionalId
  )}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

/**
 * Turnos de un profesional en toda una semana (lun–vie).
 * Pensado para alimentar la grilla de MedicoAgenda.
 */
export async function fetchTurnosProfesionalSemana(profesionalId, anchorISO) {
  const base = new Date(anchorISO);
  const days = Array.from({ length: 5 }, (_, i) =>
    fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );

  const results = await Promise.all(
    days.map(async (f) => {
      try {
        const path = `/API/turnosProfesional?id=${encodeURIComponent(
          profesionalId
        )}&fecha=${encodeURIComponent(f)}`;
        const data = await httpJSON(path);
        const turnos = normalizeTurnosResponse(data);
        return turnos.map((t) => mapTurnoToAppointment(t, days[0]));
      } catch (err) {
        console.error(
          "Error cargando turnos profesional",
          profesionalId,
          "fecha",
          f,
          err
        );
        return [];
      }
    })
  );

  return results.flat();
}
