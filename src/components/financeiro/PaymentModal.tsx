import { useState } from 'react';
import { X, ExternalLink, Loader } from 'lucide-react';
import { usePayments } from '../../hooks/useData';
import { useApp } from '../../context/AppContext';
import type { Patient } from '../../types';
import { createMPPaymentLink } from '../../lib/mercadoPago';

interface Props {
  patientId: string;
  patient: Patient;
  onClose: () => void;
  onSaved: () => void;
}

export default function PaymentModal({ patientId, patient, onClose, onSaved }: Props) {
  const { settings } = useApp();
  const { createPayment } = usePayments(patientId);
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [mpLink, setMpLink] = useState('');
  const [mpError, setMpError] = useState('');
  const [form, setForm] = useState({
    amount: patient.session_value || settings.default_session_value,
    description: 'Sessão de Psicanálise',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pendente' as const,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const generateMPLink = async () => {
    if (!settings.mp_access_token) {
      setMpError('Configure seu Access Token do Mercado Pago em Configurações.');
      return;
    }
    setGeneratingLink(true);
    setMpError('');
    try {
      const result = await createMPPaymentLink(
        settings.mp_access_token,
        [{ title: form.description, quantity: 1, unit_price: Number(form.amount), currency_id: 'BRL' }],
        { name: patient.name, email: patient.email },
        form.description
      );
      setMpLink(result.init_point);
    } catch (e: any) {
      setMpError(e.message || 'Erro ao gerar link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createPayment({
        patient_id: patientId,
        amount: Number(form.amount),
        description: form.description,
        due_date: form.due_date,
        status: form.status,
        mp_link: mpLink || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Registrar Cobrança</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input className="form-input" type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={e => set('status', e.target.value as any)}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Mercado Pago */}
          <div style={{ background: 'var(--primary-lighter)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>💳</span> Gerar Link de Pagamento — Mercado Pago
            </div>
            {!settings.mp_access_token && (
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                Configure seu Access Token em <strong>Configurações</strong> para habilitar o Mercado Pago.
              </p>
            )}
            {mpError && <p style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 8 }}>{mpError}</p>}
            {mpLink ? (
              <div>
                <p style={{ fontSize: 12.5, color: 'var(--success)', marginBottom: 6 }}>✓ Link gerado com sucesso!</p>
                <a href={mpLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  <ExternalLink size={12} /> Abrir link de pagamento
                </a>
                <input className="form-input" value={mpLink} readOnly style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }} onClick={e => (e.target as HTMLInputElement).select()} />
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={generateMPLink}
                disabled={generatingLink || !settings.mp_access_token}
              >
                {generatingLink ? <><Loader size={12} className="spinner" /> Gerando...</> : '⚡ Gerar Link de Pagamento'}
              </button>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Registrar Cobrança'}
          </button>
        </div>
      </div>
    </div>
  );
}
