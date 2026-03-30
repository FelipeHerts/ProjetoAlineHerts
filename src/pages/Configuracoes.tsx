import { useState, useEffect } from 'react';
import { Settings, Calendar, Brain, Save, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { loadGoogleScripts, handleAuthClick, listUpcomingEvents } from '../lib/googleCalendar';

export default function Configuracoes() {
  const { settings, updateSettings } = useApp();
  const [saved, setSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [googleScriptsLoaded, setGoogleScriptsLoaded] = useState(false);
  const [form, setForm] = useState({ ...settings });

  useEffect(() => {
    loadGoogleScripts().then(() => setGoogleScriptsLoaded(true));
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleConnectGoogle = () => {
    setConnecting(true);
    handleAuthClick(
      (token) => {
        console.log('Google Auth success:', token);
        setConnecting(false);
        updateSettings({ google_calendar_connected: true });
        alert('Google Calendar conectado com sucesso!');
      },
      (err) => {
        console.error('Google Auth Error:', err);
        setConnecting(false);
        alert('Erro ao conectar com Google: ' + (err.error || err.message || 'Verifique o Console do Desenvolvedor.'));
      }
    );
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const calId = settings.google_calendar_id || 'primary';
      const events = await listUpcomingEvents(calId);
      alert(`Sucesso! Conexão ativa.\nEventos encontrados: ${events?.length || 0}`);
    } catch (err: any) {
      alert('Erro no teste: ' + (err.error?.message || err.message || 'Verifique o Console.'));
    } finally {
      setTesting(false);
    }
  };

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
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={form.analyst_whatsapp || ''} onChange={e => set('analyst_whatsapp', e.target.value)} placeholder="18999999999" />
              <span className="form-hint">Usado para contato e envio de links aos pacientes</span>
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
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            {settings.google_calendar_id
              ? `Calendário: ${settings.google_calendar_id}`
              : 'Sincronize sessões automaticamente com o Google Calendar.'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleConnectGoogle}
              disabled={connecting || !googleScriptsLoaded}
            >
              {connecting
                ? <><RefreshCw size={12} className="spinner" /> Conectando...</>
                : <>{settings.google_calendar_id ? '🔄 Reconectar' : '🔗 Conectar Google Calendar'}</>
              }
            </button>
            {settings.google_calendar_id && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            )}
          </div>
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

      <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
        Desenvolvido por Felipe Hertz.
      </div>
    </div>
  );
}
