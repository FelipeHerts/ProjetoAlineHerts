import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Search } from 'lucide-react';
import { usePatients } from '../hooks/useData';
import { useApp } from '../context/AppContext';
import { formatDate, ageBirthDate, patientStatusClass, patientStatusLabel, getInitials } from '../lib/utils';
import PatientModal from '../components/patients/PatientModal';
import type { Patient } from '../types';

export default function Pacientes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { searchQuery } = useApp();
  const { patients, loading, createPatient } = usePatients();
  const [showModal, setShowModal] = useState(searchParams.get('novo') === '1');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');

  const query = localSearch || searchQuery;
  const filtered = patients.filter(p => {
    const matchSearch = !query || p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.phone || '').includes(query);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pacientes</h1>
          <p className="page-subtitle">{patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus size={15} /> Novo Paciente
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ maxWidth: 320, flex: '1' }}>
          <Search size={14} color="var(--text-muted)" />
          <input placeholder="Buscar por nome, email..." value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="alta">Alta</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="spinner" /> Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 14 }}>Nenhum paciente encontrado.</p>
            {patients.length === 0 && (
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowModal(true)}>
                <UserPlus size={14} /> Cadastrar primeiro paciente
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Telefone</th>
                <th>Idade</th>
                <th>Desde</th>
                <th>Valor/Sessão</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="patient-row" onClick={() => navigate(`/pacientes/${p.id}`)}>
                  <td>
                    <div className="patient-info">
                      <div className="patient-avatar">{getInitials(p.name)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>{ageBirthDate(p.birth_date)}</td>
                  <td>{formatDate(p.started_at)}</td>
                  <td>{p.session_value ? `R$ ${p.session_value}` : '—'}</td>
                  <td><span className={`badge ${patientStatusClass[p.status]}`}>{patientStatusLabel[p.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <PatientModal
          onClose={() => setShowModal(false)}
          onSaved={async (data) => { await createPatient(data); setShowModal(false); }}
        />
      )}
    </div>
  );
}
