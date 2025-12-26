// src/pages/Secretaria.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import WeekCalendar from "../ui/WeekCalendar.jsx";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import ABMPanel from "../ui/ABMPanel.jsx";
import PagosPanel from "../ui/PagosPanel.jsx";
import ResizableLayout from "../ui/ResizableLayout.jsx";

import { fetchTurnosSecretariaSemana } from "../api/turnosBackend.js";
import { listarProfesionales } from "../api/abmBackend.js";
import { getBackendToken } from "../api/http.js";

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

  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [items, setItems] = useState([]);

  const useBackend = !!getBackendToken();

  // ✅ Solo backend: profesionales reales
  useEffect(() => {
    (async () => {
      if (!useBackend) {
        setDoctors([]);
        return;
      }
      try {
        const profs = await listarProfesionales();
        setDoctors(
          Array.isArray(profs) ? profs.map((p) => ({ id: p.id, name: p.nombre })) : []
        );
      } catch (err) {
        console.error("Error listando profesionales:", err);
        setDoctors([]);
      }
    })();
  }, [useBackend]);

  const reload = async () => {
    if (!useBackend) {
      setItems([]);
      return;
    }

    try {
      const weekISO = fmt(weekStart);

      // ✅ Ya viene mapeado con color/edge por tratamiento desde turnosBackend.js
      const realList = await fetchTurnosSecretariaSemana(
        weekISO,
        doctorId || undefined
      );

      setItems(Array.isArray(realList) ? realList : []);
    } catch (err) {
      console.error("Error cargando turnos:", err);
      setItems([]);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, doctorId, useBackend]);

  const logout = () => {
    sessionStorage.removeItem("gt_backend_token");
    window.location.href = "/login";
  };

  const leftPane = (
    <div className="pane-scroll">
      <div className="card" style={{ padding: 12 }}>
        <ABMPanel onDataChanged={reload} />
      </div>
    </div>
  );

  const centerPane = (
    <div className="pane-scroll">
      <div
        className="toolbar card"
        style={{
          padding: 10,
          marginBottom: 10,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span className="muted">Profesional:</span>
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">Todos</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-scroll">
        <ScheduleGrid weekDays={weekDays} hours={HOURS} items={items} />
      </div>
    </div>
  );

  const rightPane = (
    <div className="pane-scroll">
      <div className="card calendar" style={{ marginBottom: 12 }}>
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
    </div>
  );

  return (
    <div className="page-wrap">
      <Header
        doctorName="Secretaría"
        onLogout={logout}
        enableHistorialButton={false} // ✅ NUNCA en secretaría
      />

      <main className="agenda-container" style={{ width: "100vw", maxWidth: "none" }}>
        <ResizableLayout
          left={leftPane}
          center={centerPane}
          right={rightPane}
          defaultSizes={[28, 50, 22]}
          minLeftPx={280}
          minCenterPx={560}
          minRightPx={300}
          storageKey="gt_secretaria_split_v1"
        />
      </main>

      <Footer />
    </div>
  );
}
