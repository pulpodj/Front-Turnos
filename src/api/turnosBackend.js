// src/api/turnosBackend.js
import { httpJSON } from "./http.js";
import { MS_PER_DAY, parseYMDToLocal } from "../utils/date.js";

// ===== Fechas LOCAL (evita bug UTC que te corre 1 día) =====
function toLocalDateOnly(input) {
  if (!input) return null;

  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }

  const s = String(input);

  // YYYY-MM-DD (local)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return parseYMDToLocal(s);

  // ISO con hora u otro formato parseable
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmt(d) {
  const x = toLocalDateOnly(d);
  if (!x) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Normaliza distintas formas posibles de respuesta del backend
function normalizeTurnosResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.turnos)) return data.turnos;
  if (data.turno) return [data.turno];
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

/** ====== Colores por tratamiento (pedido) ====== */
function normalizeTratamiento(t) {
  const s = String(t || "").trim().toLowerCase();
  if (!s) return "";
  if (s.includes("terapia") && s.includes("manual")) return "Terapia Manual";
  if (s.includes("kinesi") && (s.includes("conv") || s.includes("convencional")))
    return "Kinesiología Convencional";
  if (s.includes("ejercicio") && s.includes("adapt")) return "Ejercicios Adaptados";
  if (s === "terapia manual") return "Terapia Manual";
  if (s === "kinesiología convencional" || s === "kinesiologia convencional")
    return "Kinesiología Convencional";
  if (s === "ejercicios adaptados") return "Ejercicios Adaptados";
  return String(t || "").trim();
}

function themeByTratamiento(tratamiento) {
  const t = normalizeTratamiento(tratamiento);

  if (t === "Terapia Manual") return { color: "#ffe3f1", edge: "#ff4fa3" };
  if (t === "Kinesiología Convencional") return { color: "#e6ffef", edge: "#2fbf71" };
  if (t === "Ejercicios Adaptados") return { color: "#fff5d6", edge: "#f2b705" };

  return { color: "#edf6ff", edge: "#2684fe" };
}

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
    const base = toLocalDateOnly(baseDateForOffset);
    const d = toLocalDateOnly(fecha);
    if (base && d) dayOffset = Math.round((d - base) / MS_PER_DAY);
  }

  const estado = (t.estado || "").toLowerCase();
  const treatment = normalizeTratamiento(t.tratamiento ?? t.treatment ?? "Sesión");
  const theme = themeByTratamiento(treatment);

  return {
    id: t.id,
    date: fecha,
    hour,
    duration,
    dayOffset,

    patientId: t.paciente_id ?? t.patient_id ?? t.patientId ?? null,
    doctorId: t.profesional_id ?? t.doctor_id ?? t.doctorId ?? null,

    patient: t.paciente_nombre ?? t.paciente ?? t.patient_name ?? t.patientName ?? "",
    doctorName: t.profesional_nombre ?? t.doctor ?? t.doctor_name ?? t.doctorName ?? "",

    treatment,
    status: estado || t.estado || "pendiente",
    active: estado !== "cancelado",

    color: theme.color,
    edge: theme.edge,

    raw: t,
  };
}

/* ===================== SECRETARÍA ===================== */

export async function fetchTurnosSecretariaPorFecha(fecha) {
  const f = fmt(fecha);
  const data = await httpJSON(`/API/turnos?fecha=${encodeURIComponent(f)}`);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t, f));
}

export async function fetchTurnosSecretariaSemana(anchorISO, doctorId) {
  const base = toLocalDateOnly(anchorISO) || new Date();
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
            (t) => Number(t.profesional_id ?? t.doctor_id ?? t.doctorId) === idNum
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

export async function fetchTurnosClientePorFecha(clienteId, fecha) {
  const f = fmt(fecha);
  const path = `/API/turnosCliente?id=${encodeURIComponent(clienteId)}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

/* ===================== PROFESIONAL ===================== */

export async function fetchTurnosProfesionalPorFecha(profesionalId, fecha) {
  const f = fmt(fecha);
  const path = `/API/turnosProfesional?id=${encodeURIComponent(profesionalId)}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

export async function fetchTurnosProfesionalSemana(profesionalId, anchorISO) {
  const base = toLocalDateOnly(anchorISO) || new Date();
  const days = Array.from({ length: 5 }, (_, i) =>
    fmt(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );

  const results = await Promise.all(
    days.map(async (f) => {
      try {
        const path = `/API/turnosProfesional?id=${encodeURIComponent(profesionalId)}&fecha=${encodeURIComponent(f)}`;
        const data = await httpJSON(path);
        const turnos = normalizeTurnosResponse(data);
        return turnos.map((t) => mapTurnoToAppointment(t, days[0]));
      } catch (err) {
        console.error("Error cargando turnos profesional", profesionalId, "fecha", f, err);
        return [];
      }
    })
  );

  return results.flat();
}
