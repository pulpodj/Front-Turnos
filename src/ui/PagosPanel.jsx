// src/ui/PagosPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { getBackendToken } from "../api/http.js";
import { listarPacientes } from "../api/abmBackend.js";
import { crearMovimiento, listarMovimientoTipos } from "../api/movimientosBackend.js";

function buildObs({ sesion, obs }) {
  const cleanObs = String(obs || "").trim();
  const s = String(sesion || "").trim();
  if (!s) return cleanObs;
  return `[SESION: ${s}]${cleanObs ? " " + cleanObs : ""}`.trim();
}

function normalizeMoney(raw) {
  const txt = String(raw || "").trim();
  if (!txt) return NaN;

  const normalized = txt.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

export default function PagosPanel() {
  const useBackend = !!getBackendToken();

  const fieldStyle = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  const [pacientes, setPacientes] = useState([]);
  const [movimientoTipos, setMovimientoTipos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    pacienteId: "",
    fecha: new Date().toISOString().slice(0, 10),
    tratamientoId: "", // (mantengo nombre para no tocar markup)
    sesion: "",
    observacion: "",
    debe: "",
    haber: "",
  });

  const debeFilled = String(form.debe || "").trim() !== "";
  const haberFilled = String(form.haber || "").trim() !== "";

  useEffect(() => {
    if (!useBackend) return;
    (async () => {
      try {
        const [listPac, listTipos] = await Promise.all([
          listarPacientes().catch(() => []),
          listarMovimientoTipos().catch(() => []),
        ]);

        setPacientes(Array.isArray(listPac) ? [...listPac].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "")) : []);

        const tipos = Array.isArray(listTipos) ? listTipos : [];
        // ✅ filtrar bajas (no mostrar)
        setMovimientoTipos(tipos.filter((t) => !t?.baja));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [useBackend]);

  const pacienteNombre = useMemo(() => {
    const p = pacientes.find((x) => String(x.id) === String(form.pacienteId));
    return p?.nombre || "";
  }, [pacientes, form.pacienteId]);

  async function guardar(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.pacienteId || !form.fecha || !form.tratamientoId) {
      setErr("Completá Paciente, Fecha y Tratamiento.");
      return;
    }

    if (!debeFilled && !haberFilled) {
      setErr("Completá Debe o Haber (uno solo).");
      return;
    }
    if (debeFilled && haberFilled) {
      setErr("No podés completar Debe y Haber a la vez.");
      return;
    }

    const debe = debeFilled ? normalizeMoney(form.debe) : 0;
    const haber = haberFilled ? normalizeMoney(form.haber) : 0;

    if (debeFilled && (!Number.isFinite(debe) || debe <= 0)) {
      setErr("Ingresá un valor válido en Debe.");
      return;
    }
    if (haberFilled && (!Number.isFinite(haber) || haber <= 0)) {
      setErr("Ingresá un valor válido en Haber.");
      return;
    }

    const observaciones = buildObs({ sesion: form.sesion, obs: form.observacion });

    const payload = {
      id_movimiento_tipo: Number(form.tratamientoId),
      fecha: form.fecha,
      fecha_vencimiento: form.fecha,
      debe: debeFilled ? debe : 0,
      haber: haberFilled ? haber : 0,
      baja: false,
      observaciones,
      // ✅ backend usa id_cliente
      id_cliente: Number(form.pacienteId),
      saldo: (debeFilled ? debe : 0) - (haberFilled ? haber : 0),
    };

    setLoading(true);
    try {
      await crearMovimiento(payload);
      setOk(`Movimiento registrado ✅ ${pacienteNombre ? `(${pacienteNombre})` : ""}`);

      setForm((s) => ({
        ...s,
        fecha: new Date().toISOString().slice(0, 10),
        sesion: "",
        observacion: "",
        debe: "",
        haber: "",
      }));
    } catch (e2) {
      setErr(e2.message || "No se pudo guardar el movimiento.");
    } finally {
      setLoading(false);
    }
  }

  function abrirABM() {
    window.open("/pagos", "_blank", "width=1200,height=750,scrollbars=yes");
  }

  return (
    <div className="card pagos-card pagos-panel">
      <h2 style={{ margin: 0 }}>Pagos</h2>

      {/* ✅ Scroll real acá */}
      <div className="pagos-scroll" style={{ marginTop: 10 }}>
        {!useBackend && (
          <p className="muted" style={{ marginTop: 8 }}>
            Iniciá sesión contra el backend para gestionar pagos reales.
          </p>
        )}

        {useBackend && (
          <>
            {err && (
              <div className="alert error" style={{ marginTop: 10 }}>
                {err}
              </div>
            )}
            {ok && (
              <div className="alert success" style={{ marginTop: 10 }}>
                {ok}
              </div>
            )}

            <form onSubmit={guardar} className="form" style={{ marginTop: 10 }}>
              {/* fila 1 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.6fr)",
                  gap: 10,
                }}
              >
                <label style={{ margin: 0, minWidth: 0 }}>
                  Paciente
                  <select
                    style={fieldStyle}
                    value={form.pacienteId}
                    onChange={(e) => setForm((s) => ({ ...s, pacienteId: e.target.value }))}
                  >
                    <option value="">-- Seleccionar --</option>
                    {pacientes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ margin: 0, minWidth: 0 }}>
                  Fecha
                  <input
                    style={fieldStyle}
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((s) => ({ ...s, fecha: e.target.value }))}
                  />
                </label>

                <label style={{ margin: 0, minWidth: 0 }}>
                  Tratamiento
                  <select
                    style={fieldStyle}
                    value={form.tratamientoId}
                    onChange={(e) => setForm((s) => ({ ...s, tratamientoId: e.target.value }))}
                  >
                    <option value="">-- Seleccionar --</option>
                    {movimientoTipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tipo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* fila 2 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <label style={{ margin: 0, minWidth: 0 }}>
                  Sesión #
                  <input
                    style={fieldStyle}
                    type="number"
                    min="1"
                    placeholder="Ej: 4"
                    value={form.sesion}
                    onChange={(e) => setForm((s) => ({ ...s, sesion: e.target.value }))}
                  />
                </label>

                <label style={{ margin: 0, minWidth: 0 }}>
                  Debe
                  <input
                    style={fieldStyle}
                    type="text"
                    value={form.debe}
                    disabled={haberFilled}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        debe: e.target.value,
                        haber: e.target.value.trim() ? "" : s.haber,
                      }))
                    }
                    placeholder="Ej: 1500"
                  />
                </label>

                <label style={{ margin: 0, minWidth: 0 }}>
                  Haber
                  <input
                    style={fieldStyle}
                    type="text"
                    value={form.haber}
                    disabled={debeFilled}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        haber: e.target.value,
                        debe: e.target.value.trim() ? "" : s.debe,
                      }))
                    }
                    placeholder="Ej: 1500"
                  />
                </label>
              </div>

              <label style={{ marginTop: 10 }}>
                Observación
                <textarea
                  style={fieldStyle}
                  rows={3}
                  value={form.observacion}
                  onChange={(e) => setForm((s) => ({ ...s, observacion: e.target.value }))}
                />
              </label>

              <div className="inline" style={{ justifyContent: "space-between", marginTop: 10 }}>
                <button type="button" className="btn-ghost" onClick={abrirABM}>
                  Abrir ABM
                </button>

                <button
                  type="submit"
                  className={`primary ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
