// src/ui/ABMPanel.jsx
import { useEffect, useMemo, useState } from "react";
import {
  crearPaciente,
  modificarPaciente,
  listarPacientes,
  listarProfesionales,
  crearTurno,
  modificarTurno,
  cancelarTurno,
  mapPacienteABMForm,
  listarObrasSociales,
} from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";
import { parseYMDToLocal } from "../utils/date.js";

// ✅ NUEVO: para validar disponibilidad del profesional antes de crear
import { fetchTurnosProfesionalPorFecha } from "../api/turnosBackend.js";

// ===== Obras sociales (fallback local) =====
const OBRAS_SOCIALES_FALLBACK = [
  { id: 1, nombre: "OSDE" },
  { id: 2, nombre: "Swiss Medical" },
  { id: 3, nombre: "PAMI" },
  { id: 4, nombre: "Galeno" },
];

// ===== Tratamientos (Turnos) =====
const TRATAMIENTOS = [
  { id: 1, nombre: "Terapia Manual" },
  { id: 2, nombre: "Kinesiología Convencional" },
  { id: 3, nombre: "Ejercicios Adaptados" },
];

const tratamientoById = (id) =>
  TRATAMIENTOS.find((t) => Number(t.id) === Number(id))?.nombre ||
  "Terapia Manual";

const tratamientoIdByNombre = (nombre) =>
  TRATAMIENTOS.find(
    (t) => String(t.nombre).toLowerCase() === String(nombre).toLowerCase()
  )?.id || 1;

// ===== Fechas (LOCAL) =====
const fmtLocal = (d) => {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfWeekLocal = (d) => {
  const x = d instanceof Date ? new Date(d) : new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};

// ✅ sumar días en local (para repetir semanal sin corrimientos)
function addDaysLocal(dateObj, days) {
  const d = new Date(dateObj);
  // mediodía para evitar saltos por DST/timezone
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ✅ debug opcional (fácil de apagar)
const DEBUG_REPEAT =
  typeof window !== "undefined" &&
  window?.localStorage?.getItem("gt_debug_repeat") === "1";

// ✅ debug opcional para disponibilidad
const DEBUG_AVAIL =
  typeof window !== "undefined" &&
  window?.localStorage?.getItem("gt_debug_avail") === "1";

const emptyTurnoForm = () => ({
  id: null,
  idPaciente: "",
  idProfecional: "",
  fecha: fmtLocal(new Date()),
  horaIni: "07:00",
  horaFin: "08:00",
  tratamientoId: 1,
  obs: "",
  // ✅ (UI) x1..x4
  repeatCount: 1,
});

function isValidYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function mapAppointmentToTurnoForm(appt) {
  if (!appt) return null;
  const raw = appt.raw || {};

  const fecha = raw.fecha || raw.date || appt.date || fmtLocal(new Date());

  let horaIni =
    raw.horaIni ||
    raw.hora_inicio ||
    raw.horaInicio ||
    appt.raw?.horaIni ||
    appt.raw?.hora_inicio ||
    appt.raw?.horaInicio ||
    "";

  if (!horaIni) {
    if (appt.hour != null) horaIni = `${String(appt.hour).padStart(2, "0")}:00`;
    else horaIni = "07:00";
  }

  let horaFin =
    raw.horaFin ||
    raw.hora_fin ||
    appt.raw?.horaFin ||
    appt.raw?.hora_fin ||
    "";

  // Si no hay horaFin, estimamos con duración
  if (!horaFin) {
    const dur = Number(appt.duration || 1);
    const baseH = Number(appt.hour || 7);
    const endH = baseH + (Number.isFinite(dur) ? dur : 1);
    const hh = String(Math.min(23, Math.max(0, Math.floor(endH)))).padStart(
      2,
      "0"
    );
    horaFin = `${hh}:00`;
  }

  const idPaciente =
    raw.idPaciente ?? raw.paciente_id ?? raw.patient_id ?? appt.patientId ?? "";

  const idProfecional =
    raw.idProfecional ??
    raw.idProfesional ??
    raw.profesional_id ??
    raw.doctor_id ??
    appt.doctorId ??
    "";

  // ✅ tratamientoId: que el select quede bien al editar
  const tratamientoIdRaw =
    raw.idTratamiento ??
    raw.tratamiento_id ??
    raw.tratamientoId ??
    raw.tipo_tratamiento ??
    raw.idTipoTratamiento ??
    null;

  const tratamientoNombreRaw =
    raw.tratamiento || raw.treatment || appt.treatment || "";

  const tratamientoId =
    tratamientoIdRaw != null
      ? Number(tratamientoIdRaw)
      : tratamientoIdByNombre(String(tratamientoNombreRaw || "Terapia Manual"));

  const obs = raw.obs || raw.observaciones || raw.notas || appt.obs || "";

  // normalizar fecha a YYYY-MM-DD por si viene con timestamp
  let fechaYMD = String(fecha || "");
  if (!isValidYMD(fechaYMD)) {
    const dd = new Date(fechaYMD);
    if (!Number.isNaN(dd.getTime())) fechaYMD = fmtLocal(dd);
  }

  return {
    id: appt.id ?? raw.id ?? null,
    idPaciente: idPaciente ? Number(idPaciente) : "",
    idProfecional: idProfecional ? Number(idProfecional) : "",
    fecha: fechaYMD,
    horaIni: String(horaIni),
    horaFin: String(horaFin),
    tratamientoId: Number(tratamientoId || 1),
    obs: String(obs),
    // ✅ al editar, por UI lo dejamos en x1
    repeatCount: 1,
  };
}

/** =========================
 * ✅ Helpers disponibilidad (frontend)
 * ========================= */
function parseHMToMinutes(hm) {
  const s = String(hm || "");
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function getApptStartEndMinutes(appt) {
  // intentamos por raw primero
  const raw = appt?.raw || {};
  const ini =
    raw.horaIni ||
    raw.hora_inicio ||
    raw.horaInicio ||
    appt?.horaIni ||
    appt?.hora_inicio ||
    appt?.horaInicio ||
    null;

  const fin =
    raw.horaFin ||
    raw.hora_fin ||
    raw.horaFinal ||
    appt?.horaFin ||
    appt?.hora_fin ||
    null;

  const s = parseHMToMinutes(ini);
  let e = parseHMToMinutes(fin);

  if (s != null && e == null) {
    // fallback: hour + duration
    const hour = Number(appt?.hour ?? 0);
    const dur = Number(appt?.duration ?? 1);
    e =
      Number.isFinite(hour) && Number.isFinite(dur)
        ? hour * 60 + dur * 60
        : null;
  }

  return { start: s, end: e };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null)
    return false;
  return aStart < bEnd && aEnd > bStart;
}

export default function ABMPanel({ onDataChanged, selectedTurno }) {
  const [tab, setTab] = useState("pacientes");
  const useBackend = !!getBackendToken();

  // ===== Pacientes =====
  const [pacList, setPacList] = useState([]);
  const [formPac, setFormPac] = useState(mapPacienteABMForm({}));
  const [loadingPac, setLoadingPac] = useState(false);
  const [errorPac, setErrorPac] = useState("");

  // ✅ Modo pacientes (Nuevo / Modificar) + id seleccionado
  const [pacMode, setPacMode] = useState("nuevo"); // "nuevo" | "modificar"
  const [pacEditId, setPacEditId] = useState("");

  // ===== Profesionales (solo para Turnos) =====
  const [proList, setProList] = useState([]);

  // ===== Obras Sociales =====
  const [obrasSociales, setObrasSociales] = useState(OBRAS_SOCIALES_FALLBACK);

  // ===== Turnos =====
  const [anchor, setAnchor] = useState(() => startOfWeekLocal(new Date()));
  const [formTur, setFormTur] = useState(emptyTurnoForm());
  const [loadingTur, setLoadingTur] = useState(false);
  const [errorTur, setErrorTur] = useState("");

  // === Repeticiones (UI): x1..x4 solo para Terapia Manual ===
  useEffect(() => {
    // Si no es Terapia Manual, forzamos x1
    if (Number(formTur.tratamientoId) !== 1) {
      setFormTur((s) => ({ ...s, repeatCount: 1 }));
    } else {
      // clamp 1..4
      setFormTur((s) => ({
        ...s,
        repeatCount: Math.min(4, Math.max(1, Number(s.repeatCount || 1))),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formTur.tratamientoId]);

  // ===== Carga inicial =====
  useEffect(() => {
    if (!useBackend) return;

    (async () => {
      try {
        const r = await listarPacientes();
        if (Array.isArray(r)) setPacList(r);
      } catch (e) {
        console.error("Error listando pacientes", e);
      }

      try {
        const r = await listarProfesionales();
        if (Array.isArray(r)) setProList(r);
      } catch (e) {
        console.error("Error listando profesionales", e);
        setProList([]);
      }

      try {
        const r = await listarObrasSociales();
        if (Array.isArray(r) && r.length > 0) setObrasSociales(r);
        else setObrasSociales(OBRAS_SOCIALES_FALLBACK);
      } catch (e) {
        console.error("Error listando obras sociales", e);
        setObrasSociales(OBRAS_SOCIALES_FALLBACK);
      }
    })();
  }, [useBackend]);

  // ✅ Si viene un turno seleccionado desde grilla
  useEffect(() => {
    if (!selectedTurno) return;
    const mapped = mapAppointmentToTurnoForm(selectedTurno);
    if (!mapped) return;

    setTab("turnos");
    setFormTur(mapped);

    if (mapped.fecha) {
      const d = parseYMDToLocal(mapped.fecha);
      if (d) setAnchor(startOfWeekLocal(d));
    }
  }, [selectedTurno]);

  const pacientesOptions = useMemo(
    () =>
      pacList
        .map((p) => ({ id: p.id, nombre: p.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    [pacList]
  );

  const profesionalesOptions = useMemo(
    () =>
      proList.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        especialidad: p.especialidad,
      })),
    [proList]
  );

  // ✅ cuando cambia modo pacientes, reseteamos selección/form
  useEffect(() => {
    setErrorPac("");
    if (pacMode === "nuevo") {
      setPacEditId("");
      setFormPac(mapPacienteABMForm({}));
    } else {
      setPacEditId("");
      setFormPac(mapPacienteABMForm({}));
    }
  }, [pacMode]);

  // ✅ al seleccionar paciente para modificar, cargamos el form
  useEffect(() => {
    if (pacMode !== "modificar") return;

    if (!pacEditId) {
      setFormPac(mapPacienteABMForm({}));
      return;
    }

    const found = pacList.find((p) => String(p.id) === String(pacEditId));
    if (found) setFormPac(mapPacienteABMForm(found));
    else setFormPac(mapPacienteABMForm({}));
  }, [pacMode, pacEditId, pacList]);

  async function submitPaciente(e) {
    e.preventDefault();
    setErrorPac("");
    setLoadingPac(true);
    try {
      if (pacMode === "modificar") {
        if (!formPac.id)
          throw new Error("Seleccioná un paciente para modificar.");
        await modificarPaciente(formPac);
      } else {
        await crearPaciente(formPac);
      }

      try {
        const r = await listarPacientes();
        if (Array.isArray(r)) setPacList(r);
      } catch (e2) {
        console.error("Error recargando pacientes", e2);
      }

      if (pacMode === "modificar") {
        setPacEditId("");
        setFormPac(mapPacienteABMForm({}));
      } else {
        setFormPac(mapPacienteABMForm({}));
      }

      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorPac(err.message || "Error al guardar paciente");
    } finally {
      setLoadingPac(false);
    }
  }

  /** ✅ Validación previa de disponibilidad (solo para crear tratamientos 1/2) */
  async function validarDisponibilidadProfesional({
    profesionalId,
    fechaYMD,
    horaIni,
    horaFin,
  }) {
    const profIdNum = Number(profesionalId);
    if (!Number.isFinite(profIdNum) || !fechaYMD) return null;

    const myStart = parseHMToMinutes(horaIni);
    const myEnd = parseHMToMinutes(horaFin);

    if (myStart == null || myEnd == null) return null;

    const profName =
      proList.find((p) => String(p.id) === String(profesionalId))?.nombre ||
      "El profesional";

    let appts = [];
    try {
      appts = await fetchTurnosProfesionalPorFecha(profIdNum, fechaYMD);
    } catch (e) {
      // si falla la validación, no bloqueamos (dejamos que backend decida)
      if (DEBUG_AVAIL) console.warn("[AVAIL] no se pudo validar", e);
      return null;
    }

    if (DEBUG_AVAIL) {
      console.log("[AVAIL] check", {
        profesionalId: profIdNum,
        fechaYMD,
        myStart,
        myEnd,
        appts,
      });
    }

    for (const a of appts) {
      // ignoramos cancelados o inactivos
      if (a?.active === false) continue;

      const { start, end } = getApptStartEndMinutes(a);
      if (!overlaps(myStart, myEnd, start, end)) continue;

      const patient = a.patient || "—";
      const therapy = a.treatment || "—";
      const aIni = a?.raw?.horaIni || a?.raw?.hora_inicio || "";
      const aFin = a?.raw?.horaFin || a?.raw?.hora_fin || "";

      // mensaje amigable
      return `${profName} ya tiene ocupado ese horario por el paciente ${patient} con ${therapy}${
        aIni && aFin ? ` (${aIni}–${aFin})` : ""
      }.`;
    }

    return null;
  }

  async function submitTurno(e) {
    e.preventDefault();
    setErrorTur("");
    setLoadingTur(true);

    try {
      const payloadBase = {
        idPaciente: Number(formTur.idPaciente),
        idProfecional: Number(formTur.idProfecional),
        idTratamiento: Number(formTur.tratamientoId || 1), // ✅ backend real
        fecha: formTur.fecha,
        horaIni: formTur.horaIni,
        horaFin: formTur.horaFin,
        obs: formTur.obs || "",
      };

      if (formTur.id) {
        // ✅ edición: 1 solo
        const payload = { ...payloadBase, id: formTur.id };
        await modificarTurno(payload);
      } else {
        // ✅ alta:
        const isEjerciciosAdaptados = Number(formTur.tratamientoId) === 3;

        // ✅ Si NO es ejercicios adaptados, validamos ocupación antes de crear
        // (porque backend no deja más de uno por horario)
        if (!isEjerciciosAdaptados) {
          // OJO: si terapia manual tiene repeatCount > 1, validamos cada fecha a crear
          const isTerapiaManual = Number(formTur.tratamientoId) === 1;
          const repeatCount = isTerapiaManual
            ? Math.min(4, Math.max(1, Number(formTur.repeatCount || 1)))
            : 1;

          const baseDate =
            parseYMDToLocal(formTur.fecha) || new Date(formTur.fecha);

          for (let i = 0; i < repeatCount; i++) {
            const d = addDaysLocal(baseDate, i * 7);
            const fecha = fmtLocal(d);

            const msg = await validarDisponibilidadProfesional({
              profesionalId: formTur.idProfecional,
              fechaYMD: fecha,
              horaIni: formTur.horaIni,
              horaFin: formTur.horaFin,
            });

            if (msg) {
              // frenamos todo (evita creaciones parciales)
              setErrorTur(msg);
              setLoadingTur(false);
              return;
            }
          }
        }

        // ✅ creación real (si ejercicios adaptados, pasa directo)
        const isTerapiaManual = Number(formTur.tratamientoId) === 1;
        const repeatCount =
          isTerapiaManual && !formTur.id
            ? Math.min(4, Math.max(1, Number(formTur.repeatCount || 1)))
            : 1;

        const baseDate =
          parseYMDToLocal(formTur.fecha) || new Date(formTur.fecha);

        if (DEBUG_REPEAT) {
          console.log("[ABMPanel] crear turno(s)", {
            repeatCount,
            fechaBase: formTur.fecha,
            payloadBase,
          });
        }

        for (let i = 0; i < repeatCount; i++) {
          const d = addDaysLocal(baseDate, i * 7);
          const fecha = fmtLocal(d);
          const payload = { ...payloadBase, fecha };

          if (DEBUG_REPEAT)
            console.log("[ABMPanel] crearTurno", { i, fecha, payload });

          await crearTurno(payload);
        }
      }

      setFormTur(emptyTurnoForm());
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorTur(err.message || "Error al guardar turno");
    } finally {
      setLoadingTur(false);
    }
  }

  async function eliminarTurnoActual() {
    if (!formTur.id) return;
    setErrorTur("");
    setLoadingTur(true);
    try {
      await cancelarTurno(formTur.id);
      setFormTur(emptyTurnoForm());
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorTur(err.message || "No se pudo cancelar el turno");
    } finally {
      setLoadingTur(false);
    }
  }

  return (
    <div className="abm-panel">
      {/* Tabs NO scrolleables */}
      <div className="segmented">
        <button
          type="button"
          className={tab === "pacientes" ? "active" : ""}
          onClick={() => setTab("pacientes")}
        >
          <span className="material-symbols-rounded">group</span> Pacientes
        </button>

        <button
          type="button"
          className={tab === "turnos" ? "active" : ""}
          onClick={() => setTab("turnos")}
        >
          <span className="material-symbols-rounded">calendar_month</span>{" "}
          Turnos
        </button>
      </div>

      {/* Scroll real: SOLO el contenido */}
      <div className="abm-scroll">
        {tab === "pacientes" && (
          <form
            className="form"
            onSubmit={submitPaciente}
            style={{ marginTop: 10 }}
          >
            {/* selector de modo */}
            <div className="inline" style={{ gap: 10 }}>
              <button
                type="button"
                className={
                  pacMode === "nuevo" ? "btn-ghost active" : "btn-ghost"
                }
                onClick={() => setPacMode("nuevo")}
                disabled={loadingPac}
                title="Nuevo paciente"
              >
                Nuevo
              </button>
              <button
                type="button"
                className={
                  pacMode === "modificar" ? "btn-ghost active" : "btn-ghost"
                }
                onClick={() => setPacMode("modificar")}
                disabled={loadingPac}
                title="Modificar paciente existente"
              >
                Modificar
              </button>
            </div>

            {pacMode === "modificar" && (
              <label>
                Paciente
                <select
                  value={pacEditId || ""}
                  onChange={(e) => setPacEditId(e.target.value)}
                  disabled={loadingPac}
                  required
                >
                  <option value="">-- Seleccionar paciente --</option>
                  {pacientesOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Nombre
              <input
                value={formPac.nombre}
                onChange={(e) =>
                  setFormPac((s) => ({ ...s, nombre: e.target.value }))
                }
                required
              />
            </label>

            <div className="abm-row-2">
              <label>
                DNI
                <input
                  inputMode="numeric"
                  value={formPac.dni}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, dni: e.target.value }))
                  }
                />
              </label>
              <label>
                Celular
                <input
                  inputMode="tel"
                  value={formPac.celular}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, celular: e.target.value }))
                  }
                />
              </label>
            </div>

            <label>
              E-mail
              <input
                type="email"
                value={formPac.mail}
                onChange={(e) =>
                  setFormPac((s) => ({ ...s, mail: e.target.value }))
                }
              />
            </label>

            <div className="abm-row-2">
              <label>
                Fecha Nacimiento
                <input
                  type="date"
                  value={formPac.fechaNacimiento}
                  onChange={(e) =>
                    setFormPac((s) => ({
                      ...s,
                      fechaNacimiento: e.target.value,
                    }))
                  }
                />
              </label>

              <label>
                Obra Social
                <select
                  value={formPac.idObraSocial || ""}
                  onChange={(e) =>
                    setFormPac((s) => ({
                      ...s,
                      idObraSocial: e.target.value
                        ? Number(e.target.value)
                        : "",
                    }))
                  }
                >
                  <option value="">-- Seleccionar --</option>
                  {obrasSociales.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Dirección
              <input
                value={formPac.direccion}
                onChange={(e) =>
                  setFormPac((s) => ({ ...s, direccion: e.target.value }))
                }
              />
            </label>

            <div className="abm-row-2">
              <label>
                Usuario
                <input
                  value={formPac.usuario}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, usuario: e.target.value }))
                  }
                />
              </label>
              <label>
                Clave
                <input
                  type="password"
                  value={formPac.clave}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, clave: e.target.value }))
                  }
                />
              </label>
            </div>

            {errorPac && (
              <div className="error">
                <span className="material-symbols-rounded">error</span>
                {errorPac}
              </div>
            )}

            <div className="inline" style={{ gap: 10 }}>
              <button className="primary" disabled={loadingPac}>
                {pacMode === "modificar" ? "Guardar" : "Crear"}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setErrorPac("");
                  setPacEditId("");
                  setFormPac(mapPacienteABMForm({}));
                }}
                disabled={loadingPac}
                title="Limpiar"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {tab === "turnos" && (
          <form
            className="form"
            onSubmit={submitTurno}
            style={{ marginTop: 10 }}
          >
            <div className="inline" style={{ gap: 10 }}>
              <span className="muted">Semana de {fmtLocal(anchor)}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor(
                      (d) =>
                        new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
                    )
                  }
                  title="Semana anterior"
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor(
                      (d) =>
                        new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
                    )
                  }
                  title="Semana siguiente"
                >
                  <span className="material-symbols-rounded">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            <div className="abm-row-2">
              <label>
                Paciente
                <select
                  value={formTur.idPaciente || ""}
                  onChange={(e) =>
                    setFormTur((s) => ({
                      ...s,
                      idPaciente: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  required
                >
                  <option value="">-- Seleccionar paciente --</option>
                  {pacientesOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Profesional
                <select
                  value={formTur.idProfecional || ""}
                  onChange={(e) =>
                    setFormTur((s) => ({
                      ...s,
                      idProfecional: e.target.value
                        ? Number(e.target.value)
                        : "",
                    }))
                  }
                  required
                >
                  <option value="">-- Seleccionar profesional --</option>
                  {profesionalesOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.especialidad ? ` (${p.especialidad})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="abm-turnos-fecha-horas">
              <label>
                Fecha
                <input
                  type="date"
                  value={formTur.fecha}
                  onChange={(e) =>
                    setFormTur((s) => ({ ...s, fecha: e.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Hora inicio
                <input
                  type="time"
                  value={formTur.horaIni}
                  onChange={(e) =>
                    setFormTur((s) => ({ ...s, horaIni: e.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Hora fin
                <input
                  type="time"
                  value={formTur.horaFin}
                  onChange={(e) =>
                    setFormTur((s) => ({ ...s, horaFin: e.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <label>
              Tratamiento
              <select
                value={formTur.tratamientoId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setFormTur((s) => ({ ...s, tratamientoId: id }));
                }}
                required
              >
                {TRATAMIENTOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>

            {/* x1..x4: solo Terapia Manual */}
            {Number(formTur.tratamientoId) === 1 && (
              <label>
                Repetir (semanal)
                <select
                  value={formTur.id ? 1 : formTur.repeatCount || 1}
                  onChange={(e) =>
                    setFormTur((s) => ({
                      ...s,
                      repeatCount: Number(e.target.value),
                    }))
                  }
                  disabled={!!formTur.id}
                  title={
                    formTur.id
                      ? "En edición no se repite"
                      : "xN crea repeticiones semanales"
                  }
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      x{n}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Observaciones
              <input
                value={formTur.obs}
                onChange={(e) =>
                  setFormTur((s) => ({ ...s, obs: e.target.value }))
                }
              />
            </label>

            {errorTur && (
              <div
                role="alert"
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,0,0,.25)",
                  background: "rgba(255,0,0,.08)",
                  fontWeight: 800,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span className="material-symbols-rounded">error</span>
                <span>{errorTur}</span>
              </div>
            )}

            <div className="inline" style={{ gap: 10 }}>
              <button className="primary" disabled={loadingTur}>
                {formTur.id ? "Guardar cambios" : "Crear turno"}
              </button>

              {formTur.id && (
                <>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setFormTur(emptyTurnoForm())}
                    disabled={loadingTur}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={eliminarTurnoActual}
                    disabled={loadingTur}
                    title="Eliminar turno"
                  >
                    <span className="material-symbols-rounded">delete</span>{" "}
                    Borrar turno
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
