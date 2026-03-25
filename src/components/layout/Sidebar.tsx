import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, DollarSign, Settings, Brain } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getInitials } from '../../lib/utils';

const navItems = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const { settings } = useApp();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Brain size={18} />
        </div>
        <div className="clinic-name">{settings.analyst_name}</div>
        <div className="clinic-sub">{settings.clinic_name}</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon className="nav-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{getInitials(settings.analyst_name)}</div>
        <div>
          <div className="user-name">{settings.analyst_name}</div>
          <div className="user-role">Psicanalista{settings.analyst_crp ? ` • CRP ${settings.analyst_crp}` : ''}</div>
        </div>
      </div>
    </div>
  );
}
