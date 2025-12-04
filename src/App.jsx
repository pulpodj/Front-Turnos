import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import MedicoAgenda from './pages/MedicoAgenda.jsx'     // si ya la tenés
import Secretaria from './pages/Secretaria.jsx'
import MisTurnos from './pages/MisTurnos.jsx'

export default function App(){
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/agenda" element={<MedicoAgenda />} />
      <Route path="/abm/turnos" element={<Secretaria />} />
      <Route path="/mis-turnos" element={<MisTurnos />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}


