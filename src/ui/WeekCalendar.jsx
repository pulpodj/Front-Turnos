// src/ui/WeekCalendar.jsx
import { useEffect, useMemo, useState } from "react";

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const sameMonth = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth();

export default function WeekCalendar({ anchorDate, selectedDate, onSelectDate }) {
  // Prioridad: selectedDate (lo que el usuario eligió) > anchorDate (inicio de semana) > hoy
  const baseForCursor = useMemo(() => {
    return selectedDate || anchorDate || new Date();
  }, [selectedDate, anchorDate]);

  const [cursor, setCursor] = useState(() => {
    const initial = baseForCursor;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  // ✅ sincroniza el mes visible cuando cambia la fecha seleccionada (o anchor si no hay selected)
  useEffect(() => {
    if (!baseForCursor) return;

    const target = new Date(baseForCursor.getFullYear(), baseForCursor.getMonth(), 1);

    setCursor((prev) => {
      // Evita setear de más (y evita “saltos” raros)
      if (sameMonth(prev, target)) return prev;
      return target;
    });

    // Log útil para debug
    console.log("[WeekCalendar] sync cursor ->", {
      selectedDate: selectedDate ? selectedDate.toISOString().slice(0, 10) : null,
      anchorDate: anchorDate ? anchorDate.toISOString().slice(0, 10) : null,
      cursor: target.toISOString().slice(0, 10),
    });
  }, [baseForCursor, selectedDate, anchorDate]);

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveSelected = selectedDate || anchorDate || null;

  const monthLabel = cursor
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .toUpperCase();

  return (
    <div className="calendar card">
      <div className="cal-header">
        <button
          type="button"
          className="nav"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
          }
          aria-label="Mes anterior"
        >
          &lt;
        </button>

        <div className="month-label">{monthLabel}</div>

        <button
          type="button"
          className="nav"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
          }
          aria-label="Mes siguiente"
        >
          &gt;
        </button>
      </div>

      <div className="cal-grid">
        {["L", "M", "X", "J", "V", "S", "D"].map((n, i) => (
          <div key={`h-${i}`} className="cal-head">
            {n}
          </div>
        ))}

        {cells.map((d, idx) => {
          const isToday = d && sameDay(d, today);
          const isSelected = d && effectiveSelected && sameDay(d, effectiveSelected);

          const classNames = [
            "cal-cell",
            !d ? "empty" : "",
            isToday ? "today" : "",
            isSelected ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={idx}
              type="button"
              className={classNames}
              onClick={d ? () => onSelectDate?.(d) : undefined}
              disabled={!d}
            >
              {d ? d.getDate() : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
