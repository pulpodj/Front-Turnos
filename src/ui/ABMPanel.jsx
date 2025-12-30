// src/ui/ABMPanel.jsx
import { useEffect, useState } from "react";
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

// ===== Obras sociales (fallback local) =====
const OBRAS_SOCIALES_FALLBACK = [
  { id: 1, nombre: "OSDE" },
  { id: 2, nombre: "Swiss Medical" },
  { id: 3, nombre: "PAMI" },
  { id: 4, nombre: "Galeno" },
];

// ===== Tratamientos (Turnos) =====
const TURNOS_TRATAMIENTOS = [
  "Terapia Manual",
  "Kinesiología Convencional",
  "Ejercicios Adaptados",
];

// ===== Utilidades mínimas =====
const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};
const fmt = (d) => d.toISOString().slice(0, 10);

const emptyTurnoForm = () => ({
  id: null,
  idPaciente: "",
  idProfecional: "",
  fecha: fmt(new Date()),
  horaIni: "08:00",
  horaFin: "09:00",
  tratamiento: TURNOS_TRATAMIENTOS[0],
  obs: "",
  estado: "pendiente",
});

export default function ABMPanel({ onDataChanged }) {
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
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
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

  // ===== CRUD Pacientes =====
  async function submitPaciente(e) {
    e.preventDefault();
    setErrorPac("");
    setLoadingPac(true);
    try {
      if (formPac.id) await modificarPaciente(formPac);
      else await crearPaciente(formPac);

      // recargar lista (necesaria para el select de turnos)
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

  // ===== CRUD Turnos =====
  async function submitTurno(e) {
    e.preventDefault();
    setErrorTur("");
    setLoadingTur(true);
    try {
      const payload = {
        ...formTur,
        idPaciente: Number(formTur.idPaciente),
        idProfecional: Number(formTur.idProfecional),
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
      {/* Tabs fijos (NO scrollean) */}
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

      {/* ✅ Scroll real acá */}
      <div className="abm-scroll">
        {/* ===================== PACIENTES ===================== */}
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

        {/* ===================== TURNOS ===================== */}
        {tab === "turnos" && (
          <form className="form" onSubmit={submitTurno} style={{ marginTop: 10 }}>
            <div className="inline" style={{ gap: 10 }}>
              <span className="muted">Semana de {fmt(anchor)}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
                  }
                >
                  <span className="material-symbols-rounded">chevron_left</span>
                </button>
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
                  }
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
                  {pacList.map((p) => (
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
                  {proList.map((p) => (
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
                value={formTur.tratamiento}
                onChange={(e) => setFormTur((s) => ({ ...s, tratamiento: e.target.value }))}
              >
                {TURNOS_TRATAMIENTOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
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

            <label>
              Estado
              <select
                value={formTur.estado}
                onChange={(e) => setFormTur((s) => ({ ...s, estado: e.target.value }))}
              >
                <option value="pendiente">pendiente</option>
                <option value="confirmado">confirmado</option>
                <option value="cancelado">cancelado</option>
                <option value="finalizado">finalizado</option>
              </select>
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
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={eliminarTurnoActual}
                    disabled={loadingTur}
                  >
                    <span className="material-symbols-rounded">delete</span> Cancelar turno
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
