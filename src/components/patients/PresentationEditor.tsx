import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { PatientPresentation } from '../../types';

interface Props {
  presentation: PatientPresentation | null;
  onSave: (data: Partial<PatientPresentation>) => Promise<any>;
}

export default function PresentationEditor({ presentation, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    chief_complaint: '',
    history: '',
    family_history: '',
    previous_treatments: '',
    objectives: '',
  });

  useEffect(() => {
    if (presentation) {
      setForm({
        chief_complaint: presentation.chief_complaint || '',
        history: presentation.history || '',
        family_history: presentation.family_history || '',
        previous_treatments: presentation.previous_treatments || '',
        objectives: presentation.objectives || '',
      });
    }
  }, [presentation]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h3 className="card-title">Apresentação do Paciente</h3>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>Dados clínicos e histórico de apresentação</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Queixa Principal</label>
            <textarea className="form-textarea" rows={4} value={form.chief_complaint}
              onChange={e => set('chief_complaint', e.target.value)}
              placeholder="Descreva o motivo pelo qual o paciente buscou a análise, em suas próprias palavras..." />
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">História de Vida e Anamnese</label>
            <textarea className="form-textarea" rows={8} value={form.history}
              onChange={e => set('history', e.target.value)}
              placeholder="Registre a história de vida do paciente: infância, família de origem, marcos importantes, vínculos afetivos, trajetória profissional..." />
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">História Familiar</label>
            <textarea className="form-textarea" rows={5} value={form.family_history}
              onChange={e => set('family_history', e.target.value)}
              placeholder="Estrutura familiar, relações parentais, figuras de referência, dinâmicas familiares relevantes..." />
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">Tratamentos Anteriores</label>
            <textarea className="form-textarea" rows={3} value={form.previous_treatments}
              onChange={e => set('previous_treatments', e.target.value)}
              placeholder="Análises, terapias e tratamentos psiquiátricos anteriores, medicamentos em uso..." />
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">Objetivos e Demanda Apresentada</label>
            <textarea className="form-textarea" rows={4} value={form.objectives}
              onChange={e => set('objectives', e.target.value)}
              placeholder="O que o paciente espera do tratamento? Há uma demanda explícita?" />
          </div>
        </div>
      </div>
    </div>
  );
}
