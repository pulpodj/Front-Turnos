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
  // tolera variantes comunes
  if (s.includes("terapia") && s.includes("manual")) return "Terapia Manual";
  if (s.includes("kinesi") && (s.includes("conv") || s.includes("convencional")))
    return "Kinesiología Convencional";
  if (s.includes("ejercicio") && s.includes("adapt")) return "Ejercicios Adaptados";
  // si viene exacto:
  if (s === "terapia manual") return "Terapia Manual";
  if (s === "kinesiología convencional" || s === "kinesiologia convencional")
    return "Kinesiología Convencional";
  if (s === "ejercicios adaptados") return "Ejercicios Adaptados";
  return String(t || "").trim();
}

function themeByTratamiento(tratamiento) {
  const t = normalizeTratamiento(tratamiento);

  // Rosado, Verde, Amarillo (glass-friendly)
  if (t === "Terapia Manual") {
    return { color: "#ffe3f1", edge: "#ff4fa3" }; // rosado
  }
  if (t === "Kinesiología Convencional") {
    return { color: "#e6ffef", edge: "#2fbf71" }; // verde
  }
  if (t === "Ejercicios Adaptados") {
    return { color: "#fff5d6", edge: "#f2b705" }; // amarillo
  }
  // fallback neutro
  return { color: "#edf6ff", edge: "#2684fe" };
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
    const base =
      typeof baseDateForOffset === "string"
        ? new Date(baseDateForOffset)
        : baseDateForOffset;
    const d = new Date(fecha);
    dayOffset = Math.round((d - base) / 86400000);
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

    patient:
      t.paciente_nombre ?? t.paciente ?? t.patient_name ?? t.patientName ?? "",
    doctorName:
      t.profesional_nombre ?? t.doctor ?? t.doctor_name ?? t.doctorName ?? "",

    treatment,
    status: estado || t.estado || "pendiente",
    active: estado !== "cancelado",

    // ✅ colores por tratamiento
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
  const path = `/API/turnosCliente?id=${encodeURIComponent(
    clienteId
  )}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

/* ===================== PROFESIONAL ===================== */

export async function fetchTurnosProfesionalPorFecha(profesionalId, fecha) {
  const f = fmt(fecha);
  const path = `/API/turnosProfesional?id=${encodeURIComponent(
    profesionalId
  )}&fecha=${encodeURIComponent(f)}`;
  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);
  return turnos.map((t) => mapTurnoToAppointment(t));
}

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
        console.error("Error cargando turnos profesional", profesionalId, "fecha", f, err);
        return [];
      }
    })
  );

  return results.flat();
}
