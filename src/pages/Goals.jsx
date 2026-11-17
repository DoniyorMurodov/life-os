import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import Field, { FormActions, FormError } from '../components/Field';
import Icon from '../components/Icon';
import { GOAL_CATEGORIES } from '../data/defaultData';
import { daysUntil, formatShortDate } from '../utils/date';
import { averageGoalProgress, clamp } from '../utils/calculations';

function GoalForm({ initial, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState(() => ({ title: '', description: '', deadline: '', category: 'Education', progress: 0, ...initial }));
  const [error, setError] = useState('');
  const set = (key) => (e) => {
    setError('');
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const submit = (e) => {
    e.preventDefault();
    const progress = Number(form.progress);
    if (!form.title.trim()) return setError('Please enter a goal title.');
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return setError('Progress must be between 0 and 100.');
    onSubmit({ title: form.title.trim(), description: form.description.trim(), deadline: form.deadline, category: form.category, progress: Math.round(progress) });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Goal">
        <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. IELTS 7.5" maxLength={100} />
      </Field>
      <Field label="Description">
        <textarea className="input textarea" rows={3} value={form.description} onChange={set('description')} placeholder="Why does this matter? What's the plan?" />
      </Field>
      <div className="form-row">
        <Field label="Category">
          <select className="input" value={form.category} onChange={set('category')}>
            {GOAL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Deadline">
          <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
        </Field>
      </div>
      <Field label={`Progress: ${form.progress}%`}>
        <input className="range" type="range" min="0" max="100" step="5" value={form.progress} onChange={set('progress')} />
      </Field>
      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel={initial.id ? 'Save' : 'Add goal'}>
        {onDelete && <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>Delete</button>}
      </FormActions>
    </form>
  );
}

function deadlineLabel(deadline) {
  if (!deadline) return 'No deadline';
  const n = daysUntil(deadline);
  if (n < 0) return `Overdue · ${formatShortDate(deadline)}`;
  if (n === 0) return 'Due today';
  return `${n} days left · ${formatShortDate(deadline)}`;
}

export default function Goals() {
  const { goals, goalActions } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(null);

  const setProgress = (goal, value) => {
    const progress = clamp(Math.round(value), 0, 100);
    goalActions.update(goal.id, { progress });
    if (progress === 100 && goal.progress !== 100) toast(`🎉 Goal achieved: ${goal.title}`);
  };

  const submit = (data) => {
    if (editing.id) goalActions.update(editing.id, data);
    else goalActions.add(data);
    toast(editing.id ? 'Goal updated' : 'Goal added');
    setEditing(null);
  };

  const remove = () => {
    const goal = editing;
    goalActions.remove(goal.id);
    setEditing(null);
    toast('Goal deleted', { action: { label: 'Undo', onClick: () => goalActions.restore(goal) } });
  };

  return (
    <>
      <Header title="Goals" subtitle={goals.length ? `Average progress ${averageGoalProgress(goals)}%` : 'Your big picture'}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> New goal
        </button>
      </Header>

      {goals.length ? (
        <div className="card-grid">
          {goals.map((g) => (
            <article key={g.id} className={`card goal-card ${g.progress >= 100 ? 'is-complete' : ''}`}>
              <div className="card-head">
                <span className="badge">{g.category}</span>
                <button type="button" className="icon-btn" aria-label={`Edit ${g.title}`} onClick={() => setEditing(g)}>
                  <Icon name="edit" size={18} />
                </button>
              </div>
              <h2 className="goal-title">{g.title}</h2>
              {g.description && <p className="muted small goal-desc">{g.description}</p>}
              <p className={`small goal-deadline ${g.deadline && daysUntil(g.deadline) < 0 && g.progress < 100 ? 'is-overdue' : ''}`}>
                <Icon name="calendar" size={14} /> {deadlineLabel(g.deadline)}
              </p>
              <div className="mini-progress-head">
                <span className="muted small">Progress</span>
                <span className="goal-percent">{g.progress}%</span>
              </div>
              <ProgressBar value={g.progress} label={`${g.title} progress`} />
              <div className="goal-controls">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProgress(g, g.progress - 10)} disabled={g.progress <= 0} aria-label={`Decrease ${g.title} progress by 10%`}>−10</button>
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={g.progress}
                  onChange={(e) => setProgress(g, Number(e.target.value))}
                  aria-label={`${g.title} progress`}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProgress(g, g.progress + 10)} disabled={g.progress >= 100} aria-label={`Increase ${g.title} progress by 10%`}>+10</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="target"
          title="Set your first goal"
          description="Big goals like IELTS 7.5 or SAT 1500+ — track them here."
          action={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus" size={18} /> Add goal</button>}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit goal' : 'New goal'}>
        {editing && <GoalForm initial={editing} onSubmit={submit} onCancel={() => setEditing(null)} onDelete={editing.id ? remove : undefined} />}
      </Modal>
    </>
  );
}
