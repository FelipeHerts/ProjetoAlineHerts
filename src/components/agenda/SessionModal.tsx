import { useState, useEffect } from 'react';
import { X, Calendar, Trash2, MessageCircle } from 'lucide-react';
import { usePatients, useSessions } from '../../hooks/useData';
import { useApp } from '../../context/AppContext';
import { createCalendarEvent } from '../../lib/googleCalendar';
import { extractMeetLink, openWhatsApp } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Session } from '../../types';

interface Props {
  session?: Session;
  defaultPatientId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function SessionModal({ session, defaultPatientId, onClose, onSaved, onDeleted }: Props) {
  const { settings } = useApp();
  const { patients } = usePatients();
  const { createSession, updateSession, deleteSession } = useSessions();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedSession, setSavedSession] = useState<Session | undefined>(session);
  const [justSaved, setJustSaved] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
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
        // Usa o valor ESPECÍFICO do paciente; se não tiver, usa o padrão das configurações
        duration_min: p.session_duration || settings.default_session_duration,
        value: p.session_value || settings.default_session_value,
      }));
    } else {
      // Paciente não encontrado — reseta para padrão
      setForm(f => ({ ...f, patient_id: pid, value: settings.default_session_value }));
    }
  };

  // Busca o link de pagamento mais recente do paciente (pendente ou com link)
  const fetchPaymentLink = async (patientId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('mp_link')
      .eq('patient_id', patientId)
      .not('mp_link', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data?.mp_link || null;
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
      let result: Session;
      if (session) {
        result = await updateSession(session.id, payload);
      } else {
        result = await createSession(payload as any);
        if (syncGoogle && settings.google_calendar_connected && settings.google_calendar_id && result) {
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

      setSavedSession(result);
      // Busca link de pagamento do paciente para o WhatsApp
      const mpLink = await fetchPaymentLink(form.patient_id);
      setPaymentLink(mpLink);
      setJustSaved(true);
      // Não fecha o modal automaticamente — mostra botão de WhatsApp
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      await deleteSession(session.id);
      onDeleted ? onDeleted() : onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSendWhatsApp = () => {
    const patient = patients.find(p => p.id === form.patient_id);
    const meetLink = savedSession ? extractMeetLink(savedSession) : null;
    openWhatsApp({
      phone: patient?.phone,
      patientName: patient?.name || 'Paciente',
      analystName: settings.analyst_name || 'Analista',
      dateTime: savedSession?.date_time || form.date_time,
      meetLink,
      paymentLink,
    });
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

            {/* Banner de sucesso + WhatsApp */}
            {justSaved && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: '#f0fff4',
                border: '1.5px solid #68d391',
                borderRadius: 'var(--radius-sm)',
              }}>
                <p style={{ fontWeight: 600, color: '#276749', marginBottom: 8, fontSize: 14 }}>
                  ✅ Sessão salva com sucesso!
                </p>
                <p style={{ fontSize: 13, color: '#2f855a', marginBottom: 12 }}>
                  Deseja enviar os links da sessão via WhatsApp para o paciente?
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={handleSendWhatsApp}
                  >
                    <MessageCircle size={14} /> Enviar via WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => { setJustSaved(false); onSaved(); }}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {!justSaved && (
              <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
                💡 Após salvar, você pode gerar o link de pagamento via Mercado Pago na aba Financeiro do paciente.
              </div>
            )}

            {/* Popup de confirmação de exclusão */}
            {confirmDelete && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: 'var(--danger-lighter, #fff5f5)',
                border: '1.5px solid var(--danger, #e53e3e)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <p style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 8, fontSize: 14 }}>
                  ⚠️ Confirmar exclusão desta sessão?
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  Esta ação não pode ser desfeita. A sessão será removida permanentemente.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Excluindo...' : '🗑 Sim, excluir'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {!justSaved && (
            <div className="modal-footer">
              {session && !confirmDelete && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginRight: 'auto' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} /> Excluir Sessão
                </button>
              )}
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : session ? 'Salvar Alterações' : 'Agendar Sessão'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
