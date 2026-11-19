// src/pages/PacientesABM.jsx
// Sección "Pacientes" de la secretaría: listado con buscador + alta/edición en modal.
import { useEffect, useMemo, useState } from "react";
import { getBackendToken } from "../api/http.js";
import {
  crearPaciente,
  modificarPaciente,
  listarPacientes,
  listarObrasSociales,
  mapPacienteABMForm,
  OBRAS_SOCIALES_FALLBACK,
} from "../api/abmBackend.js";
import Modal from "../components/ui/Modal.jsx";
import Button, { IconButton } from "../components/ui/Button.jsx";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  Field,
  PageHeader,
  SkeletonRows,
} from "../components/ui/Display.jsx";
import { useToast } from "../components/ui/feedback.js";
import { isValidDNI } from "../utils/validators.js";

const normalize = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function fmtFecha(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export default function PacientesABM() {
  const useBackend = !!getBackendToken();
  const toast = useToast();

  const [pacientes, setPacientes] = useState([]);
  const [obrasSociales, setObrasSociales] = useState(OBRAS_SOCIALES_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [search, setSearch] = useState("");

  // Editor
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => mapPacienteABMForm({}));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [dniOriginal, setDniOriginal] = useState("");
  const isEdit = !!form.id;

  // Carga del listado: el estado se actualiza al resolver (no dentro del efecto)
  function cargarPacientes() {
    return listarPacientes()
      .then((r) => {
        setPacientes(Array.isArray(r) ? r : []);
        setLoadErr("");
      })
      .catch((e) => setLoadErr(e.message || "No se pudo cargar el listado de pacientes."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!useBackend) return;
    cargarPacientes();
    listarObrasSociales()
      .then((r) => {
        if (Array.isArray(r) && r.length) setObrasSociales(r);
      })
      .catch(() => {
        /* queda la lista de respaldo */
      });
  }, [useBackend]);

  const osPorId = useMemo(
    () => Object.fromEntries(obrasSociales.map((o) => [String(o.id), o.nombre])),
    [obrasSociales]
  );

  const filtrados = useMemo(() => {
    const q = normalize(search.trim());
    const list = [...pacientes].sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base" })
    );
    if (!q) return list;
    return list.filter((p) =>
      [p.nombre, p.dni, p.mail ?? p.email, p.celular].some((v) => normalize(v).includes(q))
    );
  }, [pacientes, search]);

  function abrirNuevo() {
    setForm(mapPacienteABMForm({}));
    setDniOriginal("");
    setFormErr("");
    setOpen(true);
  }

  function abrirEditar(p) {
    const f = mapPacienteABMForm(p);
    setForm(f);
    setDniOriginal(String(f.dni ?? ""));
    setFormErr("");
    setOpen(true);
  }

  const set = (field) => (e) => setForm((s) => ({ ...s, [field]: e.target.value }));

  async function guardar(e) {
    e.preventDefault();
    setFormErr("");
    if (!String(form.nombre || "").trim()) {
      setFormErr("El nombre es obligatorio.");
      return;
    }
    // Mismo criterio que el login de pacientes (7 u 8 dígitos). Solo si se cargó
    // o cambió, para no trabar la edición de pacientes viejos con otro formato.
    const dni = String(form.dni ?? "").trim();
    if (dni && dni !== dniOriginal && !isValidDNI(dni)) {
      setFormErr("El DNI debe tener 7 u 8 números, sin puntos.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit) await modificarPaciente(form);
      else await crearPaciente(form);
      setOpen(false);
      toast.success(isEdit ? `Paciente "${form.nombre}" actualizado.` : `Paciente "${form.nombre}" creado.`);
      await cargarPacientes();
    } catch (err) {
      setFormErr(err.message || "No se pudo guardar el paciente.");
    } finally {
      setSaving(false);
    }
  }

  if (!useBackend) {
    return (
      <div className="gt-page">
        <PageHeader title="Pacientes" />
        <Alert variant="warning">Iniciá sesión contra el backend para gestionar pacientes.</Alert>
      </div>
    );
  }

  return (
    <div className="gt-page">
      <PageHeader
        title="Pacientes"
        subtitle={loading ? "Cargando…" : `${pacientes.length} pacientes registrados`}
        actions={
          <Button variant="primary" icon="person_add" onClick={abrirNuevo}>
            Nuevo paciente
          </Button>
        }
      />

      <Card
        flush
        title={
          <div className="ui-input-icon" style={{ width: "min(420px, 100%)" }}>
            <span className="material-symbols-rounded" aria-hidden>
              search
            </span>
            <input
              className="ui-input"
              type="search"
              placeholder="Buscar por nombre, DNI, e-mail o celular…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar pacientes"
            />
          </div>
        }
        actions={search && <Badge variant="primary">{filtrados.length} coincidencias</Badge>}
      >
        {loadErr ? (
          <div style={{ padding: 18 }}>
            <Alert variant="danger">{loadErr}</Alert>
          </div>
        ) : !loading && filtrados.length === 0 ? (
          search ? (
            <EmptyState
              icon="person_search"
              title="Sin resultados"
              description={`No hay pacientes que coincidan con "${search}".`}
              action={
                <Button variant="secondary" onClick={() => setSearch("")}>
                  Limpiar búsqueda
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="group"
              title="Todavía no hay pacientes"
              description="Cargá el primero para poder asignarle turnos y pagos."
              action={
                <Button variant="primary" icon="person_add" onClick={abrirNuevo}>
                  Nuevo paciente
                </Button>
              }
            />
          )
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>DNI</th>
                  <th>Celular</th>
                  <th>Obra social</th>
                  <th>Nacimiento</th>
                  <th className="actions" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows rows={8} cols={6} />
                ) : (
                  filtrados.map((p) => {
                    const os = osPorId[String(p.id_obra_social ?? p.idObraSocial ?? "")];
                    const mail = p.mail ?? p.email;
                    return (
                      <tr key={p.id} className="is-clickable" onClick={() => abrirEditar(p)}>
                        <td>
                          <div className="ui-person">
                            <Avatar name={p.nombre} />
                            <div className="ui-person__text">
                              <span className="ui-person__name">{p.nombre}</span>
                              <span className="ui-person__sub">{mail || "Sin e-mail"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="nowrap">{p.dni || <span className="ui-soft">—</span>}</td>
                        <td className="nowrap">{p.celular || <span className="ui-soft">—</span>}</td>
                        <td>{os ? <Badge variant="primary">{os}</Badge> : <span className="ui-soft">Particular</span>}</td>
                        <td className="nowrap">
                          {fmtFecha(p.fecha_nacimiento ?? p.fechaNacimiento) || <span className="ui-soft">—</span>}
                        </td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <IconButton icon="edit" label={`Editar ${p.nombre}`} onClick={() => abrirEditar(p)} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        dismissible={!saving}
        size="lg"
        title={isEdit ? "Editar paciente" : "Nuevo paciente"}
        subtitle={isEdit ? form.nombre : "Completá los datos del paciente."}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="pac-form" icon="check" loading={saving}>
              {isEdit ? "Guardar cambios" : "Crear paciente"}
            </Button>
          </>
        }
      >
        <form id="pac-form" onSubmit={guardar} noValidate>
          <Field label="Nombre y apellido" required>
            <input className="ui-input" value={form.nombre} onChange={set("nombre")} autoComplete="off" />
          </Field>

          <div className="ui-row-2">
            <Field label="DNI" hint="7 u 8 números, sin puntos. Es el usuario del portal del paciente.">
              <input className="ui-input" inputMode="numeric" value={form.dni} onChange={set("dni")} />
            </Field>
            <Field label="Celular">
              <input className="ui-input" inputMode="tel" value={form.celular} onChange={set("celular")} />
            </Field>
          </div>

          <div className="ui-row-2">
            <Field label="E-mail">
              <input className="ui-input" type="email" value={form.mail} onChange={set("mail")} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input className="ui-input" type="date" value={form.fechaNacimiento} onChange={set("fechaNacimiento")} />
            </Field>
          </div>

          <div className="ui-row-2">
            <Field label="Obra social">
              <select
                className="ui-input"
                value={form.idObraSocial || ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, idObraSocial: e.target.value ? Number(e.target.value) : "" }))
                }
              >
                <option value="">Particular / sin obra social</option>
                {obrasSociales.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dirección">
              <input className="ui-input" value={form.direccion} onChange={set("direccion")} />
            </Field>
          </div>

          <div className="pac-form__section">
            <span className="material-symbols-rounded" aria-hidden>
              lock
            </span>
            Acceso del paciente al portal
          </div>
          <div className="ui-row-2" style={{ marginTop: 10 }}>
            <Field label="Usuario">
              <input className="ui-input" value={form.usuario} onChange={set("usuario")} autoComplete="off" />
            </Field>
            <Field label="Clave">
              <input
                className="ui-input"
                type="password"
                value={form.clave}
                onChange={set("clave")}
                autoComplete="new-password"
              />
            </Field>
          </div>

          {formErr && (
            <div style={{ marginTop: 14 }}>
              <Alert variant="danger">{formErr}</Alert>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
