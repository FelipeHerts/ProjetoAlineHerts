import { useState } from 'react';
import { Plus, DollarSign, TrendingUp, CheckCircle, Clock, ExternalLink, Edit, Trash2, RefreshCw } from 'lucide-react';
import { usePayments } from '../hooks/useData';
import { formatCurrency, formatDate } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, subMonths, isWithinInterval, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePatients } from '../hooks/useData';
import PaymentModal from '../components/financeiro/PaymentModal';
import { useApp } from '../context/AppContext';
import { checkMPPaymentByPreferenceId } from '../lib/mercadoPago';

export default function Financeiro() {
  const { payments, loading, updatePayment, deletePayment } = usePayments();
  const { patients } = usePatients();
  const { settings: _settings } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [editPayment, setEditPayment] = useState<any>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const handleVerifyPayment = async (p: any) => {
    if (!_settings.mp_access_token) {
      alert('Configure o Access Token do Mercado Pago primeiro.');
      return;
    }
    setCheckingId(p.id);
    try {
      const isPaid = await checkMPPaymentByPreferenceId(_settings.mp_access_token, p.mp_payment_id);
      if (isPaid) {
        await updatePayment(p.id, { status: 'pago', paid_at: new Date().toISOString() });
        alert('Pagamento confirmado e atualizado para Pago!');
      } else {
        alert('Pagamento ainda não foi aprovado.');
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao verificar pagamento');
    } finally {
      setCheckingId(null);
    }
  };

  // Revenue by month (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const interval = { start: startOfMonth(d), end: endOfMonth(d) };
    const monthPayments = payments.filter(p => {
      try { return p.status === 'pago' && isWithinInterval(parseISO(p.created_at), interval); } catch { return false; }
    });
    return {
      month: format(d, 'MMM', { locale: ptBR }),
      receita: monthPayments.reduce((sum, p) => sum + p.amount, 0),
    };
  });

  const totalPaid = payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0);

  const thisMonthRevenue = monthlyData[monthlyData.length - 1]?.receita || 0;

  const filtered = payments.filter(p => statusFilter === 'all' || p.status === statusFilter);
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-subtitle">Controle de pagamentos e receitas</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 'auto' }} value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
            <option value="">Todos os pacientes</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setEditPayment(null); setShowModal(true); }} disabled={!selectedPatientId}>
            <Plus size={15} /> Nova Cobrança
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={22} /></div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalPaid)}</div>
            <div className="stat-label">Total Recebido</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><DollarSign size={22} /></div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(thisMonthRevenue)}</div>
            <div className="stat-label">Este Mês</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><Clock size={22} /></div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalPending)}</div>
            <div className="stat-label">A Receber</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><TrendingUp size={22} /></div>
          <div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              {payments.filter(p => p.status === 'pago').length}
            </div>
            <div className="stat-label">Pagamentos Confirmados</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Receita nos últimos 6 meses</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C8627A" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#C8627A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickFormatter={v => v === 0 ? 'R$ 0' : `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: any) => [formatCurrency(Number(v)), 'Receita']}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
            />
            <Area type="monotone" dataKey="receita" stroke="#C8627A" strokeWidth={2} fill="url(#receitaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payments Table */}
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div className="card-title">Cobranças</div>
        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><DollarSign size={36} className="empty-icon" /><p>Nenhuma cobrança encontrada.</p></div>
        ) : (
          <>
            <table className="hidden-mobile">
              <thead>
                <tr><th>Paciente</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{(p as any).patient?.name || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.description || 'Sessão de Psicanálise'}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td>{formatDate(p.due_date)}</td>
                    <td>
                      <select className="form-select" style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }}
                        value={p.status}
                        onChange={e => updatePayment(p.id, { status: e.target.value as any, ...(e.target.value === 'pago' ? { paid_at: new Date().toISOString() } : {}) })}>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="vencido">Vencido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => { setSelectedPatientId(p.patient_id); setEditPayment(p); setShowModal(true); }}><Edit size={14} /></button>
                        <button className="btn btn-ghost btn-sm" title="Excluir" style={{ color: 'var(--danger)' }} onClick={() => { if (confirm('Excluir esta cobrança?')) deletePayment(p.id); }}><Trash2 size={14} /></button>
                        {p.mp_link && (
                          <a href={p.mp_link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                            <ExternalLink size={11} /> MP
                          </a>
                        )}
                        {p.status === 'pendente' && p.mp_payment_id && (
                          <button 
                            className="btn btn-outline btn-sm" 
                            title="Verificar Pagamento"
                            onClick={() => handleVerifyPayment(p)}
                            disabled={checkingId === p.id}
                          >
                            <RefreshCw size={11} className={checkingId === p.id ? "spinner" : ""} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="mobile-cards">
              {filtered.map(p => (
                <div key={p.id} className="card-mobile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{(p as any).patient?.name || 'Paciente'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.description || 'Sessão de Psicanálise'}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(p.amount)}</div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Venc: {formatDate(p.due_date)}</div>
                    <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                      value={p.status}
                      onChange={e => updatePayment(p.id, { status: e.target.value as any, ...(e.target.value === 'pago' ? { paid_at: new Date().toISOString() } : {}) })}>
                      <option value="pendente">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="vencido">Vencido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => { setSelectedPatientId(p.patient_id); setEditPayment(p); setShowModal(true); }}>
                      <Edit size={13} /> Editar
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', flex: 1 }} onClick={() => { if (confirm('Excluir esta cobrança?')) deletePayment(p.id); }}>
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                  {p.mp_link && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <a href={p.mp_link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        <ExternalLink size={13} /> Pagar (MP)
                      </a>
                      {p.status === 'pendente' && p.mp_payment_id && (
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleVerifyPayment(p)}
                          disabled={checkingId === p.id}
                          title="Verificar Pagamento"
                        >
                          <RefreshCw size={13} className={checkingId === p.id ? "spinner" : ""} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showModal && selectedPatient && (
        <PaymentModal
          patientId={selectedPatientId}
          patient={selectedPatient}
          payment={editPayment}
          onClose={() => { setShowModal(false); setEditPayment(null); }}
          onSaved={() => { setShowModal(false); setEditPayment(null); }}
        />
      )}
    </div>
  );
}
