// src/pages/Secretaria.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import WeekCalendar from "../ui/WeekCalendar.jsx";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import ABMPanel from "../ui/ABMPanel.jsx";
import PagosPanel from "../ui/PagosPanel.jsx";

import {
  listAppointmentsByWeek,
  listDoctors as listDoctorsMock,
} from "../api/secretariaApiMock.js";
import { fetchTurnosSecretariaSemana } from "../api/turnosBackend.js";
import { listarProfesionales } from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";
import { parseYMDToLocal, MS_PER_DAY } from "../utils/date.js";

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8..17

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); // lunes
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const fmt = (d) => d.toISOString().slice(0, 10);

export default function Secretaria() {
  const [anchorDate, setAnchorDate] = useState(() => startOfWeek(new Date()));
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [doctorId, setDoctorId] = useState(""); // "" = todos
  const [doctors, setDoctors] = useState([]);
  const [items, setItems] = useState([]);

  const useBackend = !!getBackendToken();

  // ===== Cargar lista de profesionales (reales si hay backend, mock de fallback) =====
  useEffect(() => {
    (async () => {
      if (useBackend) {
        try {
          const profs = await listarProfesionales();
          if (Array.isArray(profs) && profs.length > 0) {
            setDoctors(
              profs.map((p) => ({
                id: p.id,
                name: p.nombre,
              }))
            );
            return; // usamos sólo reales
          }
        } catch (err) {
          console.error(
            "Error listando profesionales reales, uso mock como fallback:",
            err
          );
        }
      }

      // Fallback: mock
      try {
        const mockDocs = await listDoctorsMock();
        setDoctors(mockDocs);
      } catch (err) {
        console.error("Error listando profesionales mock:", err);
        setDoctors([]);
      }
    })();
  }, [useBackend]);

  const reload = async () => {
    const realColors = ["#fff6d9", "#edf6ff", "#edfcf5", "#ffd9ff"];
    const mockColors = ["#f0e9ff", "#e0f7ff", "#ffe9f0", "#e9ffe5"];

    const base = startOfWeek(weekStart);

    const mapDayOffsetLocal = (ymd) => {
      const d = parseYMDToLocal(ymd);
      const diff = Math.round((d - base) / MS_PER_DAY); // 0..4
      return Math.max(0, Math.min(4, diff));
    };

    let mappedReal = [];
    let mappedMock = [];

    // 1) Turnos REALES desde backend
    try {
      const weekISO = fmt(weekStart);
      // implementá fetchTurnosSecretariaSemana para que respete doctorId:
      // - sin doctorId: /API/turnos?fecha=...
      // - con doctorId: /API/turnosProfesional?id=...&fecha=...
      const realList = await fetchTurnosSecretariaSemana(
        weekISO,
        doctorId || undefined
      );

      mappedReal = (realList || []).map((a, i) => {
        const fecha = a.fecha || a.date;
        const dayOffset = fecha ? mapDayOffsetLocal(fecha) : a.dayOffset ?? 0;
        const hourStr = a.horaIni || a.hora_inicio || a.hora || "08:00";
        const hour = Number(hourStr.split(":")[0]) || 8;

        return {
          id: `real-${a.id ?? i}`,
          dayOffset,
          hour,
          duration: a.duration ?? 1,
          patient: a.paciente_nombre || a.pacienteNombre || a.patient || "",
          treatment: a.tratamiento || a.treatment || "",
          color: realColors[i % realColors.length],
          active: a.estado !== "cancelado",
          isReal: true,
        };
      });
    } catch (err) {
      console.error("Error cargando turnos reales para Secretaría:", err);
    }

    // 2) Turnos MOCK (demo) – siguen conviviendo con los reales
    try {
      const mockList = await listAppointmentsByWeek(
        fmt(weekStart),
        doctorId || undefined
      );

      mappedMock = (mockList || []).map((a, i) => ({
        id: `mock-${a.id ?? i}`,
        dayOffset: a.dayOffset ?? mapDayOffsetLocal(a.date),
        hour: a.hour,
        duration: a.duration ?? 1,
        patient: a.patientName ?? a.patient ?? "",
        treatment: a.treatment,
        color: mockColors[i % mockColors.length],
        active: a.active,
        isReal: false,
      }));
    } catch (err) {
      console.error("Error cargando turnos mock para Secretaría:", err);
    }

    setItems([...mappedReal, ...mappedMock]);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, doctorId]);

  const logout = () => {
    sessionStorage.removeItem("gt_session_jwt");
    window.location.href = "/login";
  };

  return (
    <div className="page-wrap">
      <Header doctorName="Secretaría" onLogout={logout} />

      <main className="agenda-container agenda-secretaria">
        {/* Izquierda: ABM */}
        <aside className="abm-side card">
          <ABMPanel onDataChanged={reload} />
        </aside>

        {/* Centro: toolbar + grilla */}
        <section className="agenda-main">
          <div
            className="toolbar card"
            style={{
              padding: "10px",
              marginBottom: "10px",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span className="muted">Profesional:</span>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Todos</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <ScheduleGrid weekDays={weekDays} hours={HOURS} items={items} />
        </section>

        {/* Derecha: calendario + pagos */}
        <aside className="agenda-side">
          <div className="card calendar">
            <WeekCalendar
              anchorDate={weekStart}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setAnchorDate(startOfWeek(d));
              }}
            />
          </div>
          <PagosPanel />
        </aside>
      </main>

      <Footer />
    </div>
  );
}
