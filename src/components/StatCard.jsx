import { memo } from 'react';
import Icon from './Icon';

function StatCard({ icon, label, value, hint, tone = 'blue' }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="stat-text">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {hint && <span className="stat-hint">{hint}</span>}
      </div>
    </div>
  );
}

export default memo(StatCard);
