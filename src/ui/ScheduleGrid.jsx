// src/ui/ScheduleGrid.jsx
import React, { useMemo } from "react";

const MAX_PER_CELL = 12; // ✅ requisito: máximo 12 turnos por hora (6 por profesional)

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Primer día hábil (lun-vie) del mes: la semana que lo contiene es la que se muestra al elegir ese mes. */
function firstWeekdayOfMonth(year, month) {
  const d = new Date(year, month, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Barra de navegación en el encabezado de la grilla:  <  mes ▾  año ▾  >
 * - Flechas: semana anterior / siguiente.
 * - Mes y año: saltan a la semana del primer día hábil de ese mes.
 * Mes/año mostrados = los del viernes de la semana visible, así al elegir un mes
 * siempre queda visible su primer día hábil.
 */
function SchedNav({ weekDays, onNavigate }) {
  const first = weekDays[0];
  const last = weekDays[weekDays.length - 1];
  const refMonth = last.getMonth();
  const refYear = last.getFullYear();

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = Math.min(thisYear - 3, refYear); y <= Math.max(thisYear + 3, refYear); y++) years.push(y);

  const shiftWeek = (n) => {
    const d = new Date(first);
    d.setDate(d.getDate() + 7 * n);
    onNavigate(d);
  };
  const goMonth = (year, month) => onNavigate(firstWeekdayOfMonth(year, month));

  return (
    <div className="sched-nav">
      <button
        type="button"
        className="sched-nav__btn"
        onClick={() => shiftWeek(-1)}
        title="Semana anterior"
        aria-label="Semana anterior"
      >
        <span className="material-symbols-rounded" aria-hidden>chevron_left</span>
      </button>

      <label className="sched-nav__pick">
        <select value={refMonth} onChange={(e) => goMonth(refYear, Number(e.target.value))} aria-label="Mes">
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m.slice(0, 3).toLowerCase()}
            </option>
          ))}
        </select>
        <span className="material-symbols-rounded" aria-hidden>expand_more</span>
      </label>

      <label className="sched-nav__pick">
        <select value={refYear} onChange={(e) => goMonth(Number(e.target.value), refMonth)} aria-label="Año">
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="material-symbols-rounded" aria-hidden>expand_more</span>
      </label>

      <button
        type="button"
        className="sched-nav__btn"
        onClick={() => shiftWeek(1)}
        title="Semana siguiente"
        aria-label="Semana siguiente"
      >
        <span className="material-symbols-rounded" aria-hidden>chevron_right</span>
      </button>
    </div>
  );
}

export default function ScheduleGrid(props) {
  const weekDays = Array.isArray(props.weekDays) ? props.weekDays : [];
  const hours = Array.isArray(props.hours) ? props.hours : [];
  const items = Array.isArray(props.items) ? props.items : [];
  const onSelectAppt = typeof props.onSelectAppt === "function" ? props.onSelectAppt : null;
  const compact = Boolean(props.compact);
  const selectedId = props.selectedId != null ? String(props.selectedId) : null;
  const onNavigate = typeof props.onNavigate === "function" ? props.onNavigate : null;

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
      {onNavigate && <SchedNav weekDays={weekDays} onNavigate={onNavigate} />}

      <div className="sched-head">
        <div className="sched-corner" />
        {weekDays.map((d, idx) => (
          <div key={idx} className={`sched-col-head${sameDay(d, new Date()) ? " is-today" : ""}`}>
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
                        className={`appt${
                          selectedId && String(it.id) === selectedId ? " is-selected" : ""
                        }`}
                        onClick={() => onSelectAppt?.(it)}
                        style={{
                          background: it.color,
                          "--edge": it.edge || it.color,
                          opacity: it.active === false ? 0.55 : 1,
                          cursor: onSelectAppt ? "pointer" : "default",
                          border: "none",
                          textAlign: "left",
                        }}
                        title={`${it.patient || ""}${it.treatment ? " • " + it.treatment : ""}`}
                      >
                        <div className="appt-title">{it.patient || "—"}</div>
                        <div className="appt-sub">
                          {it.treatment ? it.treatment : "Sin tratamiento"}
                        </div>
                      </button>
                    ))}

                    {cellItems.length > MAX_PER_CELL && (
                      <div className="appt-more">+{cellItems.length - MAX_PER_CELL} más</div>
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
