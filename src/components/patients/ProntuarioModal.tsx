import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Prontuario } from '../../types';

interface Props {
  patientId: string;
  record?: Prontuario | null;
  sessionNumber: number;
  onClose: () => void;
  onSaved: (data: Omit<Prontuario, 'id' | 'created_at'>) => Promise<void>;
}

export default function ProntuarioModal({ patientId, record, sessionNumber, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    session_number: sessionNumber,
    content: '',
    analyst_notes: '',
    dreams: '',
    themes: '',
  });

  useEffect(() => {
    if (record) {
      setForm({
        date: record.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        session_number: record.session_number || sessionNumber,
        content: record.content || '',
        analyst_notes: record.analyst_notes || '',
        dreams: record.dreams || '',
        themes: record.themes || '',
      });
    }
  }, [record]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await onSaved({ ...form, patient_id: patientId, session_number: Number(form.session_number) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{record ? 'Editar Anotação' : 'Nova Anotação no Prontuário'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data da Sessão *</label>
                <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nº da Sessão</label>
                <input className="form-input" type="number" value={form.session_number} onChange={e => set('session_number', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Temas da Sessão</label>
              <input className="form-input" value={form.themes} onChange={e => set('themes', e.target.value)} placeholder="Ex: Angústia, Relação materna, Trabalho..." />
            </div>
            <div className="form-group">
              <label className="form-label">Conteúdo da Sessão *</label>
              <textarea className="form-textarea" value={form.content} onChange={e => set('content', e.target.value)}
                placeholder="Registre o conteúdo trazido pelo paciente na sessão..." rows={6} required />
            </div>
            <div className="form-group">
              <label className="form-label">Sonhos / Associações Livres</label>
              <textarea className="form-textarea" value={form.dreams} onChange={e => set('dreams', e.target.value)}
                placeholder="Registre sonhos, lapsos, chistes e associações livres..." rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Notas da Analista (uso interno)</label>
              <textarea className="form-textarea" value={form.analyst_notes} onChange={e => set('analyst_notes', e.target.value)}
                placeholder="Suas impressões clínicas, hipóteses, direcionamentos..." rows={4} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : record ? 'Salvar Alterações' : 'Adicionar ao Prontuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
