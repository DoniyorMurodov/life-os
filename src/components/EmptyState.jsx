import Icon from './Icon';

export default function EmptyState({ icon = 'sparkles', title, description, action, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'is-compact' : ''}`}>
      <span className="empty-icon"><Icon name={icon} size={compact ? 20 : 26} /></span>
      <p className="empty-title">{title}</p>
      {description && <p className="empty-description">{description}</p>}
      {action}
    </div>
  );
}
