// src/pages/MedicoAgenda.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import WeekCalendar from "../ui/WeekCalendar.jsx";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import { readSession } from "../utils/jwt.js";
import { fetchTurnosProfesionalSemana } from "../api/turnosBackend.js";

// ✅ La grilla debe arrancar desde las 7:00
const HOURS = Array.from({ length: 11 }, (_, i) => 7 + i); // 7..17

const startOfWeek = (d) => {
  const x = d instanceof Date ? new Date(d) : new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// ✅ YYYY-MM-DD LOCAL
const fmtLocal = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function professionalIdFromToken() {
  try {
    const sess = readSession();
    const p = sess?.payload || {};
    const id = p.id_profesional ?? p.profesional_id ?? p.prof_id ?? p.id;
    return id != null ? String(id) : "";
  } catch {
    return "";
  }
}

export default function MedicoAgenda() {
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

  const [items, setItems] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);

  const profId = useMemo(() => professionalIdFromToken(), []);

  const reload = async () => {
    if (!profId) {
      setItems([]);
      return;
    }

    try {
      const weekISO = fmtLocal(weekStart);
      const list = await fetchTurnosProfesionalSemana(profId, weekISO);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Error cargando turnos profesional:", e);
      setItems([]);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, profId]);

  const logout = () => {
    sessionStorage.removeItem("gt_backend_token");
    window.location.href = "/login";
  };

  const handleCalendarSelect = (d) => {
    const clean =
      d instanceof Date ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : d;
    setSelectedDate(clean);
    setAnchorDate(startOfWeek(clean));
  };

  return (
    <div className="page-wrap">
      <Header onLogout={logout} enableHistorialButton={true} />

      <main className="agenda-container">
        <div className="medico-layout">
          <div className="medico-main">
            <ScheduleGrid
              weekDays={weekDays}
              hours={HOURS}
              items={items}
              onSelectAppt={(appt) => setSelectedAppt(appt)}
              selectedId={selectedAppt?.id}
            />
          </div>

          <aside className="medico-side">
            <div className="card calendar">
              <WeekCalendar
                anchorDate={weekStart}
                selectedDate={selectedDate}
                onSelectDate={handleCalendarSelect}
              />
            </div>

            {/* ✅ Panel Pacientes removido */}
            <div className="card" style={{ marginTop: 12, padding: 12 }}>
              <div className="muted">
                Tip: hacé click en un turno para resaltarlo.
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
