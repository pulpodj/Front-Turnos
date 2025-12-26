// src/pages/PacientesHistorial.jsx
import { useEffect, useMemo, useState } from "react";
import { listarPacientes } from "../api/abmBackend.js";
import { getBackendToken, setBackendToken } from "../api/http.js";

import {
  listarHistoriasClinicasPaciente,
  crearHistoriaClinica,
  actualizarHistoriaClinica,
  borrarHistoriaClinica,
} from "../api/historialClinicoBackend.js";

function bootstrapTokenFromOpener() {
  try {
    if (getBackendToken()) return true;

    const openerToken =
      window.opener?.sessionStorage?.getItem("gt_backend_token") || "";

    if (openerToken) {
      setBackendToken(openerToken);
      return true;
    }
  } catch {}
  return false;
}

const emptyForm = (id_paciente) => ({
  id: null,
  id_paciente: id_paciente || "",
  diagnostico: "",
  cant_sesiones: "", // string controlado (max 2 dígitos)
  fecha_ini: "",
  fecha_fin: "",
  tratamiento: "", // ✅ ahora es textarea, mejor vacío por defecto
  observaciones: "",
});

export default function PacientesHistorial() {
  const isPopup = !!window.opener && window.opener !== window;

  // ✅ al abrir pop-up, copiamos token del opener si existe
  useEffect(() => {
    bootstrapTokenFromOpener();
  }, []);

  // 🔥 DEBUG UI: NO bloqueamos por permisos
  const token = getBackendToken();
  const hasToken = !!token;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pacientes, setPacientes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const [historias, setHistorias] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState("");

  const [form, setForm] = useState(emptyForm(""));

  // ======================
  // Cargar pacientes (backend real)
  // ======================
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      setError("");

      try {
        // Si no hay token, igual mostramos UI, pero avisamos
        if (!hasToken) {
          setPacientes([]);
          setSelectedId(null);
          setError("No hay token: podés ver la UI, pero no puedo traer pacientes del backend.");
          return;
        }

        const list = await listarPacientes();
        const arr = Array.isArray(list) ? list : [];
        if (ignore) return;

        setPacientes(arr);
        setSelectedId((prev) => (prev ?? arr[0]?.id ?? null));
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

    return () => {
      ignore = true;
    };
  }, [hasToken]);

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

  // ======================
  // Cargar historias reales por paciente
  // ======================
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
        if (!hasToken) {
          setHistorias([]);
          setForm(emptyForm(selectedPaciente.id));
          setHistError("No hay token: no puedo traer historias del backend.");
          return;
        }

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
          setForm(emptyForm(selectedPaciente?.id));
        }
      } finally {
        if (!ignore) setHistLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedPaciente?.id, hasToken]);

  const pickHistoria = (h) => {
    setForm({
      id: h?.id ?? null,
      id_paciente: h?.id_paciente ?? selectedPaciente?.id ?? "",
      diagnostico: h?.diagnostico ?? "",
      cant_sesiones: String(h?.cant_sesiones ?? ""),
      fecha_ini: String(h?.fecha_ini ?? "").slice(0, 10),
      fecha_fin: String(h?.fecha_fin ?? "").slice(0, 10),
      tratamiento: h?.tratamiento ?? "",
      observaciones: h?.observaciones ?? "",
    });
  };

  const newHistoria = () => setForm(emptyForm(selectedPaciente?.id));

  const reloadHistorias = async () => {
    if (!selectedPaciente?.id) return;

    setHistLoading(true);
    setHistError("");

    try {
      if (!hasToken) {
        setHistError("No hay token: no puedo recargar historias del backend.");
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

    // ✅ Si no hay token, no guardamos (pero UI funciona)
    if (!hasToken) {
      setHistError("No hay token: no se pueden guardar cambios.");
      return;
    }

    // validaciones mínimas (según tu JSON)
    if (!form.tratamiento?.trim()) return setHistError("Tratamiento es obligatorio");
    if (!form.fecha_ini) return setHistError("Fecha de inicio es obligatoria");

    setHistError("");
    try {
      const payload = {
        id: form.id, // PUT requiere id
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

    if (!hasToken) {
      setHistError("No hay token: no se puede eliminar.");
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

  const close = () => {
    if (isPopup) window.close();
    else window.location.href = "/agenda";
  };

  return (
    <div className="page-wrap">
      <main className="agenda-container" style={{ width: "100vw", maxWidth: "none" }}>
        <div className="card hc-popup" style={{ padding: 14 }}>
          {/* ✅ BANNER DEBUG (no bloquea UI) */}
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,.08)",
              background: hasToken ? "rgba(0,255,0,.06)" : "rgba(255,165,0,.08)",
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 700, color: hasToken ? "green" : "orange" }}>
              {hasToken
                ? "Conectado: Historial clínico (backend OK)"
                : "Sin token (modo UI): podés ver, pero no cargar/guardar"}
            </div>

            <button type="button" className="btn-ghost" onClick={close}>
              <span className="material-symbols-rounded" aria-hidden>close</span>
              Cerrar
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ margin: 0 }}>Historial clínico</h2>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" className="btn-ghost" onClick={reloadHistorias} disabled={histLoading}>
                <span className="material-symbols-rounded" aria-hidden>refresh</span>
                Recargar
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
                                background:
                                  String(form.id) === String(h.id)
                                    ? "rgba(38,132,254,.10)"
                                    : "rgba(255,255,255,.55)",
                                border: "1px solid rgba(0,0,0,.06)",
                              }}
                              title="Editar esta historia"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {String(h.tratamiento || "—").slice(0, 30)}
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

                    {/* FORM (campos 1:1 con backend) */}
                    <div className="card" style={{ padding: 12 }}>
                      <div className="muted" style={{ marginBottom: 8 }}>
                        {form.id ? `Editando historia #${form.id}` : "Nueva historia"}
                      </div>

                      <div className="form">
                        <label>
                          Tratamiento
                          <textarea
                            value={form.tratamiento}
                            onChange={(e) => setForm((s) => ({ ...s, tratamiento: e.target.value }))}
                            placeholder="Tratamiento... (ej: terapia manual, electroterapia, ejercicios, etc.)"
                            style={{ minHeight: 70, resize: "vertical" }}
                          />
                        </label>

                        <label>
                          Diagnóstico
                          <textarea
                            value={form.diagnostico}
                            onChange={(e) => setForm((s) => ({ ...s, diagnostico: e.target.value }))}
                            placeholder="Diagnóstico..."
                            style={{ minHeight: 80 }}
                          />
                        </label>

                        {/* ✅ Sesiones + Inicio + Fin: NO se superponen */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "100px minmax(0,1fr) minmax(0,1fr)",
                            gap: 10,
                            alignItems: "end",
                            marginTop: 6,
                          }}
                        >
                          <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                            Sesiones
                            <input
                              inputMode="numeric"
                              value={form.cant_sesiones}
                              placeholder="00"
                              maxLength={2}
                              style={{ width: "100%", boxSizing: "border-box" }}
                              onChange={(e) => {
                                const digits = String(e.target.value || "")
                                  .replace(/\D/g, "")
                                  .slice(0, 2);
                                setForm((s) => ({ ...s, cant_sesiones: digits }));
                              }}
                            />
                          </label>

                          <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                            Inicio
                            <input
                              type="date"
                              value={form.fecha_ini}
                              style={{ width: "100%", boxSizing: "border-box", minWidth: 0 }}
                              onChange={(e) => setForm((s) => ({ ...s, fecha_ini: e.target.value }))}
                            />
                          </label>

                          <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                            Fin
                            <input
                              type="date"
                              value={form.fecha_fin}
                              style={{ width: "100%", boxSizing: "border-box", minWidth: 0 }}
                              onChange={(e) => setForm((s) => ({ ...s, fecha_fin: e.target.value }))}
                            />
                          </label>
                        </div>

                        <label style={{ marginTop: 10 }}>
                          Observaciones
                          <textarea
                            value={form.observaciones}
                            onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
                            placeholder="Observaciones..."
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
