import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { usePatients } from '../../hooks/useData';
import { useSessions } from '../../hooks/useData';
import { useApp } from '../../context/AppContext';
import { createCalendarEvent } from '../../lib/googleCalendar';
import type { Session } from '../../types';

interface Props {
  session?: Session;
  defaultPatientId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SessionModal({ session, defaultPatientId, onClose, onSaved }: Props) {
  const { settings } = useApp();
  const { patients } = usePatients();
  const { createSession, updateSession } = useSessions();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: defaultPatientId || '',
    date_time: new Date().toISOString().slice(0, 16),
    duration_min: settings.default_session_duration,
    status: 'agendada' as Session['status'],
    value: settings.default_session_value,
    notes: '',
  });
  const [syncGoogle, setSyncGoogle] = useState(settings.google_calendar_connected);

  useEffect(() => {
    if (session) {
      setForm({
        patient_id: session.patient_id,
        date_time: session.date_time?.slice(0, 16) || '',
        duration_min: session.duration_min,
        status: session.status,
        value: session.value || settings.default_session_value,
        notes: session.notes || '',
      });
    }
    if (defaultPatientId) {
      const p = patients.find(x => x.id === defaultPatientId);
      if (p) {
        setForm(f => ({
          ...f,
          patient_id: defaultPatientId,
          duration_min: p.session_duration || settings.default_session_duration,
          value: p.session_value || settings.default_session_value,
        }));
      }
    }
  }, [session, defaultPatientId, patients]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handlePatientChange = (pid: string) => {
    const p = patients.find(x => x.id === pid);
    set('patient_id', pid);
    if (p) {
      setForm(f => ({
        ...f,
        patient_id: pid,
        duration_min: p.session_duration || f.duration_min,
        value: p.session_value || f.value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_min: Number(form.duration_min),
        value: Number(form.value),
        date_time: new Date(form.date_time).toISOString(),
      };
      if (session) await updateSession(session.id, payload);
      else {
        const newSession = await createSession(payload as any);
        if (syncGoogle && settings.google_calendar_connected && settings.google_calendar_id && newSession) {
          const patient = patients.find(p => p.id === form.patient_id);
          const start = new Date(form.date_time);
          const end = new Date(start.getTime() + form.duration_min * 60000);
          
          try {
            await createCalendarEvent(settings.google_calendar_id, {
              summary: `Sessão: ${patient?.name || 'Paciente'}`,
              description: `Sessão de Psicanálise com ${settings.analyst_name}.\nNotas: ${form.notes}`,
              start: start.toISOString(),
              end: end.toISOString()
            });
          } catch (err) {
            console.error('Failed to sync with Google Calendar:', err);
          }
        }
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{session ? 'Editar Consulta' : 'Nova Consulta'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Paciente *</label>
              <select className="form-select" value={form.patient_id} onChange={e => handlePatientChange(e.target.value)} required>
                <option value="">Selecionar paciente...</option>
                {patients.filter(p => p.status === 'ativo').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data e Hora *</label>
                <input className="form-input" type="datetime-local" value={form.date_time}
                  onChange={e => set('date_time', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Duração (min)</label>
                <input className="form-input" type="number" min={10} value={form.duration_min}
                  onChange={e => set('duration_min', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input className="form-input" type="number" min={0} value={form.value}
                  onChange={e => set('value', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="agendada">Agendada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="faltou">Faltou</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" rows={3} value={form.notes}
                onChange={e => set('notes', e.target.value)} placeholder="Anotações sobre a sessão..." />
            </div>
            {settings.google_calendar_connected && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer', fontSize: 13.5 }}>
                <input type="checkbox" checked={syncGoogle} onChange={e => setSyncGoogle(e.target.checked)} />
                <Calendar size={14} color="#4285F4" /> Sincronizar com Google Calendar
              </label>
            )}
            <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
              💡 Após salvar, você pode gerar o link de pagamento via Mercado Pago na aba Financeiro do paciente.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : session ? 'Salvar Alterações' : 'Agendar Sessão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
