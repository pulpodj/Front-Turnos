// src/ui/KPIBar.jsx
import { useEffect, useState } from "react";

function KPICard({ icon, label, value, tone = "ok" }) {
  return (
    <div className={`kpi-card tone-${tone}`}>
      <div className="kpi-icon">
        <span className="material-symbols-rounded" aria-hidden>{icon}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  );
}

/** Mock suave. Enchufamos luego a /turnos /pacientes */
export default function KPIBar({ weekStartISO }) {
  const [kpis, setKpis] = useState({ sesiones: 0, nuevos: 0, noshowPct: 0 });

  useEffect(() => {
    // simulamos KPIs (deterministas por semana para que no "salten")
    const seed = Number((weekStartISO || "").replaceAll("-", "").slice(-6)) || 123456;
    const rnd = (p) => (Math.abs(Math.sin(seed * p)) * 1000) % 1;
    const sesiones = 30 + Math.round(rnd(1.7) * 40);
    const nuevos = Math.round(rnd(2.3) * 7);
    const noshowPct = Math.round((0.05 + rnd(3.1) * 0.12) * 1000) / 10; // 5–17%
    setKpis({ sesiones, nuevos, noshowPct });
  }, [weekStartISO]);

  return (
    <div className="kpi-bar card">
      <KPICard icon="calendar_clock" label="Sesiones de hoy" value={kpis.sesiones} tone="ok" />
      <KPICard icon="person_add" label="Pacientes nuevos" value={kpis.nuevos} tone="info" />
      <KPICard icon="do_not_disturb_on" label="Inasistencias" value={`${kpis.noshowPct}%`} tone="warn" />
    </div>
  );
}
