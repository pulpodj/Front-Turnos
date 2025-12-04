// src/ui/WeekCalendar.jsx
import { useEffect, useState } from "react";

const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export default function WeekCalendar({ anchorDate, selectedDate, onSelectDate }) {
  const initial = anchorDate || selectedDate || new Date();
  const [cursor, setCursor] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  // sincronizar mes visible cuando cambia anchorDate
  useEffect(() => {
    if (anchorDate) {
      setCursor(
        new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
      );
    }
  }, [anchorDate]);

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0
  ).getDate();

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
    .toUpperCase(); // <--- MAYÚSCULAS

  return (
    <div className="calendar card">
      <div className="cal-header">
        <button
          type="button"
          className="nav"
          onClick={() =>
            setCursor(
              new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)
            )
          }
        >
          &lt;
        </button>
        <div className="month-label">{monthLabel}</div>
        <button
          type="button"
          className="nav"
          onClick={() =>
            setCursor(
              new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
            )
          }
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
              onClick={d ? () => onSelectDate(d) : undefined}
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
