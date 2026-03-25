import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, DollarSign } from 'lucide-react';

export default function MobileNav() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Painel' },
    { to: '/pacientes', icon: Users, label: 'Pacientes' },
    { to: '/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
        >
          <item.icon className="nav-icon" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
