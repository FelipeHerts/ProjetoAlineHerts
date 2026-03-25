import { useState, useEffect } from 'react';
import { Settings, Key, Calendar, Brain, Save, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';
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
    if (!form.google_calendar_id) {
      alert('Por favor, insira o ID do Calendário antes de conectar.');
      return;
    }
    setConnecting(true);
    handleAuthClick(
      (token) => {
        console.log('Google Auth success:', token);
        setForm(prev => ({ ...prev, google_calendar_connected: true }));
        setConnecting(false);
        updateSettings({ ...form, google_calendar_connected: true });
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
    if (!form.google_calendar_connected) {
      alert('Conecte primeiro para testar.');
      return;
    }
    setTesting(true);
    try {
      const events = await listUpcomingEvents(form.google_calendar_id || 'primary');
      alert(`Sucesso! Conexão ativa.\nTotal de próximos eventos encontrados: ${events?.length || 0}`);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Profile */}
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

        {/* Session defaults */}
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
            {settings.google_calendar_connected && (
              <span className="badge badge-success"><CheckCircle size={11} /> Conectado</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Sincronize as sessões automaticamente com seu Google Calendar.
          </p>
          <div className="alert alert-info" style={{ marginBottom: 14 }}>
            Para integrar com o Google Calendar, você precisa criar um projeto no Google Cloud Console
            e configurar as credenciais OAuth2.
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">ID do Calendário Google</label>
            <input className="form-input" value={form.google_calendar_id || ''}
              onChange={e => set('google_calendar_id', e.target.value)}
              placeholder="seu-email@gmail.com ou ID do calendário" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {form.google_calendar_connected ? (
              <button className="btn btn-outline btn-sm" onClick={() => set('google_calendar_connected', false)}>
                Desconectar
              </button>
            ) : (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleConnectGoogle}
                disabled={connecting || !googleScriptsLoaded}
              >
                {connecting ? <><RefreshCw size={12} className="spinner" /> Conectando...</> : 'Conectar Google Calendar'}
              </button>
            )}
            {form.google_calendar_connected && (
              <button 
                className="btn btn-outline btn-sm" 
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            )}
            <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <ExternalLink size={12} /> Console Cloud
            </a>
          </div>
        </div>

        {/* Mercado Pago */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={18} color="#009EE3" />
              <div className="card-title">Mercado Pago</div>
            </div>
            {settings.mp_access_token && (
              <span className="badge badge-success"><CheckCircle size={11} /> Configurado</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            Configure suas credenciais para gerar links de pagamento automáticos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Access Token</label>
              <input className="form-input" type="password" value={form.mp_access_token || ''}
                onChange={e => set('mp_access_token', e.target.value)}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div className="form-group">
              <label className="form-label">Public Key</label>
              <input className="form-input" value={form.mp_public_key || ''}
                onChange={e => set('mp_public_key', e.target.value)}
                placeholder="APP_USR-xxxx-xxxx-xxxx-xxxx" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <ExternalLink size={12} /> Mercado Pago Developers
            </a>
          </div>
        </div>
      </div>

      {/* Supabase / Data */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Banco de Dados — Supabase</div>
        </div>
        <div className="alert alert-warning">
          <div>
            <strong>Configuração necessária:</strong> Crie um arquivo <code>.env</code> na raiz do projeto com as variáveis:<br />
            <code style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              VITE_SUPABASE_URL=https://seu-projeto.supabase.co<br />
              VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
            </code>
            <div style={{ marginTop: 8 }}>
              Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'inherit', fontWeight: 600 }}>supabase.com</a> → Crie um projeto → API para obter as credenciais.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
