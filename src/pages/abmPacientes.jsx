// src/pages/AbmPacientes.jsx
import { useEffect, useMemo, useState } from "react";
import {
  crearPaciente,
  modificarPaciente,
  listarPacientes,
  listarObrasSociales,
  mapPacienteABMForm,
} from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";

const OBRAS_SOCIALES_FALLBACK = [
  { id: 1, nombre: "OSDE" },
  { id: 2, nombre: "Swiss Medical" },
  { id: 3, nombre: "PAMI" },
  { id: 4, nombre: "Galeno" },
];

function bootstrapTokenFromOpener() {
  try {
    const here = sessionStorage.getItem("gt_backend_token");
    if (here) return true;

    const openerToken =
      window.opener &&
      window.opener.sessionStorage &&
      window.opener.sessionStorage.getItem("gt_backend_token");

    if (openerToken) {
      sessionStorage.setItem("gt_backend_token", openerToken);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Timeout simple para que NUNCA quede “Cargando…” infinito
function withTimeout(promise, ms = 12000) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export default function AbmPacientes() {
  const isPopup = !!window.opener && window.opener !== window;

  const [tokenReady] = useState(() => {
    bootstrapTokenFromOpener();
    return true;
  });

  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(mapPacienteABMForm({}));
  const [obrasSociales, setObrasSociales] = useState(OBRAS_SOCIALES_FALLBACK);

  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState("");
  const [errorList, setErrorList] = useState("");

  const useBackend = !!getBackendToken();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((p) => {
      const nombre = String(p?.nombre || "").toLowerCase();
      const dni = String(p?.dni || "");
      const mail = String(p?.mail || "").toLowerCase();
      return nombre.includes(q) || dni.includes(q) || mail.includes(q);
    });
  }, [list, search]);

  async function reload() {
    if (!getBackendToken()) return;

    setErrorList("");
    setLoadingList(true);
    try {
      const r = await withTimeout(listarPacientes(), 12000);
      setList(Array.isArray(r) ? r : []);
    } catch (e) {
      console.error("Error listando pacientes", e);
      setErrorList(e?.message || "No se pudo cargar la lista");
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    bootstrapTokenFromOpener();
    if (!getBackendToken()) return;

    (async () => {
      await reload();
      try {
        const r = await withTimeout(listarObrasSociales(), 12000);
        if (Array.isArray(r) && r.length > 0) setObrasSociales(r);
        else setObrasSociales(OBRAS_SOCIALES_FALLBACK);
      } catch (e) {
        console.error("Error listando obras sociales", e);
        setObrasSociales(OBRAS_SOCIALES_FALLBACK);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!getBackendToken()) return;

    setError("");
    setLoading(true);
    try {
      if (form.id) await withTimeout(modificarPaciente(form), 12000);
      else await withTimeout(crearPaciente(form), 12000);

      await reload();
      setForm(mapPacienteABMForm({}));
    } catch (err) {
      setError(err?.message || "Error al guardar paciente");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p) {
    setForm(mapPacienteABMForm(p));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setForm(mapPacienteABMForm({}));
  }

  function closeOrBack() {
    if (isPopup) return window.close();
    window.location.href = "/secretaria";
  }

  return (
    <div className="page-wrap">
      <main className="agenda-container">
        <div className="card abm-popup abm-panel">
          <div className="abm-popup-topbar">
            <div style={{ minWidth: 0, minHeight: 0 }}>
              <h2 style={{ margin: 0 }}>Pacientes</h2>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Ventana rápida: buscar, editar y crear.
              </p>
            </div>

            <div className="inline" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost" onClick={closeOrBack}>
                <span className="material-symbols-rounded">
                  {isPopup ? "close" : "arrow_back"}
                </span>
                {isPopup ? "Cerrar" : "Volver"}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={reload}
                disabled={!getBackendToken() || loadingList}
                title="Recargar"
              >
                <span className="material-symbols-rounded">refresh</span>
                Recargar
              </button>
            </div>
          </div>

          {!tokenReady || !useBackend ? (
            <div className="error" style={{ marginTop: 12 }}>
              <span className="material-symbols-rounded">error</span>
              No hay sesión activa. Volvé a iniciar sesión.
            </div>
          ) : (
            <div className="abm-popup-grid">
              {/* FORM */}
              <section className="abm-popup-pane">
                <form className="form" onSubmit={submit}>
                  <label>
                    Nombre
                    <input
                      value={form.nombre}
                      onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                      required
                    />
                  </label>

                  <div className="abm-row-2">
                    <label>
                      DNI
                      <input
                        inputMode="numeric"
                        value={form.dni}
                        onChange={(e) => setForm((s) => ({ ...s, dni: e.target.value }))}
                      />
                    </label>
                    <label>
                      Celular
                      <input
                        inputMode="tel"
                        value={form.celular}
                        onChange={(e) => setForm((s) => ({ ...s, celular: e.target.value }))}
                      />
                    </label>
                  </div>

                  <label>
                    E-mail
                    <input
                      type="email"
                      value={form.mail}
                      onChange={(e) => setForm((s) => ({ ...s, mail: e.target.value }))}
                    />
                  </label>

                  <div className="abm-row-2">
                    <label>
                      Fecha Nacimiento
                      <input
                        type="date"
                        value={form.fechaNacimiento}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, fechaNacimiento: e.target.value }))
                        }
                      />
                    </label>

                    <label>
                      Obra Social
                      <select
                        value={form.idObraSocial || ""}
                        onChange={(e) =>
                          setForm((s) => ({
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
                      value={form.direccion}
                      onChange={(e) => setForm((s) => ({ ...s, direccion: e.target.value }))}
                    />
                  </label>

                  <div className="abm-row-2">
                    <label>
                      Usuario
                      <input
                        value={form.usuario}
                        onChange={(e) => setForm((s) => ({ ...s, usuario: e.target.value }))}
                      />
                    </label>
                    <label>
                      Clave
                      <input
                        type="password"
                        value={form.clave}
                        onChange={(e) => setForm((s) => ({ ...s, clave: e.target.value }))}
                      />
                    </label>
                  </div>

                  {error && (
                    <div className="error">
                      <span className="material-symbols-rounded">error</span>
                      {error}
                    </div>
                  )}

                  <div className="inline" style={{ gap: 10 }}>
                    <button className="primary" disabled={loading}>
                      {form.id ? "Guardar cambios" : "Crear paciente"}
                    </button>

                    {form.id && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={cancelEdit}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* LISTA */}
              <section className="abm-popup-pane abm-popup-listpane">
                <div className="abm-extended-listhead">
                  <label style={{ margin: 0, width: "100%" }}>
                    Buscar
                    <input
                      placeholder="Nombre, DNI o email"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>

                  <span className="muted" style={{ whiteSpace: "nowrap" }}>
                    {loadingList ? "Cargando..." : `${filtered.length} / ${list.length}`}
                  </span>
                </div>

                {errorList && (
                  <div className="error" style={{ marginTop: 10 }}>
                    <span className="material-symbols-rounded">error</span>
                    {errorList}
                  </div>
                )}

                <div className="abm-popup-list">
                  {!loadingList && !errorList && filtered.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>
                      No hay pacientes para mostrar.
                    </div>
                  ) : (
                    <ul className="abm-list" style={{ marginTop: 10 }}>
                      {filtered.map((p) => (
                        <li key={p.id} className="row">
                          <div style={{ minWidth: 0 }}>
                            <strong>{p.nombre}</strong>{" "}
                            <span className="muted">
                              · DNI {p.dni || "—"} · {p.mail || "s/email"}
                            </span>
                          </div>

                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn-mini"
                              onClick={() => startEdit(p)}
                              title="Editar"
                            >
                              <span className="material-symbols-rounded">edit</span>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
