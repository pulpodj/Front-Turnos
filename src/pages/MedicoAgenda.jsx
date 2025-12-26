// src/pages/MedicoAgenda.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import WeekCalendar from "../ui/WeekCalendar.jsx";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import PatientInfo from "../ui/PatientInfo.jsx";
import { readSession } from "../utils/jwt.js";
import { fetchTurnosProfesionalSemana } from "../api/turnosBackend.js";
import { traerPaciente } from "../api/abmBackend.js";

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i);

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lunes como inicio
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const fmt = (d) => d.toISOString().slice(0, 10);

const parseISODateLocal = (iso) => {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

function mapPacienteToPatientInfo(pat) {
  if (!pat) return null;
  return {
    name: pat.nombre || pat.name || "",
    dni: pat.dni || "",
    phone: pat.celular || pat.phone || "",
    mail: pat.mail || pat.email || "",
    os: pat.obraSocial || pat.os || "",
    blood: pat.grupoSanguineo || pat.blood || "",
    allergies: pat.alergias || pat.allergies || "",
    chronic: pat.enfermedadesCronicas || pat.chronic || "",
    emergencyName: pat.contactoEmergenciaNombre || pat.emergencyName || "",
    emergencyPhone: pat.contactoEmergenciaTelefono || pat.emergencyPhone || "",
    notes: pat.notas || pat.notes || "",
  };
}

export default function MedicoAgenda() {
  // ✅ sesión SIEMPRE dentro del componente (no a nivel módulo)
  const session = readSession();
  const payload = session?.payload || {};

  const profesionalIdFromToken =
    payload.professional_id ||
    payload.profesional_id ||
    payload.profesionalId ||
    payload.user_id ||
    payload.id ||
    payload.sub ||
    null;

  const doctorDisplayName =
    payload.name || payload.nombre || payload.username || "Profesional";

  // ✅ Estos estados/derivados van ARRIBA, antes de usarlos en effects
  const [anchorDate, setAnchorDate] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [appointments, setAppointments] = useState([]);
  const [currentAppt, setCurrentAppt] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);

  // ✅ UN SOLO effect para cargar turnos
  useEffect(() => {
    let ignore = false;

    (async () => {
      if (!profesionalIdFromToken) {
        console.warn(
          "Token sin id de profesional en payload. No se puede cargar agenda."
        );
        if (!ignore) setAppointments([]);
        return;
      }

      try {
        const weekISO = fmt(weekStart);
        const real = await fetchTurnosProfesionalSemana(
          profesionalIdFromToken,
          weekISO
        );
        if (!ignore) setAppointments(Array.isArray(real) ? real : []);
      } catch (err) {
        console.error("Error cargando turnos profesional:", err);
        if (!ignore) setAppointments([]);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [weekStart, profesionalIdFromToken]);

  // Autoselección de turno
  useEffect(() => {
    if (appointments.length > 0 && !currentAppt) {
      const todayISO = fmt(new Date());
      const todays = appointments.filter((a) => a.date === todayISO);
      const first = todays[0] || appointments[0];
      setCurrentAppt(first);
    }
  }, [appointments, currentAppt]);

  // Cargar paciente actual
  useEffect(() => {
    let ignore = false;

    (async () => {
      if (!currentAppt?.patientId) {
        if (!ignore) setCurrentPatient(null);
        return;
      }
      try {
        const pat = await traerPaciente(currentAppt.patientId);
        if (!ignore) setCurrentPatient(mapPacienteToPatientInfo(pat));
      } catch (err) {
        console.error("Error trayendo paciente:", err);
        if (!ignore) setCurrentPatient(null);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [currentAppt?.patientId]);

  const logout = () => {
    sessionStorage.removeItem("gt_backend_token");
    window.location.href = "/login";
  };

  function handleSelectAppt(appt) {
    setCurrentAppt(appt);
    if (appt?.date) {
      setSelectedDate(parseISODateLocal(appt.date));
      setAnchorDate(startOfWeek(appt.date));
    }
  }

  return (
    <div className="page-wrap">
      <Header
        doctorName={doctorDisplayName}
        onLogout={logout}
        enableHistorialButton={true} // ✅ SIEMPRE en médico
      />

      <main className="agenda-container agenda-medico">
        <section className="agenda-main">
          <PatientInfo patient={currentPatient} />
          <ScheduleGrid
            weekDays={weekDays}
            hours={HOURS}
            items={appointments}
            onSelectAppt={handleSelectAppt}
          />
        </section>

        <aside className="agenda-side">
          <div className="card calendar">
            <WeekCalendar
              anchorDate={weekStart}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setAnchorDate(startOfWeek(d));
              }}
            />
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
