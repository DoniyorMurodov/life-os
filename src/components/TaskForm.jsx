import { useState } from 'react';
import { PRIORITIES, TASK_CATEGORIES } from '../data/defaultData';
import { todayKey } from '../utils/date';
import Field, { FormActions, FormError } from './Field';
import Segmented from './Segmented';

export default function TaskForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: '',
    priority: 'medium',
    category: 'Study',
    deadline: todayKey(),
    ...initial,
  }));
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return setError('Please enter a task title.');
    if (title.length > 200) return setError('Title is too long (max 200 characters).');
    onSubmit({ title, priority: form.priority, category: form.category, deadline: form.deadline || '' });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <Field label="Title">
        <input
          className="input"
          value={form.title}
          onChange={(e) => {
            setError('');
            set('title')(e);
          }}
          placeholder="e.g. Finish IELTS writing task 2"
          maxLength={200}
          aria-invalid={!!error}
          autoComplete="off"
        />
      </Field>
      <FormError message={error} />

      <div className="field">
        <span className="field-label">Priority</span>
        <Segmented label="Priority" options={PRIORITIES} value={form.priority} onChange={set('priority')} />
      </div>

      <div className="form-row">
        <Field label="Category">
          <select className="input" value={form.category} onChange={set('category')}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Deadline">
          <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
        </Field>
      </div>

      <FormActions onCancel={onCancel} submitLabel={initial?.id ? 'Save changes' : 'Add task'} />
    </form>
  );
}
