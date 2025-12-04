// src/ui/ScheduleGrid.jsx
// Grilla semanal de turnos para el médico

// Colores por ESPECIALIDAD (bg + borde en la misma gama)
const SPECIALTY_STYLE = {
  "Terapia Manual": {
    bg: "#FFF6D9",
    edge: "#F3C46A",
  },
  "Kinesiología Convencional": {
    bg: "#E8F3FF",
    edge: "#6FA7F3",
  },
  "Ejercicios Adaptados": {
    bg: "#EAFBF0",
    edge: "#5AC18E",
  },
  default: {
    bg: "#EDF6FF",
    edge: "#7FA6E6",
  },
};

function styleBySpecialty(spec) {
  return SPECIALTY_STYLE[spec] || SPECIALTY_STYLE.default;
}

export default function ScheduleGrid({
  weekDays,
  hours,
  items,
  onSelectAppt,
}) {
  const map = new Map();
  items.forEach((it) => {
    const key = `${it.dayOffset}-${it.hour}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });

  return (
    <div className="sched card">
      <div className="sched-head">
        <div className="sched-corner" />
        {weekDays.map((d, i) => (
          <div key={i} className="sched-col-head">
            <div className="dow">
              {d.toLocaleDateString("es-AR", { weekday: "short" })}
            </div>
            <div className="dmy">
              {d.getDate()}/{d.getMonth() + 1}
            </div>
          </div>
        ))}
      </div>

      <div className="sched-body">
        <div className="sched-time-col">
          {hours.map((h) => (
            <div key={h} className="time-cell">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <div className="sched-grid">
          {hours.map((h) => (
            <div key={h} className="row">
              {weekDays.map((_, dayIdx) => {
                const key = `${dayIdx}-${h}`;
                const cellItems = map.get(key) || [];
                if (!cellItems.length) {
                  return (
                    <div key={key} className="cell empty-cell"></div>
                  );
                }

                return (
                  <div key={key} className="cell">
                    {cellItems.map((it) => {
                      const { bg, edge } = styleBySpecialty(
                        it.specialty || it.treatment
                      );

                      return (
                        <button
                          key={it.id}
                          type="button"
                          className="appt appt-clickable"
                          style={{
                            background: bg,
                            "--edge": edge,
                            borderTopColor: edge,
                          }}
                          title={`${it.patient} · ${it.treatment}`}
                          onClick={() => onSelectAppt?.(it)}
                        >
                          <div className="appt-title">{it.patient}</div>
                          <div className="appt-sub">{it.treatment}</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
