// src/ui/ScheduleGrid.jsx
import React, { useMemo } from "react";

const MAX_PER_CELL = 12; // ✅ requisito: máximo 12 turnos por hora (6 por profesional)

export default function ScheduleGrid(props) {
  const weekDays = Array.isArray(props.weekDays) ? props.weekDays : [];
  const hours = Array.isArray(props.hours) ? props.hours : [];
  const items = Array.isArray(props.items) ? props.items : [];
  const onSelectAppt = typeof props.onSelectAppt === "function" ? props.onSelectAppt : null;
  const compact = Boolean(props.compact);
  const selectedId = props.selectedId != null ? String(props.selectedId) : null;

  const buckets = useMemo(() => {
    const out = Array.from({ length: 5 }, () => ({}));
    for (let d = 0; d < 5; d++) {
      for (const h of hours) out[d][h] = [];
    }
    for (const it of items) {
      const day = Number(it.dayOffset);
      const hour = Number(it.hour);
      if (!Number.isFinite(day) || day < 0 || day > 4) continue;
      if (!Number.isFinite(hour)) continue;
      if (!out[day][hour]) out[day][hour] = [];
      out[day][hour].push(it);
    }
    return out;
  }, [items, hours]);

  if (weekDays.length === 0 || hours.length === 0) {
    return (
      <div className="card" style={{ padding: 12 }}>
        <span className="muted">Cargando grilla…</span>
      </div>
    );
  }

  return (
    <div className={`card sched${compact ? " compact" : ""}`}>
      <div className="sched-head">
        <div className="sched-corner" />
        {weekDays.map((d, idx) => (
          <div key={idx} className="sched-col-head">
            <div className="dow">
              {d.toLocaleDateString("es-AR", { weekday: "long" })}
            </div>
            <div className="dmy">
              {d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
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
              {Array.from({ length: 5 }, (_, day) => {
                const cellItems = buckets?.[day]?.[h] || [];
                return (
                  <div key={day} className="cell">
                    {cellItems.slice(0, MAX_PER_CELL).map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        className={`appt${selectedId && String(it.id) === selectedId ? " is-selected" : ""}`}
                        onClick={() => onSelectAppt?.(it)}
                        style={{
                          background: it.color,
                          "--edge": it.edge || it.color,
                          opacity: it.active === false ? 0.55 : 1,
                          cursor: onSelectAppt ? "pointer" : "default",
                          border: "none",
                          textAlign: "left",
                        }}
                        title={it.treatment || ""}
                      >
                        <div className="appt-title">{it.patient || "—"}</div>
                        <div className="appt-sub">{it.treatment || ""}</div>
                      </button>
                    ))}

                    {cellItems.length > MAX_PER_CELL && (
                      <div className="appt-more">
                        +{cellItems.length - MAX_PER_CELL} más
                      </div>
                    )}
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
