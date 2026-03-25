import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSessions } from '../hooks/useData';
import { useApp } from '../context/AppContext';
import { loadGoogleScripts, listUpcomingEvents } from '../lib/googleCalendar';
import { sessionStatusClass, sessionStatusLabel, formatCurrency } from '../lib/utils';
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
  const { sessions, refetch, updateSession } = useSessions();

  const fetchGoogleEvents = async () => {
    if (!settings.google_calendar_connected || !settings.google_calendar_id) return;
    setSyncing(true);
    try {
      await loadGoogleScripts();
      const start = startOfMonth(currentDate).toISOString();
      const end = endOfMonth(currentDate).toISOString();
      const events = await listUpcomingEvents(settings.google_calendar_id, start, end);
      setGoogleEvents(events || []);
    } catch (err) {
      console.error('Failed to fetch Google events:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchGoogleEvents();
  }, [currentDate, settings.google_calendar_connected]);

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
          {settings.google_calendar_connected && (
            <button className={`btn btn-outline btn-sm ${syncing ? 'loading' : ''}`} onClick={fetchGoogleEvents} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spinner' : ''} /> {syncing ? 'Sincronizando...' : 'Sincronizar'}
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
                <table>
                  <thead>
                    <tr><th>Data e Hora</th><th>Paciente</th><th>Duração</th><th>Valor</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {monthSessions.map(s => (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => { setEditSession(s); setShowModal(true); }}>
                        <td>{format(parseISO(s.date_time), "dd/MM/yyyy 'às' HH:mm")}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{(s as any).patient?.name || '—'}</div>
                        </td>
                        <td>{s.duration_min} min</td>
                        <td>{s.value ? formatCurrency(s.value) : '—'}</td>
                        <td><span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span></td>
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
              {dayData.internal.map(s => (
                <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ width: 4, height: 40, background: 'var(--primary)', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{(s as any).patient?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                      <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {format(parseISO(s.date_time), 'HH:mm')} — {s.duration_min}min</span>
                      {s.value && <span>{formatCurrency(s.value)}</span>}
                    </div>
                  </div>
                  <span className={`badge ${sessionStatusClass[s.status]}`}>{sessionStatusLabel[s.status]}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditSession(s); setShowModal(true); }}>Editar</button>
                </div>
              ))}
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
