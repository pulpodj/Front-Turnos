// src/pages/MisTurnos.jsx
import { useEffect, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import { readSession } from "../utils/jwt.js";

// Backend real
import { fetchTurnosClientePorFecha } from "../api/turnosBackend.js";
import { traerPaciente } from "../api/abmBackend.js";

// Mock de paciente como backup
import { getPatientById } from "../api/secretariaApiMock.js";

export default function MisTurnos() {
  const [items, setItems] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sess = readSession();
      const payload = sess?.payload;

      // En el backend real el token debería traer el id de paciente
      const pacienteId =
        payload?.idPaciente || payload?.id || null;

      if (!pacienteId) {
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);

        // === Turnos próximos (ej: próximos 7 días) ===
        const today = new Date();
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          return d;
        });

        const allTurnos = [];
        for (const d of days) {
          try {
            const t = await fetchTurnosClientePorFecha(pacienteId, d);
            allTurnos.push(...t);
          } catch (err) {
            console.error(
              "Error obteniendo turnos del cliente para fecha",
              d,
              err
            );
          }
        }

        setItems(allTurnos);

        // === Datos del paciente ===
        let pat = null;
        try {
          pat = await traerPaciente(pacienteId);
        } catch (err) {
          console.error(
            "Error trayendo datos del paciente desde backend, usando mock:",
            err
          );
          pat = await getPatientById(1).catch(() => null);
        }

        if (pat) {
          setPatient({
            name: pat.nombre || pat.name || "",
            dni: pat.dni || "",
            phone: pat.celular || pat.phone || "",
            mail: pat.mail || pat.email || "",
            os: pat.obraSocial || pat.os || "",
            blood: pat.grupoSanguineo || pat.blood || "",
            allergies: pat.alergias || pat.allergies || "",
          });
        } else {
          setPatient(null);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = () => {
    sessionStorage.removeItem("gt_session_jwt");
    window.location.href = "/login";
  };

  const formatStatus = (status) => {
    const statusMap = {
      pendiente: { label: "Pendiente", color: "#cdd7ec" },
      confirmado: { label: "Confirmado", color: "#2684fe" },
      finalizado: { label: "Finalizado", color: "#7ef7bf" },
      cancelado: { label: "Cancelado", color: "#ff8e8e" },
    };
    return statusMap[status] || { label: status, color: "#dfe6f2" };
  };

  return (
    <div className="page-wrap">
      <Header doctorName="Mis Turnos" onLogout={logout} />

      <main className="agenda-container agenda-misturnos">
        {loading ? (
          <div className="card" style={{ padding: "20px" }}>
            Cargando tus turnos...
          </div>
        ) : (
          <>
            {/* Datos personales */}
            {patient && (
              <div
                className="card"
                style={{ padding: "20px", marginBottom: "20px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      width: "60px",
                      height: "60px",
                      fontSize: "24px",
                    }}
                  >
                    {(patient.name || "P")[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: "0 0 4px" }}>{patient.name}</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      DNI: {patient.dni} · Tel: {patient.phone || "—"} · Email:{" "}
                      {patient.mail || "—"}
                    </p>
                  </div>
                </div>

                {/* Información médica */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "12px",
                    padding: "16px",
                    background: "#f8fbff",
                    borderRadius: "10px",
                    border: "1px solid #e8eef9",
                  }}
                >
                  <div>
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: ".9rem",
                        color: "#5b7290",
                      }}
                    >
                      Obra Social
                    </strong>
                    <span>{patient.os || "Sin obra social"}</span>
                  </div>
                  <div>
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: ".9rem",
                        color: "#5b7290",
                      }}
                    >
                      Grupo Sanguíneo
                    </strong>
                    <span>{patient.blood || "—"}</span>
                  </div>
                  <div>
                    <strong
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: ".9rem",
                        color: "#5b7290",
                      }}
                    >
                      Alergias
                    </strong>
                    <span>
                      {patient.allergies || "Sin alergias registradas"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de turnos */}
            <div className="card" style={{ padding: "20px" }}>
              <h2 style={{ margin: "0 0 16px" }}>Mis Turnos</h2>

              {items.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    background: "#f8fbff",
                    borderRadius: "10px",
                    border: "1px dashed #e8eef9",
                  }}
                >
                  <span
                    className="material-symbols-rounded"
                    style={{
                      fontSize: "48px",
                      color: "#7487a2",
                      marginBottom: "12px",
                    }}
                  >
                    event_busy
                  </span>
                  <p className="muted" style={{ margin: 0 }}>
                    No tenés turnos próximos.
                  </p>
                  <p
                    className="muted"
                    style={{ margin: "8px 0 0", fontSize: ".9rem" }}
                  >
                    Comunicate con la secretaría para agendar uno.
                  </p>
                </div>
              ) : (
                <ul className="list-turnos">
                  {items.map((a) => {
                    const statusInfo = formatStatus(a.status);
                    return (
                      <li key={a.id} className="card turno-item">
                        <div className="ti-left">
                          <div className="ti-date">
                            {new Date(a.date).toLocaleDateString("es-AR", {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                            })}
                          </div>
                          <div className="ti-hour">
                            {String(a.hour).padStart(2, "0")}:00
                          </div>
                        </div>
                        <div className="ti-mid" style={{ flex: 1 }}>
                          <div className="ti-doctor">{a.doctorName}</div>
                          <div className="ti-treatment muted">
                            {a.treatment}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: "999px",
                            background: statusInfo.color,
                            fontSize: ".85rem",
                            fontWeight: 500,
                          }}
                        >
                          {statusInfo.label}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
