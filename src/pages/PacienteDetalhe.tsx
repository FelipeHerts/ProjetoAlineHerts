import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, FileText, Calendar, DollarSign, Phone, Mail } from 'lucide-react';
import { usePatients, useSessions, usePayments, useProntuario, usePresentation } from '../hooks/useData';
import { formatDate, formatDateTime, formatCurrency, ageBirthDate, getInitials, sessionStatusClass, sessionStatusLabel, paymentStatusClass, paymentStatusLabel, patientStatusClass, patientStatusLabel } from '../lib/utils';
import PatientModal from '../components/patients/PatientModal';
import ProntuarioModal from '../components/patients/ProntuarioModal';
import PresentationEditor from '../components/patients/PresentationEditor';
import SessionModal from '../components/agenda/SessionModal';
import PaymentModal from '../components/financeiro/PaymentModal';



const TABS = ['Dados', 'Apresentação', 'Prontuário', 'Sessões', 'Financeiro'];

export default function PacienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dados');
  const [editPatient, setEditPatient] = useState(false);
  const [showProntuario, setShowProntuario] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [showSession, setShowSession] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const { patients, updatePatient, deletePatient } = usePatients();
  const { sessions } = useSessions(id);
  const { payments } = usePayments(id);
  const { records, createRecord, updateRecord, deleteRecord } = useProntuario(id!);
  const { presentation, save: savePresentation } = usePresentation(id!);

  const patient = patients.find(p => p.id === id);

  if (!patient) {
    return (
      <div className="loading-page">
        <div className="spinner" /> Carregando paciente...
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente excluir o paciente ${patient.name}? Esta ação não pode ser desfeita.`)) return;
    await deletePatient(patient.id);
    navigate('/pacientes');
  };

  return (
    <div>
      {/* Back + Breadcrumb */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/pacientes')}>
        <ArrowLeft size={14} /> Voltar para Pacientes
      </button>

      {/* Patient Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: 'var(--primary)', flexShrink: 0
        }}>
          {getInitials(patient.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ fontSize: 22 }}>{patient.name}</h1>
            <span className={`badge ${patientStatusClass[patient.status]}`}>{patientStatusLabel[patient.status]}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {patient.email && <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}><Mail size={12} />{patient.email}</span>}
            {patient.phone && <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}><Phone size={12} />{patient.phone}</span>}
            {patient.birth_date && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{ageBirthDate(patient.birth_date)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setEditPatient(true)}><Edit size={13} /> Editar</button>
          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleDelete}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* Tab: Dados */}
      {activeTab === 'Dados' && (
        <div>
          <div className="card">
            <div className="card-header"><div className="card-title">Dados Pessoais</div></div>
            <div className="info-grid">
              {[
                { label: 'Nome Completo', value: patient.name },
                { label: 'CPF', value: patient.cpf || '—' },
                { label: 'Data de Nascimento', value: formatDate(patient.birth_date) },
                { label: 'Idade', value: ageBirthDate(patient.birth_date) },
                { label: 'Telefone', value: patient.phone || '—' },
                { label: 'E-mail', value: patient.email || '—' },
                { label: 'Profissão', value: patient.occupation || '—' },
                { label: 'Endereço', value: patient.address || '—' },
                { label: 'Contato de Emergência', value: patient.emergency_contact || '—' },
                { label: 'Tel. Emergência', value: patient.emergency_phone || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="info-item">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><div className="card-title">Dados do Atendimento</div></div>
            <div className="info-grid">
              {[
                { label: 'Em atendimento desde', value: formatDate(patient.started_at) },
                { label: 'Duração da Sessão', value: patient.session_duration ? `${patient.session_duration} min` : `${50} min` },
                { label: 'Valor da Sessão', value: patient.session_value ? formatCurrency(patient.session_value) : '—' },
                { label: 'Total de Sessões', value: `${sessions.length}` },
              ].map(({ label, value }) => (
                <div key={label} className="info-item">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
            {patient.notes && (
              <div style={{ marginTop: 16 }}>
                <div className="info-label" style={{ marginBottom: 6 }}>Observações</div>
                <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{patient.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Apresentação */}
      {activeTab === 'Apresentação' && (
        <PresentationEditor presentation={presentation} onSave={savePresentation} />
      )}

      {/* Tab: Prontuário */}
      {activeTab === 'Prontuário' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => { setEditRecord(null); setShowProntuario(true); }}>
              <Plus size={14} /> Nova Anotação
            </button>
          </div>
          {records.length === 0 ? (
            <div className="empty-state card"><FileText size={40} className="empty-icon" /><p>Nenhuma anotação no prontuário ainda.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {records.map((r, i) => (
                <div key={r.id} className="card">
                  <div className="card-header" style={{ marginBottom: 10 }}>
                    <div>
                      <div className="card-title" style={{ fontSize: 14 }}>
                        Sessão {r.session_number || records.length - i} — {formatDate(r.date)}
                      </div>
                      {r.themes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Temas: {r.themes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditRecord(r); setShowProntuario(true); }}><Edit size={12} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteRecord(r.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{r.content}</p>
                  {r.analyst_notes && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--primary-lighter)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                      <div className="section-label" style={{ marginBottom: 4 }}>Notas da analista</div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.analyst_notes}</p>
                    </div>
                  )}
                  {r.dreams && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#F3F0FF', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--secondary)' }}>
                      <div className="section-label" style={{ marginBottom: 4 }}>Sonhos / Associações</div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.dreams}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Sessões */}
      {activeTab === 'Sessões' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary" onClick={() => setShowSession(true)}>
              <Plus size={14} /> Agendar Sessão
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state card"><Calendar size={40} className="empty-icon" /><p>Nenhuma sessão registrada.</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data e Hora</th>
                    <th>Duração</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td>{formatDateTime(s.date_time)}</td>
                      <td>{s.duration_min} min</td>
                      <td>{s.value ? formatCurrency(s.value) : '—'}</td>
                      <td><span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Financeiro */}
      {activeTab === 'Financeiro' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                Total pago: {formatCurrency(payments.filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0))}
              </span>
              <span style={{ marginLeft: 16, color: 'var(--warning)', fontWeight: 600 }}>
                Pendente: {formatCurrency(payments.filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0))}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => setShowPayment(true)}>
              <Plus size={14} /> Registrar Cobrança
            </button>
          </div>
          {payments.length === 0 ? (
            <div className="empty-state card"><DollarSign size={40} className="empty-icon" /><p>Nenhum pagamento registrado.</p></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Link Pagamento</th></tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.description || 'Sessão de Psicanálise'}</td>
                      <td>{formatCurrency(p.amount)}</td>
                      <td>{formatDate(p.due_date)}</td>
                      <td><span className={`badge ${paymentStatusClass[p.status]}`}>{paymentStatusLabel[p.status]}</span></td>
                      <td>
                        {p.mp_link ? (
                          <a href={p.mp_link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Abrir link</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {editPatient && (
        <PatientModal
          patient={patient}
          onClose={() => setEditPatient(false)}
          onSaved={async (data) => { await updatePatient(patient.id, data); setEditPatient(false); }}
        />
      )}
      {showProntuario && (
        <ProntuarioModal
          patientId={id!}
          record={editRecord}
          sessionNumber={records.length + 1}
          onClose={() => { setShowProntuario(false); setEditRecord(null); }}
          onSaved={async (data) => {
            if (editRecord) await updateRecord(editRecord.id, data);
            else await createRecord(data);
            setShowProntuario(false); setEditRecord(null);
          }}
        />
      )}
      {showSession && (
        <SessionModal
          defaultPatientId={id}
          onClose={() => setShowSession(false)}
          onSaved={() => setShowSession(false)}
        />
      )}
      {showPayment && (
        <PaymentModal
          patientId={id!}
          patient={patient}
          onClose={() => setShowPayment(false)}
          onSaved={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
