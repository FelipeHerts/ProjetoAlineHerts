import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, DollarSign, Settings, X, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../lib/utils';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { settings } = useApp();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.png" alt="Logo Aline Herts" />
        </div>
        <button className="sidebar-close mobile-only" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <div className="nav-item-content">
              <Icon className="nav-icon" />
              <span className="nav-label">{label}</span>
            </div>
            <ChevronRight className="nav-arrow" size={16} />
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{getInitials(settings.analyst_name)}</div>
        <div className="user-info">
          <div className="user-name">{settings.analyst_name}</div>
          <div className="user-role">Psicanalista{settings.analyst_crp ? ` • CRP ${settings.analyst_crp}` : ''}</div>
        </div>
      </div>
    </aside>
  );
}
