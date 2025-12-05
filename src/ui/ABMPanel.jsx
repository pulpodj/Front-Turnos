// src/ui/ABMPanel.jsx
import { useEffect, useMemo, useState } from "react";
import {
  // BACKEND
  crearPaciente,
  modificarPaciente,
  listarPacientes,
  crearProfesional,
  modificarProfesional,
  listarProfesionales,
  crearTurno,
  modificarTurno,
  cancelarTurno,
  mapPacienteABMForm,
  mapProfesionalABMForm,
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

// ===== Utilidades mínimas =====
const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};
const fmt = (d) => d.toISOString().slice(0, 10);
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8..17 (por si después armamos grilla)

export default function ABMPanel({ onDataChanged }) {
  const [tab, setTab] = useState("pacientes"); // 'pacientes' | 'profesionales' | 'turnos'
  const useBackend = !!getBackendToken();

  // ===== Pacientes =====
  const [pacList, setPacList] = useState([]);
  const [pacNombreSearch, setPacNombreSearch] = useState("");
  const [formPac, setFormPac] = useState(mapPacienteABMForm({}));
  const [loadingPac, setLoadingPac] = useState(false);
  const [errorPac, setErrorPac] = useState("");

  // ===== Profesionales =====
  const [proList, setProList] = useState([]);
  const [proNombreSearch, setProNombreSearch] = useState("");
  const [formPro, setFormPro] = useState(mapProfesionalABMForm({}));
  const [loadingPro, setLoadingPro] = useState(false);
  const [errorPro, setErrorPro] = useState("");

  // ===== Obras Sociales (desde backend) =====
  const [obrasSociales, setObrasSociales] = useState(OBRAS_SOCIALES_FALLBACK);

  // ===== Turnos =====
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [formTur, setFormTur] = useState({
    id: null,
    idPaciente: "",
    idProfecional: "", // mantengo el nombre EXACTO de tu API (“Profecional”)
    fecha: fmt(new Date()),
    horaIni: "08:00",
    horaFin: "09:00",
    obs: "",
    estado: "pendiente",
  });
  const [loadingTur, setLoadingTur] = useState(false);
  const [errorTur, setErrorTur] = useState("");

  // ===== Carga inicial de listados =====
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
      }
      try {
        const r = await listarObrasSociales();
        if (Array.isArray(r) && r.length > 0) {
          setObrasSociales(r);
        } else {
          setObrasSociales(OBRAS_SOCIALES_FALLBACK);
        }
      } catch (e) {
        console.error("Error listando obras sociales", e);
        setObrasSociales(OBRAS_SOCIALES_FALLBACK);
      }
    })();
  }, [useBackend]);

  // ===== Memo para filtrar por nombre =====
  const pacientesFiltrados = useMemo(
    () =>
      pacList.filter((p) =>
        pacNombreSearch
          ? (p.nombre || "")
              .toLowerCase()
              .includes(pacNombreSearch.toLowerCase())
          : true
      ),
    [pacList, pacNombreSearch]
  );

  const profesionalesFiltrados = useMemo(
    () =>
      proList.filter((p) =>
        proNombreSearch
          ? (p.nombre || "")
              .toLowerCase()
              .includes(proNombreSearch.toLowerCase())
          : true
      ),
    [proList, proNombreSearch]
  );

  function seleccionarPaciente(id) {
    const p = pacList.find((x) => String(x.id) === String(id));
    if (p) setFormPac(mapPacienteABMForm(p));
  }

  function seleccionarProfesional(id) {
    const p = proList.find((x) => String(x.id) === String(id));
    if (p) setFormPro(mapProfesionalABMForm(p));
  }

  // ===== PACIENTES: CRUD =====
  async function submitPaciente(e) {
    e.preventDefault();
    setErrorPac("");
    setLoadingPac(true);
    try {
      if (formPac.id) {
        await modificarPaciente(formPac);
      } else {
        await crearPaciente(formPac);
      }
      try {
        const r = await listarPacientes();
        if (Array.isArray(r)) setPacList(r);
      } catch (e) {
        console.error("Error recargando pacientes", e);
      }
      setFormPac(mapPacienteABMForm({}));
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorPac(err.message || "Error al guardar paciente");
    } finally {
      setLoadingPac(false);
    }
  }

  // ===== PROFESIONALES: CRUD =====
  async function submitProfesional(e) {
    e.preventDefault();
    setErrorPro("");
    setLoadingPro(true);
    try {
      if (formPro.id) {
        await modificarProfesional(formPro);
      } else {
        await crearProfesional(formPro);
      }
      try {
        const r = await listarProfesionales();
        if (Array.isArray(r)) setProList(r);
      } catch (e) {
        console.error("Error recargando profesionales", e);
      }
      setFormPro(mapProfesionalABMForm({}));
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorPro(err.message || "Error al guardar profesional");
    } finally {
      setLoadingPro(false);
    }
  }

  // ===== TURNOS: CRUD =====
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

      setFormTur({
        id: null,
        idPaciente: "",
        idProfecional: "",
        fecha: fmt(new Date()),
        horaIni: "08:00",
        horaFin: "09:00",
        obs: "",
        estado: "pendiente",
      });
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
      setFormTur({
        id: null,
        idPaciente: "",
        idProfecional: "",
        fecha: fmt(new Date()),
        horaIni: "08:00",
        horaFin: "09:00",
        obs: "",
        estado: "pendiente",
      });
      onDataChanged && onDataChanged();
    } catch (err) {
      setErrorTur(err.message || "No se pudo cancelar el turno");
    } finally {
      setLoadingTur(false);
    }
  }

  return (
    <div
      className="abm-panel"
      style={{ maxHeight: "calc(100vh - 160px)", overflowY: "auto" }}
    >
      <div className="segmented" style={{ marginBottom: 12 }}>
        <button
          className={tab === "pacientes" ? "active" : ""}
          onClick={() => setTab("pacientes")}
        >
          <span className="material-symbols-rounded">group</span> Pacientes
        </button>
        <button
          className={tab === "profesionales" ? "active" : ""}
          onClick={() => setTab("profesionales")}
        >
          <span className="material-symbols-rounded">stethoscope</span>{" "}
          Profesionales
        </button>
        <button
          className={tab === "turnos" ? "active" : ""}
          onClick={() => setTab("turnos")}
        >
          <span className="material-symbols-rounded">calendar_month</span>{" "}
          Turnos
        </button>
      </div>

      {/* ===================== PACIENTES ===================== */}
      {tab === "pacientes" && (
        <>
          <form className="form" onSubmit={submitPaciente}>

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

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                DNI
                <input
                  inputMode="numeric"
                  value={formPac.dni}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, dni: e.target.value }))
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
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

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
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
              <label style={{ flex: 1 }}>
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

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Usuario
                <input
                  value={formPac.usuario}
                  onChange={(e) =>
                    setFormPac((s) => ({ ...s, usuario: e.target.value }))
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
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

          {useBackend && pacList.length > 0 && (
            <>
              <div className="list-head" style={{ marginTop: 8 }}>
                <span className="muted">Pacientes ({pacList.length})</span>
              </div>
              <ul className="abm-list">
                {pacList.map((p) => (
                  <li key={p.id} className="row">
                    <div>
                      <strong>{p.nombre}</strong>{" "}
                      <span className="muted">
                        · DNI {p.dni || "—"} · {p.mail || "s/email"}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn-mini"
                        onClick={() => setFormPac(mapPacienteABMForm(p))}
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* ===================== PROFESIONALES ===================== */}
      {tab === "profesionales" && (
        <>
          <form className="form" onSubmit={submitProfesional}>
            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Buscar por nombre
                <input
                  placeholder="Ej: Milton Neffen"
                  value={proNombreSearch}
                  onChange={(e) => setProNombreSearch(e.target.value)}
                />
              </label>
              <label style={{ flex: 1 }}>
                Seleccionar profesional
                <select
                  value={formPro.id || ""}
                  onChange={(e) => seleccionarProfesional(e.target.value)}
                >
                  <option value="">-- Seleccionar profesional --</option>
                  {profesionalesFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Nombre
              <input
                value={formPro.nombre}
                onChange={(e) =>
                  setFormPro((s) => ({ ...s, nombre: e.target.value }))
                }
                required
              />
            </label>
            <label>
              Especialidad
              <input
                value={formPro.especialidad}
                onChange={(e) =>
                  setFormPro((s) => ({
                    ...s,
                    especialidad: e.target.value,
                  }))
                }
              />
            </label>

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Celular
                <input
                  inputMode="tel"
                  value={formPro.celular}
                  onChange={(e) =>
                    setFormPro((s) => ({ ...s, celular: e.target.value }))
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
                E-mail
                <input
                  type="email"
                  value={formPro.mail}
                  onChange={(e) =>
                    setFormPro((s) => ({ ...s, mail: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Usuario
                <input
                  value={formPro.usuario}
                  onChange={(e) =>
                    setFormPro((s) => ({ ...s, usuario: e.target.value }))
                  }
                />
              </label>
              <label style={{ flex: 1 }}>
                Clave
                <input
                  type="password"
                  value={formPro.clave}
                  onChange={(e) =>
                    setFormPro((s) => ({ ...s, clave: e.target.value }))
                  }
                />
              </label>
            </div>

            {errorPro && (
              <div className="error">
                <span className="material-symbols-rounded">error</span>
                {errorPro}
              </div>
            )}

            <div className="inline" style={{ gap: 10 }}>
              <button className="primary" disabled={loadingPro}>
                {formPro.id ? "Guardar cambios" : "Crear profesional"}
              </button>
              {formPro.id && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setFormPro(mapProfesionalABMForm({}))}
                  disabled={loadingPro}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {useBackend && proList.length > 0 && (
            <>
              <div className="list-head" style={{ marginTop: 8 }}>
                <span className="muted">
                  Profesionales ({proList.length})
                </span>
              </div>
              <ul className="abm-list">
                {proList.map((p) => (
                  <li key={p.id} className="row">
                    <div>
                      <strong>{p.nombre}</strong>{" "}
                      <span className="muted">
                        · {p.especialidad || "s/especialidad"} ·{" "}
                        {p.mail || "s/email"}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button
                        className="btn-mini"
                        onClick={() =>
                          setFormPro(mapProfesionalABMForm(p))
                        }
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {/* ===================== TURNOS ===================== */}
      {tab === "turnos" && (
        <>
          <form className="form" onSubmit={submitTurno}>
            <div className="inline" style={{ gap: 10 }}>
              <span className="muted">Semana de {fmt(anchor)}</span>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor(
                      (d) =>
                        new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate() - 7
                        )
                    )
                  }
                >
                  <span className="material-symbols-rounded">
                    chevron_left
                  </span>
                </button>
                <button
                  type="button"
                  className="btn-mini"
                  onClick={() =>
                    setAnchor(
                      (d) =>
                        new Date(
                          d.getFullYear(),
                          d.getMonth(),
                          d.getDate() + 7
                        )
                    )
                  }
                >
                  <span className="material-symbols-rounded">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {/* 👇 Ya NO está "Buscar Turno por ID" */}

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
                Paciente
                <select
                  value={formTur.idPaciente || ""}
                  onChange={(e) =>
                    setFormTur((s) => ({
                      ...s,
                      idPaciente: e.target.value
                        ? Number(e.target.value)
                        : "",
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

              <label style={{ flex: 1 }}>
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
                  {proList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.especialidad ? ` (${p.especialidad})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inline" style={{ gap: 10 }}>
              <label style={{ flex: 1 }}>
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
              <label style={{ flex: 1 }}>
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
              <label style={{ flex: 1 }}>
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
              Observaciones
              <input
                value={formTur.obs}
                onChange={(e) =>
                  setFormTur((s) => ({ ...s, obs: e.target.value }))
                }
              />
            </label>

            <label>
              Estado
              <select
                value={formTur.estado}
                onChange={(e) =>
                  setFormTur((s) => ({ ...s, estado: e.target.value }))
                }
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
                    onClick={() =>
                      setFormTur({
                        id: null,
                        idPaciente: "",
                        idProfecional: "",
                        fecha: fmt(new Date()),
                        horaIni: "08:00",
                        horaFin: "09:00",
                        obs: "",
                        estado: "pendiente",
                      })
                    }
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={eliminarTurnoActual}
                    disabled={loadingTur}
                  >
                    <span className="material-symbols-rounded">delete</span>{" "}
                    Cancelar turno
                  </button>
                </>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
