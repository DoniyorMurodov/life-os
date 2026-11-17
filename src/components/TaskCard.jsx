import { memo } from 'react';
import { relativeDay, todayKey } from '../utils/date';
import Icon from './Icon';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };

function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const overdue = !task.completed && task.deadline && task.deadline < todayKey();

  return (
    <div className={`task-card ${task.completed ? 'is-done' : ''}`}>
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'not done' : 'done'}`}
        onClick={() => onToggle(task.id)}
      >
        <Icon name="check" size={14} strokeWidth={3} />
      </button>

      <div className="task-body">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className={`badge priority-${task.priority}`}>{PRIORITY_LABEL[task.priority] || 'Medium'}</span>
          <span className="badge">{task.category}</span>
          {task.deadline && (
            <span className={`meta-date ${overdue ? 'is-overdue' : ''}`}>
              <Icon name="calendar" size={13} />
              {relativeDay(task.deadline)}
            </span>
          )}
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="row-actions">
          {onEdit && (
            <button type="button" className="icon-btn" aria-label={`Edit "${task.title}"`} onClick={() => onEdit(task)}>
              <Icon name="edit" size={18} />
            </button>
          )}
          {onDelete && (
            <button type="button" className="icon-btn danger" aria-label={`Delete "${task.title}"`} onClick={() => onDelete(task)}>
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TaskCard);
