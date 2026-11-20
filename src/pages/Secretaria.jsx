// src/pages/Secretaria.jsx
// Sección "Agenda y turnos" de la secretaría: ABM de turnos | grilla.
// La navegación por semana / mes / año está en el encabezado de la grilla.
// (Pacientes y Pagos tienen su propia sección en la sidebar.)
import { useEffect, useMemo, useState } from "react";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import ABMPanel from "../ui/ABMPanel.jsx";
import ResizableLayout from "../ui/ResizableLayout.jsx";
import Button from "../components/ui/Button.jsx";
import { Badge } from "../components/ui/Display.jsx";

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

  const handleSelectAppt = (appt) => setSelectedAppt(appt || null);

  const handleNavigate = (d) => setAnchorDate(startOfWeek(d));

  const leftPane = (
    <div className="pane-scroll">
      {/* pane-card: el card ocupa el alto del pane para que el ABM scrollee por dentro */}
      <div className="card pane-card" style={{ padding: 12 }}>
        <ABMPanel
          onDataChanged={async () => {
            setSelectedAppt(null);
            await reload();
          }}
          selectedTurno={selectedAppt}
          section="turnos"
        />
      </div>
    </div>
  );

  const centerPane = (
    <div className="pane-scroll">
      <div className="ui-card agenda-toolbar">
        <label className="agenda-toolbar__field">
          <span className="material-symbols-rounded" aria-hidden>
            stethoscope
          </span>
          <select
            className="ui-input"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            aria-label="Filtrar por profesional"
          >
            <option value="">Todos los profesionales</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <span className="ui-spacer" />

        {selectedAppt ? (
          <>
            <Badge variant="primary" icon="edit_calendar">
              Editando turno de {selectedAppt.patient || "paciente"}
            </Badge>
            <Button size="sm" variant="ghost" icon="close" onClick={() => setSelectedAppt(null)}>
              Soltar
            </Button>
          </>
        ) : (
          <span className="ui-soft agenda-toolbar__hint">
            Tocá un turno de la grilla para editarlo
          </span>
        )}
      </div>

      <div className="grid-scroll">
        <ScheduleGrid
          weekDays={weekDays}
          hours={HOURS}
          items={items}
          onSelectAppt={handleSelectAppt}
          selectedId={selectedAppt?.id}
          onNavigate={handleNavigate}
          compact
        />
      </div>
    </div>
  );

  return (
    <div className="gt-page gt-page--fill">
      <ResizableLayout
        left={leftPane}
        center={centerPane}
        defaultSizes={[30, 70, 0]}
        minLeftPx={280}
        minCenterPx={520}
        minRightPx={0}
        storageKey="gt_secretaria_split_v3"
      />
    </div>
  );
}
