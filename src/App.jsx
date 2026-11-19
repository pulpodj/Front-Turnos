// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import MedicoAgenda from "./pages/MedicoAgenda.jsx";
import Secretaria from "./pages/Secretaria.jsx";
import PacientesABM from "./pages/PacientesABM.jsx";
import MisTurnos from "./pages/MisTurnos.jsx";
import Pagos from "./pages/Pagos.jsx";
import PacientesHistorial from "./pages/PacientesHistorial.jsx";
import AppLayout, { RoleRoute } from "./ui/AppLayout.jsx";
import { ROLES_SECRETARIA, getRole, homeForRole } from "./utils/session.js";

function HomeRedirect() {
  return <Navigate to={homeForRole(getRole())} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Todo lo logueado vive dentro del layout con sidebar */}
      <Route element={<AppLayout />}>
        {/* Secretaría */}
        <Route path="/turnos" element={<RoleRoute roles={ROLES_SECRETARIA}><Secretaria /></RoleRoute>} />
        <Route path="/pacientes" element={<RoleRoute roles={ROLES_SECRETARIA}><PacientesABM /></RoleRoute>} />
        <Route path="/pagos" element={<RoleRoute roles={ROLES_SECRETARIA}><Pagos /></RoleRoute>} />

        {/* Profesional */}
        <Route path="/agenda" element={<RoleRoute roles={["medico"]}><MedicoAgenda /></RoleRoute>} />
        <Route path="/historial" element={<RoleRoute roles={["medico"]}><PacientesHistorial /></RoleRoute>} />

        {/* Paciente */}
        <Route path="/mis-turnos" element={<RoleRoute roles={["paciente"]}><MisTurnos /></RoleRoute>} />
      </Route>

      {/* Rutas viejas (links guardados / favoritos) */}
      <Route path="/abm/turnos" element={<Navigate to="/turnos" replace />} />
      <Route path="/pacientes/historial" element={<Navigate to="/historial" replace />} />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
