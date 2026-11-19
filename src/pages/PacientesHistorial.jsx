// src/pages/PacientesHistorial.jsx
// Sección "Historial clínico" (profesional): pacientes | historias | formulario.
import { useEffect, useMemo, useState } from "react";
import { listarPacientes } from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";
import {
  listarHistoriasClinicasPaciente,
  crearHistoriaClinica,
  actualizarHistoriaClinica,
  borrarHistoriaClinica,
} from "../api/historialClinicoBackend.js";
import Button from "../components/ui/Button.jsx";
import { Alert, Avatar, Badge, Card, EmptyState, Field, PageHeader } from "../components/ui/Display.jsx";
import { useConfirm, useToast } from "../components/ui/feedback.js";

const emptyForm = (id_paciente) => ({
  id: null,
  id_paciente: id_paciente || "",
  diagnostico: "",
  cant_sesiones: "", // string controlado (máx. 2 dígitos)
  fecha_ini: "",
  fecha_fin: "",
  tratamiento: "",
  observaciones: "",
});

const normalize = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function fmtFecha(v) {
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

const sortHistorias = (arr) => [...arr].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

export default function PacientesHistorial() {
  const hasToken = !!getBackendToken();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(hasToken);
  const [error, setError] = useState("");
  const [pacientes, setPacientes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const [historias, setHistorias] = useState([]);
  const [histLoading, setHistLoading] = useState(hasToken); // el 1º paciente se autoselecciona
  const [histError, setHistError] = useState("");
  const [form, setForm] = useState(emptyForm(""));
  const [saving, setSaving] = useState(false);

  // ---------- Pacientes ----------
  useEffect(() => {
    if (!hasToken) return;
    let ignore = false;
    listarPacientes()
      .then((list) => {
        if (ignore) return;
        const arr = (Array.isArray(list) ? list : []).sort((a, b) =>
          String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" })
        );
        setPacientes(arr);
        setSelectedId((prev) => prev ?? arr[0]?.id ?? null);
      })
      .catch((e) => !ignore && setError(e?.message || "No se pudieron cargar los pacientes."))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [hasToken]);

  const selectedPaciente = useMemo(
    () => pacientes.find((p) => String(p.id) === String(selectedId)) || null,
    [pacientes, selectedId]
  );

  const filteredPacientes = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return pacientes;
    return pacientes.filter((p) => [p.nombre, p.dni, p.mail ?? p.email].some((v) => normalize(v).includes(q)));
  }, [pacientes, search]);

  // ---------- Historias del paciente seleccionado ----------
  function fetchHistorias(idPaciente) {
    return listarHistoriasClinicasPaciente(idPaciente).then((data) =>
      sortHistorias(Array.isArray(data) ? data : [])
    );
  }

  function seleccionarPaciente(id) {
    if (String(id) === String(selectedId)) return;
    setSelectedId(id);
    setHistorias([]);
    setHistError("");
    setForm(emptyForm(id));
    setHistLoading(true);
  }

  useEffect(() => {
    if (!hasToken || !selectedPaciente?.id) return;
    let ignore = false;
    fetchHistorias(selectedPaciente.id)
      .then((arr) => {
        if (ignore) return;
        setHistorias(arr);
        setForm(emptyForm(selectedPaciente.id));
      })
      .catch((e) => !ignore && setHistError(e?.message || "No se pudo cargar el historial clínico."))
      .finally(() => !ignore && setHistLoading(false));
    return () => {
      ignore = true;
    };
  }, [selectedPaciente?.id, hasToken]);

  async function reloadHistorias() {
    if (!selectedPaciente?.id) return;
    setHistLoading(true);
    try {
      setHistorias(await fetchHistorias(selectedPaciente.id));
      setHistError("");
    } catch (e) {
      setHistError(e?.message || "No se pudo recargar el historial clínico.");
    } finally {
      setHistLoading(false);
    }
  }

  const pickHistoria = (h) => {
    setHistError("");
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

  const newHistoria = () => {
    setHistError("");
    setForm(emptyForm(selectedPaciente?.id));
  };

  async function save(e) {
    e.preventDefault();
    if (!selectedPaciente?.id) return;

    if (!form.tratamiento?.trim()) return setHistError("El tratamiento es obligatorio.");
    if (!form.fecha_ini) return setHistError("La fecha de inicio es obligatoria.");
    if (form.fecha_fin && form.fecha_fin < form.fecha_ini)
      return setHistError("La fecha de fin no puede ser anterior a la de inicio.");

    setHistError("");
    setSaving(true);
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

      toast.success(form.id ? "Historia clínica actualizada." : "Historia clínica creada.");
      await reloadHistorias();
      newHistoria();
    } catch (e2) {
      setHistError(e2?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!form.id) return;
    const ok = await confirm({
      title: "¿Eliminar esta historia clínica?",
      message: `Historia #${form.id} de ${selectedPaciente?.nombre || "este paciente"}. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (!ok) return;

    try {
      await borrarHistoriaClinica(form.id);
      toast.success("Historia clínica eliminada.");
      await reloadHistorias();
      newHistoria();
    } catch (e) {
      toast.error(e?.message || "No se pudo eliminar.");
    }
  }

  // ---------- Render ----------
  return (
    <div className="gt-page">
      <PageHeader
        title="Historial clínico"
        subtitle="Elegí un paciente para ver y cargar sus historias clínicas"
      />

      {!hasToken && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="warning">No hay sesión con el backend: no se pueden ver ni guardar historias.</Alert>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <div className="hc-layout">
        {/* Pacientes */}
        <Card flush className="hc-patients">
          <div className="hc-patients__search">
            <div className="ui-input-icon">
              <span className="material-symbols-rounded" aria-hidden>
                search
              </span>
              <input
                className="ui-input"
                type="search"
                placeholder="Buscar paciente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar paciente"
              />
            </div>
            <span className="ui-soft" style={{ fontSize: ".78rem" }}>
              {loading ? "Cargando…" : `${filteredPacientes.length} de ${pacientes.length}`}
            </span>
          </div>

          <ul className="hc-patients__list" aria-label="Pacientes">
            {loading
              ? [1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="hc-patient" aria-hidden>
                    <span className="ui-skeleton" style={{ width: 34, height: 34, borderRadius: "50%" }} />
                    <span className="ui-skeleton" style={{ flex: 1 }} />
                  </li>
                ))
              : filteredPacientes.map((p) => {
                  const active = String(selectedId) === String(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`hc-patient ${active ? "is-active" : ""}`}
                        onClick={() => seleccionarPaciente(p.id)}
                        aria-current={active || undefined}
                      >
                        <Avatar name={p.nombre} solid={active} />
                        <span className="ui-person__text">
                          <span className="ui-person__name">{p.nombre}</span>
                          <span className="ui-person__sub">DNI {p.dni || "—"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
            {!loading && filteredPacientes.length === 0 && (
              <li className="ui-soft" style={{ padding: 16, textAlign: "center" }}>
                Sin coincidencias
              </li>
            )}
          </ul>
        </Card>

        {/* Detalle */}
        <div className="hc-detail">
          {!selectedPaciente ? (
            <Card>
              <EmptyState
                icon="clinical_notes"
                title="Elegí un paciente"
                description="Seleccioná un paciente de la lista para ver su historial clínico."
              />
            </Card>
          ) : (
            <>
              <Card>
                <div className="hc-head">
                  <Avatar name={selectedPaciente.nombre} size="lg" solid />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 className="mt-patient__name">{selectedPaciente.nombre}</h2>
                    <div className="mt-patient__meta">
                      <span>
                        <span className="material-symbols-rounded" aria-hidden>badge</span>
                        DNI {selectedPaciente.dni || "—"}
                      </span>
                      <span>
                        <span className="material-symbols-rounded" aria-hidden>call</span>
                        {selectedPaciente.celular || "—"}
                      </span>
                      <span>
                        <span className="material-symbols-rounded" aria-hidden>mail</span>
                        {selectedPaciente.mail || selectedPaciente.email || "—"}
                      </span>
                    </div>
                  </div>
                  <Button variant="primary" icon="add" onClick={newHistoria}>
                    Nueva historia
                  </Button>
                </div>
              </Card>

              <div className="hc-grid">
                <Card
                  title="Historias"
                  icon="history"
                  flush
                  actions={
                    <>
                      <Badge variant="primary">{histLoading ? "…" : historias.length}</Badge>
                      <Button size="sm" variant="ghost" icon="refresh" onClick={reloadHistorias} disabled={histLoading}>
                        Recargar
                      </Button>
                    </>
                  }
                >
                  {histLoading ? (
                    <div className="ui-stack" style={{ padding: 18 }}>
                      {[80, 60, 70].map((w) => (
                        <span key={w} className="ui-skeleton" style={{ width: `${w}%`, height: 14 }} />
                      ))}
                    </div>
                  ) : historias.length === 0 ? (
                    <EmptyState
                      icon="note_add"
                      title="Sin historias"
                      description="Este paciente todavía no tiene historias clínicas. Cargá la primera con el formulario."
                    />
                  ) : (
                    <ul className="hc-list">
                      {historias.map((h) => {
                        const active = String(form.id) === String(h.id);
                        return (
                          <li key={h.id}>
                            <button
                              type="button"
                              className={`hc-item ${active ? "is-active" : ""}`}
                              onClick={() => pickHistoria(h)}
                              aria-current={active || undefined}
                            >
                              <span className="hc-item__top">
                                <strong>{h.tratamiento || "Sin tratamiento"}</strong>
                                <span className="ui-soft">#{h.id}</span>
                              </span>
                              {h.diagnostico && <span className="hc-item__diag">{h.diagnostico}</span>}
                              <span className="hc-item__meta">
                                <Badge variant="neutral" icon="event">
                                  {fmtFecha(h.fecha_ini) || "—"} → {fmtFecha(h.fecha_fin) || "en curso"}
                                </Badge>
                                <Badge variant="accent" icon="repeat">
                                  {h.cant_sesiones ?? 0} sesiones
                                </Badge>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>

                <Card
                  title={form.id ? `Editando historia #${form.id}` : "Nueva historia"}
                  icon={form.id ? "edit_note" : "note_add"}
                  actions={
                    form.id && (
                      <Button size="sm" variant="ghost" onClick={newHistoria}>
                        Cancelar edición
                      </Button>
                    )
                  }
                >
                  <form onSubmit={save} noValidate>
                    <Field label="Tratamiento" required>
                      <textarea
                        className="ui-input"
                        rows={2}
                        value={form.tratamiento}
                        onChange={(e) => setForm((s) => ({ ...s, tratamiento: e.target.value }))}
                        placeholder="Ej: terapia manual, electroterapia, ejercicios…"
                      />
                    </Field>

                    <Field label="Diagnóstico">
                      <textarea
                        className="ui-input"
                        rows={3}
                        value={form.diagnostico}
                        onChange={(e) => setForm((s) => ({ ...s, diagnostico: e.target.value }))}
                      />
                    </Field>

                    <div className="ui-row-3" style={{ marginTop: 14 }}>
                      <Field label="Sesiones">
                        <input
                          className="ui-input"
                          inputMode="numeric"
                          value={form.cant_sesiones}
                          placeholder="0"
                          maxLength={2}
                          onChange={(e) =>
                            setForm((s) => ({
                              ...s,
                              cant_sesiones: String(e.target.value || "").replace(/\D/g, "").slice(0, 2),
                            }))
                          }
                        />
                      </Field>
                      <Field label="Inicio" required>
                        <input
                          className="ui-input"
                          type="date"
                          value={form.fecha_ini}
                          max={form.fecha_fin || undefined}
                          onChange={(e) => setForm((s) => ({ ...s, fecha_ini: e.target.value }))}
                        />
                      </Field>
                      <Field label="Fin">
                        <input
                          className="ui-input"
                          type="date"
                          value={form.fecha_fin}
                          min={form.fecha_ini || undefined}
                          onChange={(e) => setForm((s) => ({ ...s, fecha_fin: e.target.value }))}
                        />
                      </Field>
                    </div>

                    <Field label="Observaciones" className="hc-obs">
                      <textarea
                        className="ui-input"
                        rows={3}
                        value={form.observaciones}
                        onChange={(e) => setForm((s) => ({ ...s, observaciones: e.target.value }))}
                      />
                    </Field>

                    {histError && (
                      <div style={{ marginTop: 14 }}>
                        <Alert variant="danger">{histError}</Alert>
                      </div>
                    )}

                    <div className="ui-inline" style={{ marginTop: 16 }}>
                      <Button type="submit" variant="primary" icon="save" loading={saving} disabled={!hasToken}>
                        {form.id ? "Guardar cambios" : "Crear historia"}
                      </Button>
                      {form.id && (
                        <Button variant="ghost" icon="delete" onClick={del} disabled={saving} className="hc-del">
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
