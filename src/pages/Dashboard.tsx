import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, CalendarPlus, Users, Calendar, DollarSign, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { usePatients } from '../hooks/useData';
import { useSessions } from '../hooks/useData';
import { usePayments } from '../hooks/useData';
import { useApp } from '../context/AppContext';
import { formatCurrency, sessionStatusClass, sessionStatusLabel } from '../lib/utils';
import { format, isToday, isFuture, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SessionModal from '../components/agenda/SessionModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings: _settings } = useApp(); // _settings used if needed later
  const { patients } = usePatients();
  const { sessions } = useSessions();
  const { payments } = usePayments();
  const [showSessionModal, setShowSessionModal] = useState(false);

  const today = new Date();
  const todaySessions = sessions.filter(s => {
    try { return isToday(parseISO(s.date_time)); } catch { return false; }
  });
  const upcomingSessions = sessions
    .filter(s => s.status === 'agendada' && isFuture(parseISO(s.date_time)))
    .sort((a, b) => parseISO(a.date_time).getTime() - parseISO(b.date_time).getTime())
    .slice(0, 5);
  const activePatients = patients.filter(p => p.status === 'ativo').length;
  const thisMonthPayments = payments.filter(p => {
    const d = parseISO(p.created_at);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && p.status === 'pago';
  });
  const monthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pendente').length;

  const hour = today.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, Aline 👋</h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            {todaySessions.length > 0
              ? `Você tem ${todaySessions.length} consulta${todaySessions.length > 1 ? 's' : ''} agendada${todaySessions.length > 1 ? 's' : ''} para hoje.`
              : 'Você não tem consultas agendadas para hoje.'}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/pacientes?novo=1')}>
            <UserPlus size={15} /> Novo Paciente
          </button>
          <button className="btn btn-primary" onClick={() => setShowSessionModal(true)}>
            <CalendarPlus size={15} /> Nova Consulta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon pink"><Users size={22} /></div>
          <div>
            <div className="stat-value">{activePatients}</div>
            <div className="stat-label">Pacientes Ativos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Calendar size={22} /></div>
          <div>
            <div className="stat-value">{todaySessions.length}</div>
            <div className="stat-label">Sessões Hoje</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value">{formatCurrency(monthRevenue)}</div>
            <div className="stat-label">Recebido este Mês</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><TrendingUp size={22} /></div>
          <div>
            <div className="stat-value">{pendingPayments}</div>
            <div className="stat-label">Pagamentos Pendentes</div>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Upcoming sessions */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Próximas Sessões</div>
              <div className="card-subtitle">Sessões agendadas</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agenda')}>
              Ver agenda completa <ChevronRight size={14} />
            </button>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} className="empty-icon" />
              <p>Nenhuma sessão futura agendada.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {upcomingSessions.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 0',
                  borderBottom: i < upcomingSessions.length - 1 ? '1px solid var(--border-light)' : 'none'
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary-light)', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
                      {format(parseISO(s.date_time), 'd')}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {format(parseISO(s.date_time), 'MMM', { locale: ptBR })}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{(s as any).patient?.name || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Clock size={11} />
                      {format(parseISO(s.date_time), 'HH:mm')} · {s.duration_min} min
                    </div>
                  </div>
                  <span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Pagamentos Recentes</div>
              <div className="card-subtitle">Últimas cobranças</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/financeiro')}>Ver todos</button>
          </div>
          {payments.slice(0, 6).length === 0 ? (
            <div className="empty-state">
              <DollarSign size={36} className="empty-icon" />
              <p>Nenhum pagamento registrado.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {payments.slice(0, 6).map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < 5 ? '1px solid var(--border-light)' : 'none'
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{(p as any).patient?.name || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                      {p.description || 'Sessão de Psicanálise'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(p.amount)}</div>
                    <span className={`badge ${p.status === 'pago' ? 'badge-success' : p.status === 'pendente' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: 10.5 }}>
                      {p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSessionModal && (
        <SessionModal onClose={() => setShowSessionModal(false)} onSaved={() => setShowSessionModal(false)} />
      )}
    </div>
  );
}
