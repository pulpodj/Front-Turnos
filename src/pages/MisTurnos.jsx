// src/pages/MisTurnos.jsx
import { useEffect, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import { readSession } from "../utils/jwt.js";

import { fetchTurnosClientePorFecha } from "../api/turnosBackend.js";
import { traerPaciente } from "../api/abmBackend.js";

export default function MisTurnos() {
  const [items, setItems] = useState([]);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sess = readSession();
      const payload = sess?.payload;

      const pacienteId = payload?.idPaciente || payload?.id || null;

      if (!pacienteId) {
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);

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
            console.error("Error obteniendo turnos del cliente para fecha", d, err);
          }
        }
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

  const logout = () => {
    sessionStorage.removeItem("gt_backend_token");
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
          <div className="card" style={{ padding: "20px" }}>Cargando tus turnos...</div>
        ) : (
          <>
            {patient && (
              <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  <div className="avatar" style={{ width: "60px", height: "60px", fontSize: "24px" }}>
                    {(patient.name || "P")[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: "0 0 4px" }}>{patient.name}</h2>
                    <p className="muted" style={{ margin: 0 }}>
                      DNI: {patient.dni} · Tel: {patient.phone || "—"} · Email: {patient.mail || "—"}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "12px",
                    padding: "16px",
                    background: "#f8fbff",
                    borderRadius: "10px",
                    border: "1px solid #e8eef9",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", fontSize: ".9rem", color: "#5b7290" }}>
                      Obra Social
                    </strong>
                    <span>{patient.os || "Sin obra social"}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", fontSize: ".9rem", color: "#5b7290" }}>
                      Grupo Sanguíneo
                    </strong>
                    <span>{patient.blood || "—"}</span>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", fontSize: ".9rem", color: "#5b7290" }}>
                      Alergias
                    </strong>
                    <span>{patient.allergies || "Sin alergias registradas"}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card" style={{ padding: "20px" }}>
              <h2 style={{ margin: "0 0 16px" }}>Mis Turnos</h2>

              {items.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", background: "#f8fbff", borderRadius: "10px" }}>
                  No tenés turnos próximos.
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {items.map((t) => {
                    const st = formatStatus(t.status);
                    return (
                      <li key={t.id} style={{ border: "1px solid #e8eef9", borderRadius: "12px", padding: "14px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div>
                            <strong>{t.date}</strong> · {String(t.hour).padStart(2, "0")}:00
                            <div className="muted" style={{ marginTop: 4 }}>{t.treatment || "Sesión"}</div>
                          </div>
                          <span style={{ padding: "6px 10px", borderRadius: 999, background: st.color, fontWeight: 600, fontSize: ".85rem" }}>
                            {st.label}
                          </span>
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
