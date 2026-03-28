import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, RefreshCw, Phone, Mail, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSessions, usePatients } from '../hooks/useData';
import { useApp } from '../context/AppContext';
import { loadGoogleScripts, listUpcomingEvents } from '../lib/googleCalendar';
import { sessionStatusClass, sessionStatusLabel, formatCurrency, extractMeetLink } from '../lib/utils';
import SessionModal from '../components/agenda/SessionModal';
import type { Session, GoogleEvent } from '../types';

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editSession, setEditSession] = useState<Session | undefined>();
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { settings } = useApp();
  const { patients, createPatient, loading: patientsLoading } = usePatients();
  const { sessions, refetch, updateSession, createSession, loading: sessionsLoading } = useSessions();

  const fetchGoogleEvents = async () => {
    if (syncing || !settings.google_calendar_id) return;
    if (patientsLoading || sessionsLoading) return;
    setSyncing(true);
    try {
      await loadGoogleScripts();
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();
      const events = await listUpcomingEvents(settings.google_calendar_id, start, end);
      
      let hasNewInternalSessions = false;
      
      if (events) {
        // Clone lists to update locally during loop
        const localPatients = [...patients];
        const localSessions = [...sessions];
        
        for (const event of events) {
          const isConsultaOnline = event.summary?.toLowerCase().includes('consulta online') || 
                                   (event.description && event.description.includes('calendar.app.google'));
          
          if (isConsultaOnline) {
            const sessionExists = localSessions.some(s => s.google_event_id === event.id);
            if (!sessionExists) {
              // Extrair campos da descrição
              const cleanDesc = event.description.replace(/<br\s*\/?>(?:\s*<br\s*\/?>)*/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '');
              
              const extractField = (label: string) => {
                const regex = new RegExp(`(?:${label})\\s*:?\\s*\\n?\\s*([^\\n]+)`, 'i');
                const match = cleanDesc.match(regex);
                return match ? match[1].trim() : undefined;
              };

              // Reservado por é padrão do Google, mas procuramos pelas labels customizadas também
              const extName = extractField('Reservado por') || extractField('Nome');
              const extEmail = extractField('E-mail') || extractField('Email');
              const extPhone = extractField('Telefone') || extractField('Celular');
              const extCpf = extractField('CPF');

              let fallbackName = event.summary.replace(/consulta online/i, '').replace(/[-:]/g, '').trim();
              fallbackName = fallbackName || 'Paciente (Sem Nome)';
              const patientName = extName || fallbackName.split(' e ')[0].split(' and ')[0].trim();
              
              let patientToUse = localPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
              
              if (!patientToUse) {
                const newPatientData: any = { name: patientName, status: 'ativo' };
                if (extEmail) newPatientData.email = extEmail;
                if (extPhone) newPatientData.phone = extPhone;
                if (extCpf) newPatientData.cpf = extCpf;

                patientToUse = await createPatient(newPatientData);
                if (patientToUse) {
                  localPatients.push(patientToUse);
                }
              }
              
              if (patientToUse) {
                const newSession = await createSession({
                  patient_id: patientToUse.id,
                  date_time: event.start.dateTime,
                  duration_min: settings.default_session_duration || 50,
                  status: 'agendada',
                  google_event_id: event.id,
                  value: settings.default_session_value || 0,
                  meet_link: event.hangoutLink || undefined,
                  calendar_link: event.htmlLink || undefined
                });
                localSessions.push(newSession);
                hasNewInternalSessions = true;
              }
            }
          }
        }
      }

      setGoogleEvents(events || []);
      if (hasNewInternalSessions) refetch();

    } catch (err) {
      console.error('Failed to fetch Google events:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!patientsLoading && !sessionsLoading && settings.google_calendar_id) {
      fetchGoogleEvents();
    }
  }, [currentDate, settings.google_calendar_id, patientsLoading, sessionsLoading]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const sessionsByDay = (day: Date) => {
    const internal = sessions.filter(s => { 
      try { return isSameDay(parseISO(s.date_time), day); } catch { return false; } 
    });
    const external = googleEvents.filter(e => {
      if (sessions.some(s => s.google_event_id === e.id)) return false;
      try { return isSameDay(parseISO(e.start.dateTime), day); } catch { return false; }
    });
    return { internal, external };
  };

  const dayData = selectedDate ? sessionsByDay(selectedDate) : { internal: [], external: [] };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // For list view
  const monthSessions = sessions.filter(s => {
    try {
      const d = parseISO(s.date_time);
      return d >= monthStart && d <= monthEnd;
    } catch { return false; }
  }).sort((a, b) => parseISO(a.date_time).getTime() - parseISO(b.date_time).getTime());

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Gerencie as consultas e sessões</p>
        </div>
        <div className="page-header-actions">
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {(['mes', 'lista'] as const).map(v => (
              <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 0, border: 'none' }}
                onClick={() => setView(v)}>
                {v === 'mes' ? 'Mês' : 'Lista'}
              </button>
            ))}
          </div>
          {settings.google_calendar_id && (
            <button className={`btn btn-outline btn-sm ${syncing ? 'loading' : ''}`} onClick={fetchGoogleEvents} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spinner' : ''} /> {syncing ? 'Sincronizando...' : 'Sincronizar Google'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setEditSession(undefined); setShowModal(true); }}>
            <Plus size={15} /> Nova Consulta
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="card">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setCurrentDate(d => subMonths(d, 1))}><ChevronLeft size={18} /></button>
          <h3>{format(currentDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}</h3>
          <button className="icon-btn" onClick={() => setCurrentDate(d => addMonths(d, 1))}><ChevronRight size={18} /></button>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentDate(new Date())}>Hoje</button>
        </div>

        {view === 'mes' && (
          <>
            {/* Week day headers */}
            <div className="calendar-grid" style={{ marginBottom: 4 }}>
              {weekDays.map(d => <div key={d} className="cal-header">{d}</div>)}
            </div>
            {/* Days */}
            <div className="calendar-grid">
              {days.map(day => {
                const { internal, external } = sessionsByDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const hasWork = internal.length > 0 || external.length > 0;
                return (
                  <div
                    key={day.toISOString()}
                    className={`cal-day${!isSameMonth(day, currentDate) ? ' other-month' : ''}${isToday(day) ? ' today' : ''}${hasWork ? ' has-sessions' : ''}${isSelected ? ' today' : ''}`}
                    onClick={() => setSelectedDate(isSameDay(day, selectedDate || new Date(0)) ? null : day)}
                    style={{ cursor: 'pointer', outline: isSelected ? '2px solid var(--primary)' : 'none' }}
                  >
                    <div className="cal-day-num">{format(day, 'd')}</div>
                    {internal.slice(0, 2).map(s => (
                      <div key={s.id} className="cal-event" title={(s as any).patient?.name} onClick={e => { e.stopPropagation(); setEditSession(s); setShowModal(true); }}>
                        {format(parseISO(s.date_time), 'HH:mm')} {(s as any).patient?.name?.split(' ')[0]}
                      </div>
                    ))}
                    {external.slice(0, 2 - Math.min(internal.length, 2)).map(e => (
                      <div key={e.id} className="cal-event" style={{ background: '#e2e8f0', color: '#475569', borderLeft: '3px solid #64748b' }} title={e.summary}>
                        <span style={{ fontSize: 9, opacity: 0.7 }}>G </span>
                        {format(parseISO(e.start.dateTime), 'HH:mm')} {e.summary.split(' ')[0]}
                      </div>
                    ))}
                    {(internal.length + external.length) > 2 && <div className="cal-event" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>+{internal.length + external.length - 2} mais</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'lista' && (
          <div>
            {monthSessions.length === 0 ? (
              <div className="empty-state"><Calendar size={36} className="empty-icon" /><p>Nenhuma sessão neste mês.</p></div>
            ) : (
              <div className="table-container" style={{ border: 'none' }}>
                <table className="hidden-mobile">
                  <thead>
                    <tr><th>Data e Hora</th><th>Paciente</th><th>Duração</th><th>Status</th><th>Ações</th><th></th></tr>
                  </thead>
                  <tbody>
                    {monthSessions.map(s => (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => { setEditSession(s); setShowModal(true); }}>
                        <td>{format(parseISO(s.date_time), "dd/MM/yyyy 'às' HH:mm")}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{(s as any).patient?.name || '—'}</div>
                        </td>
                        <td>{s.duration_min} min</td>
                        <td><span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span></td>
                        <td>
                          {extractMeetLink(s) ? (
                            <a href={extractMeetLink(s)!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="btn btn-outline btn-sm" style={{ padding: '2px 8px', fontSize: 11, borderColor: '#4285F4', color: '#4285F4' }}>
                              Entrar na Sala
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <select className="form-select" style={{ padding: '4px 8px', fontSize: 12 }}
                            value={s.status} onClick={e => e.stopPropagation()}
                            onChange={e => updateSession(s.id, { status: e.target.value as Session['status'] })}>
                            <option value="agendada">Agendada</option>
                            <option value="realizada">Realizada</option>
                            <option value="cancelada">Cancelada</option>
                            <option value="faltou">Faltou</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="mobile-cards">
                  {monthSessions.map(s => (
                    <div key={s.id} className="card-mobile" onClick={() => { setEditSession(s); setShowModal(true); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{format(parseISO(s.date_time), "dd/MM/yy 'às' HH:mm")}</div>
                        <span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{(s as any).patient?.name || '—'}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        <div>{s.duration_min} min</div>
                        {extractMeetLink(s) && (
                          <a href={extractMeetLink(s)!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="btn btn-outline btn-sm" style={{ padding: '2px 8px', fontSize: 11, borderColor: '#4285F4', color: '#4285F4' }}>
                            Entrar na Sala
                          </a>
                        )}
                        {!extractMeetLink(s) && <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>Ver detalhes</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected day panel */}
      {selectedDate && view === 'mes' && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={13} /> Agendar neste dia
            </button>
          </div>
          {dayData.internal.length === 0 && dayData.external.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>Nenhuma consulta neste dia.</p>
          ) : (
            <>
              {dayData.internal.map(s => {
                const pat = (s as any).patient;
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ width: 4, minHeight: 40, background: 'var(--primary)', borderRadius: 4, flexShrink: 0, alignSelf: 'stretch' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{pat?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {format(parseISO(s.date_time), 'HH:mm')} — {s.duration_min}min</span>
                        {s.value && <span>{formatCurrency(s.value)}</span>}
                      </div>
                      {/* Patient personal data */}
                      {pat && (pat.phone || pat.email || pat.cpf) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginTop: 5 }}>
                          {pat.cpf && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <User size={10} style={{ color: 'var(--primary)' }} /> <strong>CPF:</strong>&nbsp;{pat.cpf}
                            </span>
                          )}
                          {pat.phone && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Phone size={10} style={{ color: 'var(--primary)' }} /> {pat.phone}
                            </span>
                          )}
                          {pat.email && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Mail size={10} style={{ color: 'var(--primary)' }} /> {pat.email}
                            </span>
                          )}
                        </div>
                      )}
                      {extractMeetLink(s) && (
                        <div style={{ marginTop: 6 }}>
                          <a href={extractMeetLink(s)!} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ padding: '2px 8px', fontSize: 11, borderColor: '#4285F4', color: '#4285F4' }}>
                            Entrar na Sala
                          </a>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditSession(s); setShowModal(true); }}>Editar</button>
                    </div>
                  </div>
                );
              })}
              {dayData.external.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)', opacity: 0.8 }}>
                  <div style={{ width: 4, height: 40, background: '#64748b', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{e.summary} <span className="badge badge-outline" style={{ fontSize: 9 }}>Google</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                      <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {format(parseISO(e.start.dateTime), 'HH:mm')}</span>
                      {e.location && <span>{e.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {showModal && (
        <SessionModal
          session={editSession}
          defaultPatientId={editSession?.patient_id}
          onClose={() => { setShowModal(false); setEditSession(undefined); }}
          onSaved={() => { setShowModal(false); setEditSession(undefined); refetch(); }}
        />
      )}
    </div>
  );
}
