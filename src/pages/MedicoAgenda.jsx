// src/pages/MedicoAgenda.jsx
import { useEffect, useMemo, useState } from "react";
import Header from "../ui/Header.jsx";
import Footer from "../ui/Footer.jsx";
import WeekCalendar from "../ui/WeekCalendar.jsx";
import ScheduleGrid from "../ui/ScheduleGrid.jsx";
import PatientInfo from "../ui/PatientInfo.jsx";
import { readSession } from "../utils/jwt.js";
import { fetchTurnosProfesionalSemana } from "../api/turnosBackend.js";
import { parseYMDToLocal, MS_PER_DAY } from "../utils/date.js";

/* ===== Utilidades de fechas ===== */
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 8..17

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lunes
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

/* ===== Mock de turnos (para demo / relleno) ===== */
function buildMockAppointments(weekStartISO) {
  const seed = Number(weekStartISO.split("-").join("").slice(-6)) || 202511;
  const specs = [
    {
      patient: "María Gómez",
      specialty: "Kinesiología Convencional",
      treatment: "Tratamiento lumbar",
    },
    {
      patient: "Juan Pérez",
      specialty: "Terapia Manual",
      treatment: "Tratamiento cervical",
    },
    {
      patient: "Pedro Fernández",
      specialty: "Ejercicios Adaptados",
      treatment: "Reentrenamiento de la marcha",
    },
    {
      patient: "Sofía Ruiz",
      specialty: "Ejercicios Adaptados",
      treatment: "Fortalecimiento de miembros inferiores",
    },
    {
      patient: "Lucas Díaz",
      specialty: "Terapia Manual",
      treatment: "Trabajo de hombro derecho",
    },
    {
      patient: "Ana Torres",
      specialty: "Kinesiología Convencional",
      treatment: "Rehabilitación post operatoria",
    },
  ];

  const names = specs.map((s) => s.patient);
  const trts = [
    "Terapia Manual",
    "Kinesiología Convencional",
    "Ejercicios Adaptados",
  ];
  const pick = (arr, k) => arr[(seed + k) % arr.length];

  const items = [];
  for (let d = 0; d < 5; d++) {
    for (let k = 0; k < 2 + ((seed + d + k) % 3); k++) {
      const hour = 8 + ((seed + d * 13 + k * 7) % 9); // 8..16
      const id = `mock-${d}-${k}`;
      const patient = pick(names, d + k);

      items.push({
        id,
        dayOffset: d,
        hour,
        duration: 1,
        patient,
        treatment: pick(trts, d + hour + k),
        specialty: specs[names.indexOf(patient)]?.specialty || "Kinesiología",
        date: fmt(addDays(parseYMDToLocal(weekStartISO), d)),
        status: "confirmado",
        isReal: false,
      });
    }
  }

  return items;
}

/* ===== Mock de detalles clínicos de pacientes ===== */
const MOCK_PATIENT_DETAILS_BY_NAME = {
  "María Gómez": {
    dni: "32.456.789",
    edad: "34 años",
    obraSocial: "Swiss Medical",
    diagnostico: "Cervicalgia postural.",
  },
  "Juan Pérez": {
    dni: "30.987.654",
    edad: "42 años",
    obraSocial: "Medifé",
    diagnostico: "Lumbociatalgia izquierda.",
  },
  "Sofía Ruiz": {
    dni: "35.111.222",
    edad: "29 años",
    obraSocial: "OSDE 210",
    diagnostico: "Inestabilidad de tobillo.",
  },
  "Pedro Fernández": {
    dni: "29.333.444",
    edad: "45 años",
    obraSocial: "Galeno",
    diagnostico: "Dolor lumbar inespecífico.",
  },
  "Lucas Díaz": {
    dni: "28.765.432",
    edad: "50 años",
    obraSocial: "PAMI",
    diagnostico: "Reeducación de la marcha.",
  },
  "Ana Torres": {
    dni: "33.222.111",
    edad: "38 años",
    obraSocial: "OSDE 210",
    diagnostico: "Tendinitis de hombro.",
  },
};

function buildPatientFromAppt(appt) {
  if (!appt) return null;
  const base = MOCK_PATIENT_DETAILS_BY_NAME[appt.patient] || {
    dni: "—",
    edad: "—",
    obraSocial: "—",
    diagnostico: "—",
  };

  return {
    nombre: appt.patient,
    dni: base.dni,
    edad: base.edad,
    obraSocial: base.obraSocial,
    diagnostico: base.diagnostico,
    tratamiento: appt.treatment,
    especialidad: appt.specialty,
    proximoTurno: `${appt.date} · ${String(appt.hour).padStart(2, "0")}:00`,
  };
}

export default function MedicoAgenda() {
  const session = readSession();
  const payload = session?.payload || {};

  const profesionalIdFromToken =
    payload.professional_id ||
    payload.profesional_id ||
    payload.profesionalId ||
    payload.user_id ||
    null;

  const doctorDisplayName =
    payload.name ||
    payload.nombre ||
    payload.username ||
    "Profesional de Neffen Consultorios";

  const [anchorDate, setAnchorDate] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const [appointments, setAppointments] = useState([]);

  // Cargar turnos del profesional (reales + mock)
  useEffect(() => {
    let ignore = false;

    (async () => {
      const weekISO = fmt(weekStart);
      const mock = buildMockAppointments(weekISO);

      try {
        // Asumo que esto trae algo tipo:
        // { id, fecha, horaIni, pacienteNombre, tratamiento, especialidad, ... }
        const real = await fetchTurnosProfesionalSemana(
          profesionalIdFromToken,
          weekISO
        );

        const base = parseYMDToLocal(weekISO);

        const realMapped = (real || []).map((a, idx) => {
          const fecha = a.fecha || a.date;
          const dLocal = fecha ? parseYMDToLocal(fecha) : base;
          const diff = Math.round((dLocal - base) / MS_PER_DAY);
          const dayOffset = Math.max(0, Math.min(4, diff));

          const hourStr = a.horaIni || a.hora || "08:00";
          const hour = Number(hourStr.split(":")[0]) || 8;

          return {
            id: `real-${a.id ?? idx}`,
            dayOffset,
            hour,
            duration: a.duration ?? 1,
            patient: a.pacienteNombre || a.patient || "",
            treatment: a.tratamiento || a.treatment || "",
            specialty: a.especialidad || a.specialty || "",
            date: fmt(dLocal),
            status: a.estado || a.status || "confirmado",
            isReal: true,
          };
        });

        if (!ignore) {
          setAppointments([...realMapped, ...mock]);
        }
      } catch (err) {
        console.error(
          "Error cargando turnos profesional desde backend, usando solo mock:",
          err
        );
        if (!ignore) {
          setAppointments(mock);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [weekStart, profesionalIdFromToken]);

  const [currentAppt, setCurrentAppt] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);

  useEffect(() => {
    if (appointments.length > 0 && !currentAppt) {
      const todayISO = fmt(new Date());
      const todays = appointments.filter((a) => a.date === todayISO);
      const first = todays[0] || appointments[0];
      setCurrentAppt(first);
      setCurrentPatient(buildPatientFromAppt(first));
    }
  }, [appointments, currentAppt]);

  const logout = () => {
    sessionStorage.removeItem("gt_session_jwt");
    window.location.href = "/login";
  };

  function handleSelectAppt(appt) {
    setCurrentAppt(appt);
    setCurrentPatient(buildPatientFromAppt(appt));
    if (appt?.date) {
      setSelectedDate(parseISODateLocal(appt.date));
      setAnchorDate(startOfWeek(appt.date));
    }
  }

  return (
    <div className="page-wrap">
      <Header doctorName={doctorDisplayName} onLogout={logout} />

      {/* Layout del profesional: columna principal + calendario a la derecha */}
      <main className="agenda-container agenda-medico">
        {/* Columna principal: info del paciente + grilla de turnos */}
        <section className="agenda-main">
          {/* Info del paciente siempre arriba */}
          <PatientInfo appt={currentAppt} patient={currentPatient} />

          {/* Toolbar de semana */}
          <div className="toolbar card">
            <div className="toolbar-main">
              <div className="toolbar-title">
                Semana del{" "}
                {weekStart.toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "long",
                })}
              </div>
            </div>
          </div>

          {/* Grilla de turnos en el centro */}
          <ScheduleGrid
            weekDays={weekDays}
            hours={HOURS}
            items={appointments}
            onSelectAppt={handleSelectAppt}
          />
        </section>

        {/* Columna derecha: mini calendario */}
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
