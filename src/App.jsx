// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import MedicoAgenda from "./pages/MedicoAgenda.jsx";
import Secretaria from "./pages/Secretaria.jsx";
import MisTurnos from "./pages/MisTurnos.jsx";
import Pagos from "./pages/Pagos.jsx";
import PacientesHistorial from "./pages/PacientesHistorial.jsx"; // ✅ NUEVO

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/agenda" element={<MedicoAgenda />} />
      <Route path="/abm/turnos" element={<Secretaria />} />
      <Route path="/mis-turnos" element={<MisTurnos />} />
      <Route path="/pagos" element={<Pagos />} />

      {/* ✅ Historial clínico (pop-up) */}
      <Route path="/pacientes/historial" element={<PacientesHistorial />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
