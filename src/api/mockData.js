// src/api/mockData.js
export const TREATMENTS = [
  "Kinesiología",
  "Rehabilitación",
  "Fonoaudiología",
  "Masajes",
];

// Doctores mock
export const doctors = [
  { id: 1, name: "Dr. Miguel Leonard", specialty: "Kinesiología" },
  { id: 2, name: "Dra. Brett Hoffman", specialty: "Fonoaudiología" },
  { id: 3, name: "Dr. Clarence Hamilton", specialty: "Rehabilitación" },
];

let pid = 3;
export const patients = [
  {
    id: 1,
    name: "Juan Pérez",
    dni: "30111222",
    phone: "351555111",
    active: true,
    os: "OSDE",
    allergies: "Ibuprofeno",
    chronic: "Lumbalgia crónica",
    blood: "0+",
    emergencyName: "Carla Pérez",
    emergencyPhone: "351444000",
    notes: "Evitar sobrecarga lumbar; tolera 45' de sesión.",
  },
  {
    id: 2,
    name: "María Gómez",
    dni: "28999888",
    phone: "351555222",
    active: true,
    os: "Swiss Medical",
    allergies: "Penicilina",
    chronic: "Asma leve",
    blood: "A+",
    emergencyName: "Rubén Gómez",
    emergencyPhone: "351444111",
    notes: "Trae estudios de RX. Prefiere sesiones por la tarde.",
  },
  {
    id: 3,
    name: "Lucas Díaz",
    dni: "27888777",
    phone: "351555333",
    active: false,
    os: "Medife",
    allergies: "N/A",
    chronic: "N/A",
    blood: "B-",
    emergencyName: "María Díaz",
    emergencyPhone: "351444222",
    notes: "Paciente dado de baja temporal.",
  },
];

let aid = 5;
// + doctorId y patientName para que la grilla y listados tengan nombre directo
export const appointments = [
  { id: 1, date: "2025-11-10", hour: 9,  duration: 1, patientId: 1, patientName: "Juan Pérez",  doctorId: 1, treatment: "Kinesiología",    active: true,  status: "confirmado" },
  { id: 2, date: "2025-11-10", hour: 11, duration: 1, patientId: 2, patientName: "María Gómez", doctorId: 1, treatment: "Rehabilitación", active: true,  status: "pendiente" },
  { id: 3, date: "2025-11-11", hour: 10, duration: 1, patientId: 1, patientName: "Juan Pérez",  doctorId: 2, treatment: "Fonoaudiología", active: true,  status: "finalizado" },
  { id: 4, date: "2025-11-12", hour: 15, duration: 1, patientId: 2, patientName: "María Gómez", doctorId: 2, treatment: "Kinesiología",    active: true,  status: "cancelado" },
  { id: 5, date: "2025-11-14", hour: 13, duration: 1, patientId: 3, patientName: "Lucas Díaz",  doctorId: 3, treatment: "Rehabilitación", active: false, status: "pendiente" },
];

export const nextPatientId = () => ++pid;
export const nextAppointmentId = () => ++aid;
