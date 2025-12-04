// src/api/secretariaApiMock.js
import {
  patients, appointments, nextPatientId, nextAppointmentId,
  TREATMENTS, doctors
} from "./mockData.js";

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

const startOfWeek = (isoOrDate) => {
  const d = new Date(isoOrDate);
  const day = d.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
};
const fmt = (d) => d.toISOString().slice(0,10);

export async function listDoctors(){
  await sleep(120);
  return doctors.slice();
}

export async function listPatients({ includeInactive=false } = {}){
  await sleep(200);
  return patients.filter(p => includeInactive ? true : p.active);
}

export async function getPatientById(id){
  await sleep(120);
  return patients.find(p => p.id === Number(id)) || null;
}

export async function createPatient(data){
  await sleep(200);
  const id = nextPatientId();
  const p = {
    id, active: true, os: "", allergies: "", chronic: "", blood: "",
    emergencyName: "", emergencyPhone: "", notes: "", ...data
  };
  patients.push(p);
  return p;
}

export async function updatePatient(id, patch){
  await sleep(200);
  const idx = patients.findIndex(p=>p.id===id);
  if(idx<0) throw new Error("Paciente no encontrado");
  patients[idx] = { ...patients[idx], ...patch };
  return patients[idx];
}

export async function togglePatientActive(id){
  await sleep(150);
  const p = patients.find(p=>p.id===id);
  if(!p) throw new Error("Paciente no encontrado");
  p.active = !p.active;
  return p;
}

// Semana (Lun..Vie) con filtro opcional de doctorId
export async function listAppointmentsByWeek(anchorISO, doctorId /* opcional */){
  await sleep(250);
  const weekStart = startOfWeek(anchorISO);
  const days = Array.from({length:5}, (_,i)=> fmt(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()+i)));
  return appointments.filter(a =>
    days.includes(a.date) &&
    a.active &&
    (doctorId ? a.doctorId === Number(doctorId) : true)
  );
}

export async function createAppointment(data){
  await sleep(250);
  const id = nextAppointmentId();
  const a = { id, active: true, duration: 1, status: "pendiente", ...data };
  if(!a.patientName){
    const p = patients.find(p=>p.id===Number(a.patientId));
    a.patientName = p?.name || `Paciente #${a.patientId}`;
  }
  appointments.push(a);
  return a;
}

export async function updateAppointment(id, patch){
  await sleep(250);
  const idx = appointments.findIndex(a=>a.id===id);
  if(idx<0) throw new Error("Turno no encontrado");
  const merged = { ...appointments[idx], ...patch };
  if(!merged.patientName){
    const p = patients.find(p=>p.id===Number(merged.patientId));
    merged.patientName = p?.name || `Paciente #${merged.patientId}`;
  }
  appointments[idx] = merged;
  return merged;
}

export async function toggleAppointmentActive(id){
  await sleep(150);
  const a = appointments.find(a=>a.id===id);
  if(!a) throw new Error("Turno no encontrado");
  a.active = !a.active;
  return a;
}

// ---- Pacientes: ver sus turnos (por DNI) ----
export async function listAppointmentsByPatientDni(dni){
  await sleep(200);
  const p = patients.find(p=>p.dni === String(dni));
  if(!p) return [];
  return appointments
    .filter(a => a.patientId === p.id && a.active)
    .map(a => ({
      ...a,
      doctorName: doctors.find(d=>d.id===a.doctorId)?.name || `Médico #${a.doctorId}`
    }))
    .sort((a,b) => (a.date+b.hour) > (b.date+b.hour) ? 1 : -1);
}

export { TREATMENTS, doctors };
