import { useState } from 'react';
import { Settings, Calendar, Brain, Save, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Configuracoes() {
  const { settings, updateSettings } = useApp();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ ...settings });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Perfil, integrações e preferências</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={14} /> {saved ? '✓ Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      <div className="config-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Perfil da Clínica */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={18} color="var(--primary)" />
              <div className="card-title">Perfil da Clínica</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Nome da Analista</label>
              <input className="form-input" value={form.analyst_name} onChange={e => set('analyst_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CRP</label>
              <input className="form-input" value={form.analyst_crp || ''} onChange={e => set('analyst_crp', e.target.value)} placeholder="00/000000" />
            </div>
            <div className="form-group">
              <label className="form-label">Nome da Clínica</label>
              <input className="form-input" value={form.clinic_name} onChange={e => set('clinic_name', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Padrões de Sessão */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} color="var(--primary)" />
              <div className="card-title">Padrões de Sessão</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Duração padrão (minutos)</label>
              <input className="form-input" type="number" min={10} value={form.default_session_duration}
                onChange={e => set('default_session_duration', Number(e.target.value))} />
              <span className="form-hint">Será sugerido ao criar novas sessões</span>
            </div>
            <div className="form-group">
              <label className="form-label">Valor padrão da sessão (R$)</label>
              <input className="form-input" type="number" min={0} value={form.default_session_value}
                onChange={e => set('default_session_value', Number(e.target.value))} />
              <span className="form-hint">Valor pré-preenchido em novos agendamentos</span>
            </div>
          </div>
        </div>

        {/* Google Calendar */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} color="#4285F4" />
              <div className="card-title">Google Calendar</div>
            </div>
            {settings.google_calendar_id ? (
              <span className="badge badge-success"><CheckCircle size={11} /> Ativo</span>
            ) : (
              <span className="badge badge-warning"><XCircle size={11} /> Não configurado</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {settings.google_calendar_id
              ? `Sincronizado com: ${settings.google_calendar_id}`
              : 'Configuração gerenciada pelo administrador do sistema.'}
          </p>
        </div>

        {/* Mercado Pago */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <div className="card-title">Mercado Pago</div>
            </div>
            {settings.mp_access_token ? (
              <span className="badge badge-success"><CheckCircle size={11} /> Ativo</span>
            ) : (
              <span className="badge badge-warning"><XCircle size={11} /> Não configurado</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {settings.mp_access_token
              ? 'Pagamentos via link habilitados.'
              : 'Configuração gerenciada pelo administrador do sistema.'}
          </p>
        </div>

      </div>

    </div>
  );
}
