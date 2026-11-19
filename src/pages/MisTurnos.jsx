// src/pages/MisTurnos.jsx
// Vista del paciente: sus datos y los turnos de los próximos 7 días.
import { useEffect, useMemo, useState } from "react";
import { readSession } from "../utils/jwt.js";
import { fetchTurnosClientePorFecha } from "../api/turnosBackend.js";
import { traerPaciente } from "../api/abmBackend.js";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "../components/ui/Display.jsx";

const STATUS = {
  pendiente: { label: "Pendiente", variant: "warning" },
  confirmado: { label: "Confirmado", variant: "primary" },
  finalizado: { label: "Finalizado", variant: "success" },
  cancelado: { label: "Cancelado", variant: "danger" },
};
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MON = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function parseYMD(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** "HH:MM" del turno (usa la hora real si viene; si no, la hora entera) */
function turnoHora(t) {
  const raw = String(t?.raw?.horaIni || t?.raw?.hora_inicio || "");
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw.slice(0, 5).padStart(5, "0");
  return `${String(Math.floor(Number(t?.hour) || 0)).padStart(2, "0")}:00`;
}

export default function MisTurnos() {
  const [items, setItems] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const payload = readSession()?.payload;
    const pacienteId = payload?.idPaciente || payload?.id || null;
    if (!pacienteId) {
      window.location.href = "/login";
      return;
    }

    (async () => {
      try {
        // Los 7 días en paralelo (antes eran 7 requests en serie)
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          return d;
        });
        const results = await Promise.allSettled(days.map((d) => fetchTurnosClientePorFecha(pacienteId, d)));
        const allTurnos = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") allTurnos.push(...r.value);
          else console.error("Error obteniendo turnos del cliente para fecha", days[i], r.reason);
        });
        setItems(allTurnos);

        try {
          const pat = await traerPaciente(pacienteId);
          setPatient({
            name: pat.nombre || pat.name || "",
            dni: pat.dni || "",
            phone: pat.celular || pat.phone || "",
            mail: pat.mail || pat.email || "",
            os: pat.obraSocial || pat.os || "",
            blood: pat.grupoSanguineo || pat.blood || "",
            allergies: pat.alergias || pat.allergies || "",
          });
        } catch (err) {
          console.error("Error trayendo datos del paciente:", err);
          setPatient(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const proximos = useMemo(
    () =>
      [...items].sort(
        (a, b) => String(a.date).localeCompare(String(b.date)) || turnoHora(a).localeCompare(turnoHora(b))
      ),
    [items]
  );

  return (
    <div className="gt-page gt-page--narrow">
      <PageHeader
        title={patient?.name ? `Hola, ${patient.name.split(" ")[0]}` : "Mis turnos"}
        subtitle="Tus turnos de los próximos 7 días"
      />

      {loading ? (
        <Card>
          <div className="ui-stack" aria-busy="true" aria-label="Cargando tus turnos">
            {[70, 45, 60].map((w) => (
              <span key={w} className="ui-skeleton" style={{ width: `${w}%`, height: 16 }} />
            ))}
          </div>
        </Card>
      ) : (
        <div className="ui-stack">
          {patient && (
            <Card>
              <div className="mt-patient">
                <Avatar name={patient.name} size="lg" solid />
                <div className="mt-patient__info">
                  <h2 className="mt-patient__name">{patient.name}</h2>
                  <div className="mt-patient__meta">
                    <span>
                      <span className="material-symbols-rounded" aria-hidden>badge</span>
                      DNI {patient.dni || "—"}
                    </span>
                    <span>
                      <span className="material-symbols-rounded" aria-hidden>call</span>
                      {patient.phone || "—"}
                    </span>
                    <span>
                      <span className="material-symbols-rounded" aria-hidden>mail</span>
                      {patient.mail || "—"}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="mt-facts">
                <div>
                  <dt>Obra social</dt>
                  <dd>{patient.os || "Sin obra social"}</dd>
                </div>
                <div>
                  <dt>Grupo sanguíneo</dt>
                  <dd>{patient.blood || "—"}</dd>
                </div>
                <div>
                  <dt>Alergias</dt>
                  <dd>{patient.allergies || "Sin alergias registradas"}</dd>
                </div>
              </dl>
            </Card>
          )}

          <Card
            title="Próximos turnos"
            icon="event_available"
            flush
            actions={proximos.length > 0 && <Badge variant="primary">{proximos.length}</Badge>}
          >
            {proximos.length === 0 ? (
              <EmptyState
                icon="event_busy"
                title="No tenés turnos próximos"
                description="Cuando se te asigne un turno lo vas a ver acá."
              />
            ) : (
              <ul className="mt-list">
                {proximos.map((t) => {
                  const st = STATUS[t.status] || { label: t.status || "Pendiente", variant: "neutral" };
                  const d = parseYMD(t.date);
                  return (
                    <li
                      key={`${t.id}-${t.date}`}
                      className={`mt-item ${t.status === "cancelado" ? "is-cancelled" : ""}`}
                    >
                      <div className="mt-date" aria-hidden>
                        <span className="mt-date__dow">{d ? DOW[d.getDay()] : ""}</span>
                        <span className="mt-date__day">{d ? d.getDate() : "?"}</span>
                        <span className="mt-date__mon">{d ? MON[d.getMonth()] : ""}</span>
                      </div>
                      <div className="mt-item__body">
                        <strong>{t.treatment || "Sesión"}</strong>
                        <span className="ui-muted">
                          <span className="material-symbols-rounded" aria-hidden>schedule</span>
                          {d
                            ? d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                            : t.date}
                          {` · ${turnoHora(t)} hs`}
                          {t.doctorName ? ` · ${t.doctorName}` : ""}
                        </span>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
