// src/api/turnosBackend.js
import { httpJSON } from "./http.js";

/** =========================
 * Debug toggle (sin ensuciar consola siempre)
 * Activar:  localStorage.setItem("gt_debug_turnos","1")
 * Desactivar: localStorage.removeItem("gt_debug_turnos")
 * ========================= */
const DEBUG_TURNOS =
  typeof window !== "undefined" &&
  window?.localStorage?.getItem("gt_debug_turnos") === "1";

function dlog(...args) {
  if (DEBUG_TURNOS) console.log(...args);
}
function dwarn(...args) {
  if (DEBUG_TURNOS) console.warn(...args);
}

/** =========================
 * Helpers de fecha (LOCAL)
 *  - Evita el bug de +1 día por parse UTC de "YYYY-MM-DD"
 * ========================= */
function parseYMDToLocal(ymd) {
  const s = String(ymd || "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

const fmtLocal = (d) => {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function toYMDLocalFromUnknownDate(fecha) {
  if (!fecha) return "";
  const s = String(fecha);

  // si ya es YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];

  // fallback Date parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return fmtLocal(d);

  return "";
}

// ✅ Normaliza distintas formas posibles de respuesta del backend
// FIX: soportar { turno: [] } (Postman muestra eso para profesional)
function normalizeTurnosResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // comunes
  if (Array.isArray(data.turnos)) return data.turnos;

  // ✅ si "turno" es array -> devolverlo directo
  if (Array.isArray(data.turno)) return data.turno;
  if (data.turno) return [data.turno];

  // a veces envuelven en {data: ...}
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.data.turnos)) return data.data.turnos;

    // ✅ si data.data.turno es array
    if (Array.isArray(data.data.turno)) return data.data.turno;
    if (data.data.turno) return [data.data.turno];
  }

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

/** ====== Tratamientos por ID (según tu DB) ====== */
const TRATAMIENTOS_BY_ID = {
  1: "Terapia Manual",
  2: "Kinesiología Convencional",
  3: "Ejercicios Adaptados",
};

function normalizeStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function isGenericTreatmentName(name) {
  const n = normalizeStr(name);
  return (
    !n ||
    n === "sesion" ||
    n === "sesiones" ||
    n === "session" ||
    n === "appointment" ||
    n === "turno"
  );
}

/** Normaliza variantes del nombre (por si backend manda textos parecidos) */
function normalizeTratamientoName(name) {
  const n = normalizeStr(name);
  if (!n) return "";

  // Terapia Manual
  if (n.includes("terapia") && n.includes("manual")) return "Terapia Manual";

  // Kinesiología Convencional (soporta typo kineciologia)
  if (n.includes("kinesi") || n.includes("kineci")) {
    if (n.includes("conv")) return "Kinesiología Convencional";
    // a veces llega solo "kinesiologia" -> igual lo tomamos como convencional
    return "Kinesiología Convencional";
  }

  // Ejercicios Adaptados
  if (n.includes("ejerc") && n.includes("adapt")) return "Ejercicios Adaptados";

  // exactos sin tildes
  if (n === "terapia manual") return "Terapia Manual";
  if (n === "kinesiologia convencional") return "Kinesiología Convencional";
  if (n === "ejercicios adaptados") return "Ejercicios Adaptados";

  // si viene algo raro, devolvemos el original “bonito”
  return String(name || "").trim();
}

/** ✅ Resolver tratamiento real (DETERMINISTA):
 *  1) PRIORIDAD: ID numérico que manda backend (tratamiento_id, idTratamiento, etc.)
 *  2) Si no hay ID, intentamos por nombre (tratamiento/treatment) normalizado
 *  3) Si el nombre es genérico ("Sesión"), y hay ID -> mapeamos por ID
 */
function resolveTratamiento(turno) {
  const t = turno || {};

  const idRaw =
    t.idTratamiento ??
    t.tratamiento_id ??
    t.tratamientoId ??
    t.idTipoTratamiento ??
    t.tipo_tratamiento ??
    t.id_tratamiento ??
    null;

  const idNum = Number(idRaw);

  // ✅ si hay ID, gana siempre (esto evita “saltos”)
  if (Number.isFinite(idNum) && TRATAMIENTOS_BY_ID[idNum]) {
    return TRATAMIENTOS_BY_ID[idNum];
  }

  const nameRaw =
    t.tratamiento ??
    t.treatment ??
    t.tratamientoNombre ??
    t.tratamiento_nombre ??
    t.nombre_tratamiento ??
    "";

  const nameNorm = normalizeTratamientoName(nameRaw);

  // si nombre genérico, y no hubo id válido, devolvemos algo legible
  if (isGenericTreatmentName(nameNorm)) return "Sesión";

  return nameNorm || "Sesión";
}

/** ====== Colores por tratamiento ====== */
function themeByTratamiento(tratamiento) {
  const t = normalizeTratamientoName(tratamiento);

  // Rosado, Verde, Amarillo (glass-friendly)
  if (t === "Terapia Manual") return { color: "#ffe3f1", edge: "#ff4fa3" };
  if (t === "Kinesiología Convencional") return { color: "#e6ffef", edge: "#2fbf71" };
  if (t === "Ejercicios Adaptados") return { color: "#fff5d6", edge: "#f2b705" };
  return { color: "#edf6ff", edge: "#2684fe" };
}

function getDoctorId(t) {
  const id =
    t.profesional_id ??
    t.doctor_id ??
    t.doctorId ??
    t.idProfecional ??
    t.idProfesional ??
    null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

/** Dedupe: corta duplicados antes de llegar a React */
function dedupeByIdAndDate(appts, label = "") {
  const list = Array.isArray(appts) ? appts : [];
  const seen = new Set();
  const out = [];
  let dup = 0;

  for (const it of list) {
    if (!it) continue;
    const key = `${String(it.id ?? "")}|${String(it.date ?? "")}|${String(it.hour ?? "")}|${String(
      it.doctorId ?? ""
    )}`;

    if (seen.has(key)) {
      dup++;
      continue;
    }
    seen.add(key);
    out.push(it);
  }

  if (DEBUG_TURNOS) {
    dlog(`[TURNOS] dedupe ${label}: in=${list.length} out=${out.length} dup=${dup}`);
    if (dup > 0) dwarn(`[TURNOS] ⚠️ se detectaron duplicados (${dup}). Se filtraron en front.`);
  }

  return out;
}

// Convierte un "turno" del backend a la estructura usada por la agenda
export function mapTurnoToAppointment(turno, baseDateForOffset) {
  if (!turno) return null;

  const t = turno;

  const fechaRaw = t.fecha || t.date;
  const fecha = toYMDLocalFromUnknownDate(fechaRaw);

  // soporta horaIni/horaFin y hora_inicio/hora_fin
  const startMin = parseTimeToMinutes(t.horaIni || t.hora_inicio || t.horaInicio);
  const endMin = parseTimeToMinutes(
    t.horaFin || t.hora_fin || t.horaFinal || t.horaFinFinal
  );

  const hour = startMin != null ? Math.floor(startMin / 60) : 0;

  let duration = 1;
  if (startMin != null && endMin != null && endMin > startMin) {
    duration = (endMin - startMin) / 60;
  }

  // ✅ dayOffset basado en fechas locales (evita desfases)
  let dayOffset = 0;
  if (baseDateForOffset && fecha) {
    const base =
      typeof baseDateForOffset === "string"
        ? parseYMDToLocal(baseDateForOffset) || new Date(baseDateForOffset)
        : baseDateForOffset;

    const d = parseYMDToLocal(fecha) || new Date(fecha);

    // acá base y d están en local 00:00
    dayOffset = Math.round((d - base) / 86400000);
  }

  const estadoRaw = t.estado || t.status || "pendiente";
  const estado = String(estadoRaw || "").toLowerCase();

  const treatment = resolveTratamiento(t);
  const theme = themeByTratamiento(treatment);

  // logs detallados (solo si DEBUG)
  dlog("[MAP TURNO]", {
    id: t.id,
    fecha: fechaRaw,
    fecha_norm: fecha,
    // ids posibles (para detectar cuál viene realmente)
    idTratamiento: t.idTratamiento,
    tratamiento_id: t.tratamiento_id,
    tratamientoId: t.tratamientoId,
    id_tratamiento: t.id_tratamiento,
    tipo_tratamiento: t.tipo_tratamiento,
    idTipoTratamiento: t.idTipoTratamiento,
    // nombre crudo
    tratamiento_raw: t.tratamiento ?? t.treatment,
    // final
    treatment_resuelto: treatment,
    doctorId: getDoctorId(t),
    doctorName: t.profesional_nombre ?? t.doctor ?? t.doctor_name ?? t.doctorName ?? "",
    estado: estadoRaw,
  });

  const doctorId = getDoctorId(t);

  return {
    id: t.id,
    date: fecha, // ✅ siempre YYYY-MM-DD
    hour,
    duration,
    dayOffset,

    patientId: t.paciente_id ?? t.patient_id ?? t.patientId ?? t.idPaciente ?? null,
    doctorId,

    patient: t.paciente_nombre ?? t.paciente ?? t.patient_name ?? t.patientName ?? "",
    doctorName:
      t.profesional_nombre ?? t.doctor ?? t.doctor_name ?? t.doctorName ?? "",

    treatment,
    status: estado || "pendiente",
    active: estado !== "cancelado",

    // ✅ colores por tratamiento
    color: theme.color,
    edge: theme.edge,

    raw: t,
  };
}

/* ===================== SECRETARÍA ===================== */

export async function fetchTurnosSecretariaPorFecha(fecha) {
  const f = fmtLocal(fecha);

  const data = await httpJSON(`/API/turnos?fecha=${encodeURIComponent(f)}`);
  const turnos = normalizeTurnosResponse(data);

  const mapped = turnos.map((t) => mapTurnoToAppointment(t, f)).filter(Boolean);
  const deduped = dedupeByIdAndDate(mapped, `secretaria_por_fecha ${f}`);

  dlog(`[TURNOS] secretaria_por_fecha ${f}: backend=${turnos.length} mapped=${mapped.length}`);

  return deduped;
}

export async function fetchTurnosSecretariaSemana(anchorISO, doctorId) {
  const base =
    parseYMDToLocal(anchorISO) ||
    (anchorISO instanceof Date ? anchorISO : new Date(anchorISO));

  const days = Array.from({ length: 5 }, (_, i) =>
    fmtLocal(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );

  dlog("[TURNOS] secretaria_semana", { anchorISO, days, doctorId: doctorId || null });

  const results = await Promise.all(
    days.map(async (f) => {
      try {
        const data = await httpJSON(`/API/turnos?fecha=${encodeURIComponent(f)}`);
        let turnos = normalizeTurnosResponse(data);

        // filtro por profesional si aplica
        if (doctorId) {
          const idNum = Number(doctorId);
          turnos = turnos.filter((t) => getDoctorId(t) === idNum);
        }

        const mapped = turnos.map((t) => mapTurnoToAppointment(t, days[0])).filter(Boolean);

        dlog(
          `[TURNOS] secretaria_semana día ${f}: backend=${normalizeTurnosResponse(data).length} afterFilter=${turnos.length} mapped=${mapped.length}`
        );

        return mapped;
      } catch (err) {
        console.error("Error cargando turnos para fecha", f, err);
        return [];
      }
    })
  );

  const flat = results.flat();
  const deduped = dedupeByIdAndDate(flat, `secretaria_semana ${days[0]}`);

  dlog(`[TURNOS] secretaria_semana final: flat=${flat.length} deduped=${deduped.length}`);

  return deduped;
}

/* ===================== PACIENTE ===================== */

export async function fetchTurnosClientePorFecha(clienteId, fecha) {
  const f = fmtLocal(fecha);
  const path = `/API/turnosCliente?id=${encodeURIComponent(clienteId)}&fecha=${encodeURIComponent(
    f
  )}`;

  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);

  const mapped = turnos.map((t) => mapTurnoToAppointment(t)).filter(Boolean);
  const deduped = dedupeByIdAndDate(mapped, `cliente_por_fecha ${clienteId} ${f}`);

  dlog(
    `[TURNOS] cliente_por_fecha ${clienteId} ${f}: backend=${turnos.length} mapped=${mapped.length}`
  );

  return deduped;
}

/* ===================== PROFESIONAL ===================== */

export async function fetchTurnosProfesionalPorFecha(profesionalId, fecha) {
  const f = fmtLocal(fecha);
  const path = `/API/turnosProfesional?id=${encodeURIComponent(
    profesionalId
  )}&fecha=${encodeURIComponent(f)}`;

  const data = await httpJSON(path);
  const turnos = normalizeTurnosResponse(data);

  const mapped = turnos.map((t) => mapTurnoToAppointment(t)).filter(Boolean);
  const deduped = dedupeByIdAndDate(mapped, `prof_por_fecha ${profesionalId} ${f}`);

  dlog(
    `[TURNOS] prof_por_fecha ${profesionalId} ${f}: backend=${turnos.length} mapped=${mapped.length}`
  );

  return deduped;
}

export async function fetchTurnosProfesionalSemana(profesionalId, anchorISO) {
  const base =
    parseYMDToLocal(anchorISO) ||
    (anchorISO instanceof Date ? anchorISO : new Date(anchorISO));

  const days = Array.from({ length: 5 }, (_, i) =>
    fmtLocal(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i))
  );

  dlog("[TURNOS] prof_semana", { profesionalId, anchorISO, days });

  const results = await Promise.all(
    days.map(async (f) => {
      try {
        const path = `/API/turnosProfesional?id=${encodeURIComponent(
          profesionalId
        )}&fecha=${encodeURIComponent(f)}`;

        const data = await httpJSON(path);
        const turnos = normalizeTurnosResponse(data);

        const mapped = turnos.map((t) => mapTurnoToAppointment(t, days[0])).filter(Boolean);

        dlog(
          `[TURNOS] prof_semana día ${f}: backend=${turnos.length} mapped=${mapped.length}`
        );

        return mapped;
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

  const flat = results.flat();
  const deduped = dedupeByIdAndDate(flat, `prof_semana ${profesionalId} ${days[0]}`);

  dlog(`[TURNOS] prof_semana final: flat=${flat.length} deduped=${deduped.length}`);

  return deduped;
}
