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
  TRATAMIENTOS.find((t) => Number(t.id) === Number(id))?.nombre || "Terapia Manual";

const tratamientoIdByNombre = (nombre) =>
  TRATAMIENTOS.find((t) => String(t.nombre).toLowerCase() === String(nombre).toLowerCase())
    ?.id || 1;

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

const emptyTurnoForm = () => ({
  id: null,
  idPaciente: "",
  idProfecional: "",
  fecha: fmtLocal(new Date()),
  horaIni: "07:00",
  horaFin: "08:00",
  tratamientoId: 1,
  obs: "",
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
    const hh = String(Math.min(23, Math.max(0, Math.floor(endH)))).padStart(2, "0");
    horaFin = `${hh}:00`;
  }

  const idPaciente =
    raw.idPaciente ??
    raw.paciente_id ??
    raw.patient_id ??
    appt.patientId ??
    "";

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
  };
}

export default function ABMPanel({ onDataChanged, selectedTurno }) {
  const [tab, setTab] = useState("pacientes");
  const useBackend = !!getBackendToken();

  // ===== Pacientes =====
  const [pacList, setPacList] = useState([]);
  const [formPac, setFormPac] = useState(mapPacienteABMForm({}));
  const [loadingPac, setLoadingPac] = useState(false);
  const [errorPac, setErrorPac] = useState("");

  // ===== Profesionales (solo para Turnos) =====
  const [proList, setProList] = useState([]);

  // ===== Obras Sociales =====
  const [obrasSociales, setObrasSociales] = useState(OBRAS_SOCIALES_FALLBACK);

  // ===== Turnos =====
  const [anchor, setAnchor] = useState(() => startOfWeekLocal(new Date()));
  const [formTur, setFormTur] = useState(emptyTurnoForm());
  const [loadingTur, setLoadingTur] = useState(false);
  const [errorTur, setErrorTur] = useState("");

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
    () => pacList.map((p) => ({ id: p.id, nombre: p.nombre })),
    [pacList]
  );

  const profesionalesOptions = useMemo(
    () => proList.map((p) => ({ id: p.id, nombre: p.nombre, especialidad: p.especialidad })),
    [proList]
  );

  async function submitPaciente(e) {
    e.preventDefault();
    setErrorPac("");
    setLoadingPac(true);
    try {
      if (formPac.id) await modificarPaciente(formPac);
      else await crearPaciente(formPac);

      try {
        const r = await listarPacientes();
        if (Array.isArray(r)) setPacList(r);
      } catch (e2) {
        console.error("Error recargando pacientes", e2);
      }

      setFormPac(mapPacienteABMForm({}));
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorPac(err.message || "Error al guardar paciente");
    } finally {
      setLoadingPac(false);
    }
  }

  async function submitTurno(e) {
    e.preventDefault();
    setErrorTur("");
    setLoadingTur(true);

    try {
      const payload = {
        ...(formTur.id ? { id: formTur.id } : {}),
        idPaciente: Number(formTur.idPaciente),
        idProfecional: Number(formTur.idProfecional),
        idTratamiento: Number(formTur.tratamientoId || 1), // ✅ backend real
        fecha: formTur.fecha,
        horaIni: formTur.horaIni,
        horaFin: formTur.horaFin,
        obs: formTur.obs || "",
      };

      if (formTur.id) await modificarTurno(payload);
      else await crearTurno(payload);

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
          <span className="material-symbols-rounded">calendar_month</span> Turnos
        </button>
      </div>

      {/* Scroll real: SOLO el contenido */}
      <div className="abm-scroll">
        {tab === "pacientes" && (
          <form className="form" onSubmit={submitPaciente} style={{ marginTop: 10 }}>
            <label>
              Nombre
              <input
                value={formPac.nombre}
                onChange={(e) => setFormPac((s) => ({ ...s, nombre: e.target.value }))}
                required
              />
            </label>

            <div className="abm-row-2">
              <label>
                DNI
                <input
                  inputMode="numeric"
                  value={formPac.dni}
                  onChange={(e) => setFormPac((s) => ({ ...s, dni: e.target.value }))}
                />
              </label>
              <label>
                Celular
                <input
                  inputMode="tel"
                  value={formPac.celular}
                  onChange={(e) => setFormPac((s) => ({ ...s, celular: e.target.value }))}
                />
              </label>
            </div>

            <label>
              E-mail
              <input
                type="email"
                value={formPac.mail}
                onChange={(e) => setFormPac((s) => ({ ...s, mail: e.target.value }))}
              />
            </label>

            <div className="abm-row-2">
              <label>
                Fecha Nacimiento
                <input
                  type="date"
                  value={formPac.fechaNacimiento}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, fechaNacimiento: e.target.value }))
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
                      idObraSocial: e.target.value ? Number(e.target.value) : "",
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
                onChange={(e) => setFormPac((s) => ({ ...s, direccion: e.target.value }))}
              />
            </label>

            <div className="abm-row-2">
              <label>
                Usuario
                <input
                  value={formPac.usuario}
                  onChange={(e) => setFormPac((s) => ({ ...s, usuario: e.target.value }))}
                />
              </label>
              <label>
                Clave
                <input
                  type="password"
                  value={formPac.clave}
                  onChange={(e) => setFormPac((s) => ({ ...s, clave: e.target.value }))}
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
                {formPac.id ? "Guardar cambios" : "Crear paciente"}
              </button>

              {formPac.id && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setFormPac(mapPacienteABMForm({}))}
                  disabled={loadingPac}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {tab === "turnos" && (
          <form className="form" onSubmit={submitTurno} style={{ marginTop: 10 }}>
            <div className="inline" style={{ gap: 10 }}>
              <span className="muted">Semana de {fmtLocal(anchor)}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
                  }
                  title="Semana anterior"
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
                  }
                  title="Semana siguiente"
                >
                  <span className="material-symbols-rounded">chevron_right</span>
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
                      idProfecional: e.target.value ? Number(e.target.value) : "",
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
                  onChange={(e) => setFormTur((s) => ({ ...s, fecha: e.target.value }))}
                  required
                />
              </label>

              <label>
                Hora inicio
                <input
                  type="time"
                  value={formTur.horaIni}
                  onChange={(e) => setFormTur((s) => ({ ...s, horaIni: e.target.value }))}
                  required
                />
              </label>

              <label>
                Hora fin
                <input
                  type="time"
                  value={formTur.horaFin}
                  onChange={(e) => setFormTur((s) => ({ ...s, horaFin: e.target.value }))}
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

            <label>
              Observaciones
              <input
                value={formTur.obs}
                onChange={(e) => setFormTur((s) => ({ ...s, obs: e.target.value }))}
              />
            </label>

            {errorTur && (
              <div className="error">
                <span className="material-symbols-rounded">error</span>
                {errorTur}
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
                    <span className="material-symbols-rounded">delete</span> Borrar turno
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
