import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../data/navigation';
import { useApp } from '../context/AppContext';
import { computeStreak } from '../utils/calculations';
import Icon from './Icon';
import Logo from './Logo';

export default function Sidebar() {
  const { settings, streakDays } = useApp();
  const streak = computeStreak(streakDays).current;

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <Logo size={34} />
        <span className="sidebar-brand-text">Life OS</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="sidebar-link" title={item.label}>
            <Icon name={item.icon} />
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar" aria-hidden="true">{(settings.name || 'U').charAt(0).toUpperCase()}</div>
        <div className="sidebar-user">
          <span className="sidebar-user-name">{settings.name || 'You'}</span>
          <span className="sidebar-user-streak">
            <Icon name="flame" size={14} /> {streak} day streak
          </span>
        </div>
      </div>
    </aside>
  );
}
