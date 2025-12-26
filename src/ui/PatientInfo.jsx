// src/ui/PatientInfo.jsx
export default function PatientInfo({ patient }) {
  if (!patient) {
    return (
      <div className="patient-highlight glass-lite">
        <div className="ph-left">
          <div className="avatar">?</div>
          <div>
            <h2>Paciente</h2>
            <p className="muted">Seleccioná un turno para ver los datos clínicos.</p>
          </div>
        </div>
      </div>
    );
  }

  const initial = (patient.name || "P")[0];

  return (
    <div className="patient-highlight glass-lite">
      {/* Datos básicos del paciente */}
      <div className="ph-left">
        <div className="avatar">{initial}</div>
        <div>
          <h2>{patient.name}</h2>
          <p className="muted">
            DNI {patient.dni} · Tel: {patient.phone || "—"}
          </p>

          {/* ✅ Importante: SIN botón a /pacientes acá.
              El acceso al historial clínico queda SOLO en el Header del médico/profesional.
              (Secretaría no debe ver ningún acceso.) */}
        </div>
      </div>

      {/* Pills de información rápida */}
      <div className="ph-right">
        <div className="pill" title="Obra Social">
          <span
            className="material-symbols-rounded"
            style={{ fontSize: "16px", marginRight: "4px" }}
          >
            medical_services
          </span>
          {patient.os || "Sin obra social"}
        </div>
        <div className="pill" title="Grupo Sanguíneo">
          <span
            className="material-symbols-rounded"
            style={{ fontSize: "16px", marginRight: "4px" }}
          >
            bloodtype
          </span>
          GS: {patient.blood || "—"}
        </div>
      </div>

      {/* Datos médicos completos */}
      <div className="ph-med">
        <div className="ph-line">
          <strong>Alergias:</strong>{" "}
          <em>{patient.allergies || "Sin alergias registradas"}</em>
        </div>
        <div className="ph-line">
          <strong>Enfermedades crónicas:</strong>{" "}
          <em>{patient.chronic || "Ninguna registrada"}</em>
        </div>
        <div className="ph-line">
          <strong>Contacto de emergencia:</strong>{" "}
          <em>
            {patient.emergencyName || "—"}
            {patient.emergencyPhone && ` · ${patient.emergencyPhone}`}
          </em>
        </div>
        {patient.notes && (
          <div className="ph-line">
            <strong>Notas:</strong> <em>{patient.notes}</em>
          </div>
        )}
      </div>
    </div>
  );
}
