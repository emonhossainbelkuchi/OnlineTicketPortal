import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';

const NAV_ITEMS = [
  { to: '/', label: 'Analytics', end: true },
  { to: '/operators', label: 'Bus Operators' },
  { to: '/users', label: 'Users & Roles' },
  { to: '/settings', label: 'System Settings' },
  { to: '/audit-logs', label: 'Audit & Activity Logs' },
  { to: '/marketing', label: 'Marketing' },
  { to: '/integrations', label: 'Integration Monitoring' },
  { to: '/complaints', label: 'Complaints' },
];

export function Sidebar() {
  const { currentUser, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Logo size={30} tone="light" />
        <span className="sidebar__brand-text">
          TicketPortal <span className="sidebar__badge">Admin</span>
        </span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'sidebar__link' + (isActive ? ' sidebar__link--active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
        {/* Plain <a>: the management console is a separate document with its own stylesheet. */}
        <a className="sidebar__link sidebar__link--console" href="/admin">
          Management Console
        </a>
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__user">{currentUser?.userName}</span>
        <Button variant="secondary" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
