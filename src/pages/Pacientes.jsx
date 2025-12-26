// src/pages/Pacientes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarPacientes } from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";
import { readSession } from "../utils/jwt.js";
import { resolveRole } from "../utils/role.js";

import {
  listarHistoriasClinicasPaciente,
  crearHistoriaClinica,
  actualizarHistoriaClinica,
  borrarHistoriaClinica,
} from "../api/historialClinicoBackend.js";

const TRATAMIENTOS = [
  "Terapia Manual",
  "Kinesiología Convencional",
  "Ejercicios Adaptados",
];

// ✅ PREVIEW UI SOLO EN DEV (no producción)
const PREVIEW_UI =
  import.meta.env.DEV && String(import.meta.env.VITE_HC_PREVIEW || "") === "1";

// Datos fake para ver el layout sin backend/token
const MOCK_PACIENTES = [
  { id: 101, nombre: "Juan Pérez", dni: "30111222", mail: "juan@mail.com", celular: "3492 111111" },
  { id: 102, nombre: "María Gómez", dni: "28999888", mail: "maria@mail.com", celular: "3492 222222" },
  { id: 103, nombre: "Santiago Aimar", dni: "40123456", mail: "santi@mail.com", celular: "3492 333333" },
];

const MOCK_HISTORIAS = (id_paciente) => ([
  {
    id: 9001,
    id_paciente,
    diagnostico: "Cervicalgia leve. Se indica terapia manual + ejercicios.",
    cant_sesiones: 8,
    fecha_ini: "2025-12-01",
    fecha_fin: "2025-12-20",
    tratamiento: "Terapia Manual",
    observaciones: "Mejora en ROM cervical. Dolor baja de 7/10 a 3/10.",
  },
  {
    id: 9002,
    id_paciente,
    diagnostico: "Lumbalgia por sobrecarga. Trabajo de core y movilidad.",
    cant_sesiones: 10,
    fecha_ini: "2025-11-10",
    fecha_fin: "2025-12-10",
    tratamiento: "Ejercicios Adaptados",
    observaciones: "Se tolera bien. Ajustar carga progresiva.",
  },
]);

const emptyForm = (id_paciente) => ({
  id: null,
  id_paciente: id_paciente || "",
  diagnostico: "",
  cant_sesiones: "",
  fecha_ini: "",
  fecha_fin: "",
  tratamiento: TRATAMIENTOS[0],
  observaciones: "",
});

export default function Pacientes() {
  const nav = useNavigate();

  const sess = readSession();
  const role = resolveRole(sess?.payload);
  const isMedico = role === "medico";

  // 🔒 Token real (para el modo real)
  const useBackend = !!getBackendToken();

  // ✅ Permitir entrada si:
  // - PREVIEW_UI (dev)
  // - o (token real y rol medico)
  const canEnter = PREVIEW_UI || (useBackend && isMedico);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pacientes, setPacientes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const [historias, setHistorias] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState("");

  const [form, setForm] = useState(emptyForm(""));

  // 🔒 Gate de permisos (pero PREVIEW lo saltea)
  if (!canEnter) {
    return (
      <div className="page-wrap">
        <main className="agenda-container" style={{ width: "100vw", maxWidth: "none" }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="error" role="alert">
              <span className="material-symbols-rounded" aria-hidden>error</span>
              No hay sesión activa o no tenés permisos para ver el historial clínico.
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Tip: si querés ver la UI sin permisos, activá <code>VITE_HC_PREVIEW=1</code> en <code>.env.local</code> (solo DEV).
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =========================
  // Cargar pacientes
  // =========================
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        if (PREVIEW_UI) {
          // ✅ Preview: datos fake
          if (ignore) return;
          setPacientes(MOCK_PACIENTES);
          setSelectedId((prev) => prev ?? MOCK_PACIENTES[0]?.id ?? null);
          return;
        }

        // ✅ Modo real: backend
        const list = await listarPacientes();
        const arr = Array.isArray(list) ? list : [];
        if (ignore) return;

        setPacientes(arr);
        setSelectedId((prev) => prev ?? (arr[0]?.id ?? null));
      } catch (e) {
        console.error(e);
        if (!ignore) {
          setError(e?.message || "No se pudo cargar pacientes");
          setPacientes([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, []);

  const selectedPaciente = useMemo(
    () => pacientes.find((p) => String(p.id) === String(selectedId)) || null,
    [pacientes, selectedId]
  );

  const filteredPacientes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pacientes;

    return pacientes.filter((p) => {
      const nombre = String(p?.nombre || "").toLowerCase();
      const dni = String(p?.dni || "");
      const mail = String(p?.mail || "").toLowerCase();
      return nombre.includes(q) || dni.includes(q) || mail.includes(q);
    });
  }, [pacientes, search]);

  // =========================
  // Cargar historias del paciente
  // =========================
  useEffect(() => {
    let ignore = false;

    (async () => {
      if (!selectedPaciente?.id) {
        setHistorias([]);
        setForm(emptyForm(""));
        return;
      }

      setHistLoading(true);
      setHistError("");

      try {
        if (PREVIEW_UI) {
          // ✅ Preview: historias fake
          const arr = MOCK_HISTORIAS(selectedPaciente.id);
          if (ignore) return;
          setHistorias(arr);
          setForm(emptyForm(selectedPaciente.id));
          return;
        }

        // ✅ Modo real
        const data = await listarHistoriasClinicasPaciente(selectedPaciente.id);
        const arr = Array.isArray(data) ? data : [];
        if (ignore) return;

        arr.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        setHistorias(arr);
        setForm(emptyForm(selectedPaciente.id));
      } catch (e) {
        console.error(e);
        if (!ignore) {
          setHistError(e?.message || "No se pudo cargar historial clínico");
          setHistorias([]);
          setForm(emptyForm(selectedPaciente.id));
        }
      } finally {
        if (!ignore) setHistLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, [selectedPaciente?.id]);

  const pickHistoria = (h) => {
    setForm({
      id: h?.id ?? null,
      id_paciente: h?.id_paciente ?? selectedPaciente?.id ?? "",
      diagnostico: h?.diagnostico ?? "",
      cant_sesiones: h?.cant_sesiones ?? "",
      fecha_ini: (h?.fecha_ini ?? "").slice(0, 10),
      fecha_fin: (h?.fecha_fin ?? "").slice(0, 10),
      tratamiento: h?.tratamiento ?? TRATAMIENTOS[0],
      observaciones: h?.observaciones ?? "",
    });
  };

  const newHistoria = () => setForm(emptyForm(selectedPaciente?.id));

  const reloadHistorias = async () => {
    if (!selectedPaciente?.id) return;

    setHistLoading(true);
    setHistError("");

    try {
      if (PREVIEW_UI) {
        setHistorias(MOCK_HISTORIAS(selectedPaciente.id));
        return;
      }

      const data = await listarHistoriasClinicasPaciente(selectedPaciente.id);
      const arr = Array.isArray(data) ? data : [];
      arr.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      setHistorias(arr);
    } catch (e) {
      console.error(e);
      setHistError(e?.message || "No se pudo recargar historial clínico");
    } finally {
      setHistLoading(false);
    }
  };

  const save = async () => {
    if (!selectedPaciente?.id) return;

    // ✅ Preview: no pega al backend, solo para ver UI
    if (PREVIEW_UI) {
      setHistError("");
      alert("PREVIEW_UI: Guardado simulado ✅ (no se envía al backend)");
      return;
    }

    // validaciones mínimas
    if (!form.tratamiento) return setHistError("Tratamiento es obligatorio");
    if (!form.fecha_ini) return setHistError("Fecha de inicio es obligatoria");

    setHistError("");
    try {
      const payload = {
        id: form.id,
        id_paciente: selectedPaciente.id,
        diagnostico: form.diagnostico,
        cant_sesiones: Number(form.cant_sesiones || 0),
        fecha_ini: form.fecha_ini,
        fecha_fin: form.fecha_fin || null,
        tratamiento: form.tratamiento,
        observaciones: form.observaciones,
      };

      if (form.id) await actualizarHistoriaClinica(payload);
      else await crearHistoriaClinica(payload);

      await reloadHistorias();
      newHistoria();
    } catch (e) {
      console.error(e);
      setHistError(e?.message || "No se pudo guardar");
    }
  };

  const del = async () => {
    if (!form.id) return;

    // ✅ Preview: no borra, solo UI
    if (PREVIEW_UI) {
      alert("PREVIEW_UI: Eliminación simulada ✅ (no se envía al backend)");
      return;
    }

    if (!confirm("¿Eliminar esta historia clínica?")) return;

    setHistError("");
    try {
      await borrarHistoriaClinica(form.id);
      await reloadHistorias();
      newHistoria();
    } catch (e) {
      console.error(e);
      setHistError(e?.message || "No se pudo eliminar");
    }
  };

  return (
    <div className="page-wrap">
      <main className="agenda-container" style={{ width: "100vw", maxWidth: "none" }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>
                Historial clínico
              </h2>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" className="btn-ghost" onClick={reloadHistorias} disabled={histLoading}>
                <span className="material-symbols-rounded" aria-hidden>refresh</span>
                Recargar
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => nav("/agenda")}
                title="Volver"
              >
                <span className="material-symbols-rounded" aria-hidden>arrow_back</span>
                Volver
              </button>
            </div>
          </div>

          {error && (
            <div className="error" style={{ marginTop: 12 }}>
              <span className="material-symbols-rounded" aria-hidden>error</span>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12, marginTop: 14 }}>
            {/* LISTA PACIENTES */}
            <section className="card" style={{ padding: 12 }}>
              <div className="form">
                <label style={{ marginBottom: 10 }}>
                  Buscar paciente
                  <input
                    placeholder="Nombre, DNI, mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>

                <div className="muted">
                  {loading ? "Cargando..." : `${filteredPacientes.length} / ${pacientes.length}`}
                </div>
              </div>

              <div style={{ marginTop: 10, maxHeight: "65vh", overflow: "auto" }}>
                <ul className="abm-list" style={{ margin: 0 }}>
                  {filteredPacientes.map((p) => {
                    const active = String(selectedId) === String(p.id);
                    return (
                      <li
                        key={p.id}
                        className="row"
                        style={{
                          cursor: "pointer",
                          outline: active ? "2px solid rgba(38,132,254,.25)" : "none",
                          borderRadius: 12,
                        }}
                        onClick={() => setSelectedId(p.id)}
                        title="Ver historial"
                      >
                        <div style={{ minWidth: 0 }}>
                          <strong>{p.nombre}</strong>{" "}
                          <span className="muted">· DNI {p.dni || "—"}</span>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {p.mail || "s/email"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* DETALLE + HISTORIAS */}
            <section className="card" style={{ padding: 12 }}>
              {!selectedPaciente ? (
                <div className="muted">Seleccioná un paciente.</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{selectedPaciente.nombre}</h3>
                      <div className="muted" style={{ marginTop: 4 }}>
                        DNI {selectedPaciente.dni || "—"} · {selectedPaciente.mail || "s/email"} · Tel{" "}
                        {selectedPaciente.celular || "—"}
                      </div>
                    </div>

                    <button type="button" className="btn-ghost" onClick={newHistoria}>
                      <span className="material-symbols-rounded" aria-hidden>add</span>
                      Nueva
                    </button>
                  </div>

                  {histError && (
                    <div className="error" style={{ marginTop: 12 }}>
                      <span className="material-symbols-rounded" aria-hidden>error</span>
                      {histError}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, marginTop: 12 }}>
                    {/* LISTA HISTORIAS */}
                    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,.65)" }}>
                      <div className="muted" style={{ marginBottom: 8 }}>
                        Historias clínicas ({histLoading ? "cargando..." : historias.length})
                      </div>

                      {historias.length === 0 ? (
                        <div className="muted">No hay historias cargadas para este paciente.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "52vh", overflow: "auto" }}>
                          {historias.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              className="btn-ghost"
                              onClick={() => pickHistoria(h)}
                              style={{
                                textAlign: "left",
                                padding: 10,
                                borderRadius: 12,
                                background: String(form.id) === String(h.id) ? "rgba(38,132,254,.10)" : "rgba(255,255,255,.55)",
                                border: "1px solid rgba(0,0,0,.06)",
                              }}
                              title="Editar esta historia"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {h.tratamiento || "—"}
                                </strong>
                                <span className="muted">#{h.id}</span>
                              </div>
                              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                                Sesiones: {h.cant_sesiones ?? 0} · {String(h.fecha_ini || "").slice(0, 10) || "—"} →{" "}
                                {String(h.fecha_fin || "").slice(0, 10) || "—"}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* FORM */}
                    <div className="card" style={{ padding: 12 }}>
                      <div className="muted" style={{ marginBottom: 8 }}>
                        {form.id ? `Editando historia #${form.id}` : "Nueva historia"}
                      </div>

                      <div className="form">
                        <label>
                          Tratamiento
                          <select
                            value={form.tratamiento}
                            onChange={(e) => setForm((s) => ({ ...s, tratamiento: e.target.value }))}
                          >
                            {TRATAMIENTOS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Diagnóstico
                          <textarea
                            value={form.diagnostico}
                            onChange={(e) => setForm((s) => ({ ...s, diagnostico: e.target.value }))}
                            placeholder="Evaluación / diagnóstico..."
                            style={{ minHeight: 90 }}
                          />
                        </label>

                        <div className="abm-row-2">
                          <label>
                            Cant. sesiones
                            <input
                              inputMode="numeric"
                              value={form.cant_sesiones}
                              onChange={(e) => setForm((s) => ({ ...s, cant_sesiones: e.target.value }))}
                            />
                          </label>

                          <label>
                            Inicio
                            <input
                              type="date"
                              value={form.fecha_ini}
                              onChange={(e) => setForm((s) => ({ ...s, fecha_ini: e.target.value }))}
                            />
                          </label>
                        </div>

                        <label>
                          Fin
                          <input
                            type="date"
                            value={form.fecha_fin}
                            onChange={(e) => setForm((s) => ({ ...s, fecha_fin: e.target.value }))}
                          />
                        </label>

                        <label>
                          Observaciones
                          <textarea
                            value={form.observaciones}
                            onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
                            placeholder="Notas / evolución / observaciones..."
                            style={{ minHeight: 90 }}
                          />
                        </label>

                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                          <button type="button" className="primary" onClick={save}>
                            <span className="material-symbols-rounded" aria-hidden>save</span>
                            Guardar
                          </button>

                          {form.id ? (
                            <button type="button" className="btn-ghost" onClick={del}>
                              <span className="material-symbols-rounded" aria-hidden>delete</span>
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
