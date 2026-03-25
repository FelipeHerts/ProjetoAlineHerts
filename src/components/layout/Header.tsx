import { useState, useEffect } from 'react';
import { Search, Bell, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';

export default function Header() {
  const { searchQuery, setSearchQuery } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const dateStr = format(now, "EEEE, dd 'de' MMM • HH:mm", { locale: ptBR });
  const dateFormatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <header className="header">
      <div className="search-bar">
        <Search size={15} color="var(--text-muted)" />
        <input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={setSearchQuery ? (e => setSearchQuery(e.target.value)) : undefined}
        />
      </div>

      <div className="header-right">
        <div className="header-time hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="var(--text-muted)" />
          {dateFormatted}
        </div>
        <button className="icon-btn" title="Notificações">
          <Bell size={16} />
        </button>
      </div>
    </header>
  );
}
