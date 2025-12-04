// src/ui/SessionDialog.jsx
import { useEffect, useState } from "react";

export default function SessionDialog({ open, appt, onClose, onSave }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (open) setForm(appt ? { ...appt } : null);
  }, [open, appt]);

  if (!open || !form) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal card">
        <div className="modal-head">
          <h3>Sesión</h3>
          <button className="btn-ghost" onClick={onClose}>
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="modal-grid">
          <label>Paciente
            <input value={form.patient} onChange={e=>setForm(s=>({...s, patient:e.target.value}))}/>
          </label>
          <label>Tratamiento
            <input value={form.treatment} onChange={e=>setForm(s=>({...s, treatment:e.target.value}))}/>
          </label>
          <label>Especialidad
            <input value={form.specialty} onChange={e=>setForm(s=>({...s, specialty:e.target.value}))}/>
          </label>
          <label>Fecha
            <input type="date" value={form.date} onChange={e=>setForm(s=>({...s, date:e.target.value}))}/>
          </label>
          <label>Hora
            <input value={String(form.hour).padStart(2,'0')+":00"} onChange={e=>{
              const hh = Number((e.target.value||'00').split(':')[0])||0;
              setForm(s=>({...s, hour:hh}));
            }}/>
          </label>
          <label>Duración
            <select value={form.duration} onChange={e=>setForm(s=>({...s, duration:Number(e.target.value)}))}>
              {[0.5,1,1.5,2].map(x=> <option key={x} value={x}>{x} h</option>)}
            </select>
          </label>

          <div className="row2">
            <label className="checkbox">
              <input type="checkbox" checked={!!form.asistio} onChange={e=>setForm(s=>({...s, asistio:e.target.checked}))}/>
              <span>Asistió</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.confirmado} onChange={e=>setForm(s=>({...s, confirmado:e.target.checked}))}/>
              <span>Confirmado</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.cobrado} onChange={e=>setForm(s=>({...s, cobrado:e.target.checked}))}/>
              <span>Cobrado</span>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={!!form.grupal} onChange={e=>setForm(s=>({...s, grupal:e.target.checked}))}/>
              <span>Grupal</span>
            </label>
          </div>

          <label className="row2">Notas
            <textarea rows={3} value={form.notes||""} onChange={e=>setForm(s=>({...s, notes:e.target.value}))}/>
          </label>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={()=> onSave?.(form)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
