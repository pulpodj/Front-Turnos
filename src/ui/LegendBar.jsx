// src/ui/LegendBar.jsx
export default function LegendBar({ filters, onToggle }) {
  const items = [
    { key: "asistio", label: "Asistió", badge: "A" },
    { key: "confirmado", label: "Confirmado", badge: "C" },
    { key: "cobrado", label: "Cobrado", badge: "$" },
    { key: "grupal", label: "Sesión grupal", badge: "G" },
    { key: "espera", label: "En espera", badge: "E" },
    { key: "nocuenta", label: "No cuenta", badge: "N°" },
  ];
  return (
    <div className="legend-bar card">
      {items.map((it) => (
        <label key={it.key} className="legend-item">
          <input
            type="checkbox"
            checked={!!filters[it.key]}
            onChange={(e) => onToggle(it.key, e.target.checked)}
          />
          <span className="mini-badge">{it.badge}</span>
          <span>{it.label}</span>
        </label>
      ))}
    </div>
  );
}
