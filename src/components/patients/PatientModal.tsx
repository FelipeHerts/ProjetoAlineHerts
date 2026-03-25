import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Patient } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  patient?: Patient;
  onClose: () => void;
  onSaved: (data: Omit<Patient, 'id' | 'created_at'>) => Promise<void>;
}

export default function PatientModal({ patient, onClose, onSaved }: Props) {
  const { settings } = useApp();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', cpf: '', birth_date: '', phone: '', email: '',
    address: '', emergency_contact: '', emergency_phone: '', occupation: '',
    status: 'ativo' as Patient['status'],
    session_value: settings.default_session_value,
    session_duration: settings.default_session_duration,
    started_at: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (patient) {
      setForm({
        name: patient.name || '',
        cpf: patient.cpf || '',
        birth_date: patient.birth_date || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        emergency_contact: patient.emergency_contact || '',
        emergency_phone: patient.emergency_phone || '',
        occupation: patient.occupation || '',
        status: patient.status || 'ativo',
        session_value: patient.session_value || settings.default_session_value,
        session_duration: patient.session_duration || settings.default_session_duration,
        started_at: patient.started_at || new Date().toISOString().split('T')[0],
        notes: patient.notes || '',
      });
    }
  }, [patient]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSaved({
        ...form,
        session_value: Number(form.session_value),
        session_duration: Number(form.session_duration),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{patient ? 'Editar Paciente' : 'Novo Paciente'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Personal */}
            <div className="section-label">Dados Pessoais</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome Completo *</label>
                <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome do paciente" required />
              </div>
              <div className="form-group">
                <label className="form-label">CPF</label>
                <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input className="form-input" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Profissão</label>
                <input className="form-input" value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Ex: Professora, Médico..." />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Telefone / WhatsApp</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Endereço</label>
              <input className="form-input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contato de Emergência</label>
                <input className="form-input" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Nome do contato" />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone de Emergência</label>
                <input className="form-input" value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <hr className="divider" />
            {/* Session */}
            <div className="section-label">Dados do Atendimento</div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Início em</label>
                <input className="form-input" type="date" value={form.started_at} onChange={e => set('started_at', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Valor da Sessão (R$)</label>
                <input className="form-input" type="number" min={0} value={form.session_value} onChange={e => set('session_value', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duração (min)</label>
                <input className="form-input" type="number" min={10} value={form.session_duration} onChange={e => set('session_duration', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Observações gerais</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Informações relevantes sobre o paciente..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : patient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
