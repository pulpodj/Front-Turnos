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

// ✅ La grilla debe arrancar desde las 7:00
const HOURS = [...Array.from({ length: 6 }, (_, i) => 7 + i), ...Array.from({ length: 6 }, (_, i) => 14 + i)]; // 7..12 y 14..19

const startOfWeek = (d) => {
  const x = d instanceof Date ? new Date(d) : new Date(d);
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

// ✅ YYYY-MM-DD en LOCAL
const fmtLocal = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function themeByDoctorName(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("ignacio")) return { color: "#daf8ff", edge: "#5290aa" };
  if (n.includes("milton")) return { color: "#e6ffef", edge: "#2fbf71" };
  return null;
}

export default function Secretaria() {
  const useBackend = !!getBackendToken();

  const [anchorDate, setAnchorDate] = useState(() => startOfWeek(new Date()));
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);

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
      const weekISO = fmtLocal(weekStart);
      const realList = await fetchTurnosSecretariaSemana(weekISO, doctorId || undefined);

      const doctorNameById = new Map(doctors.map((d) => [String(d.id), d.name]));

      const themed = (Array.isArray(realList) ? realList : []).map((it) => {
        const raw = it?.raw || {};

        const resolvedDoctorId =
          it.doctorId ??
          raw.profesional_id ??
          raw.doctor_id ??
          raw.idProfesional ??
          raw.idProfecional ??
          null;

        const resolvedDoctorName =
          it.doctorName ||
          raw.profesional_nombre ||
          doctorNameById.get(String(resolvedDoctorId ?? "")) ||
          "";

        // ✅ secretaría: colores por médico
        const theme = themeByDoctorName(resolvedDoctorName);

        return {
          ...it,
          doctorId: resolvedDoctorId ?? it.doctorId,
          doctorName: resolvedDoctorName,
          ...(theme ? { color: theme.color, edge: theme.edge } : {}),
        };
      });

      setItems(themed);
    } catch (err) {
      console.error("Error cargando turnos:", err);
      setItems([]);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, doctorId, useBackend, doctors.length]);

  const logout = () => {
    sessionStorage.removeItem("gt_backend_token");
    window.location.href = "/login";
  };

  const handleSelectAppt = (appt) => setSelectedAppt(appt || null);

  const handleCalendarSelect = (d) => {
    const clean = d instanceof Date ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : d;
    setSelectedDate(clean);
    setAnchorDate(startOfWeek(clean));
  };

  const leftPane = (
    <div className="pane-scroll">
      <div className="card" style={{ padding: 12, minHeight: 0 }}>
        <ABMPanel
          onDataChanged={async () => {
            setSelectedAppt(null);
            await reload();
          }}
          selectedTurno={selectedAppt}
        />
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

        {selectedAppt && (
          <button className="btn-ghost" onClick={() => setSelectedAppt(null)}>
            Limpiar selección
          </button>
        )}
      </div>

      <div className="grid-scroll">
        <ScheduleGrid
          weekDays={weekDays}
          hours={HOURS}
          items={items}
          onSelectAppt={handleSelectAppt}
          selectedId={selectedAppt?.id}
          compact
        />
      </div>
    </div>
  );

  const rightPane = (
    <div className="pane-scroll">
      <div className="card calendar" style={{ marginBottom: 12 }}>
        <WeekCalendar
          anchorDate={weekStart}
          selectedDate={selectedDate}
          onSelectDate={handleCalendarSelect}
        />
      </div>

      <div className="pagos-scroll">
        <PagosPanel />
      </div>
    </div>
  );

  return (
    <div className="page-wrap">
      <Header
        doctorName="Secretaría"
        onLogout={logout}
        enableHistorialButton={false}
        showNotifications
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
