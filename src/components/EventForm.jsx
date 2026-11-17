import { useState } from 'react';
import { EVENT_CATEGORIES } from '../data/defaultData';
import { WEEKDAY_ORDER, WEEKDAY_SHORT } from '../utils/date';
import Field, { FormActions, FormError } from './Field';

export default function EventForm({ initial, defaultDay, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState(() => ({
    title: '',
    start: '09:00',
    end: '10:00',
    category: 'Study',
    days: [defaultDay ?? new Date().getDay()],
    ...initial,
  }));
  const [error, setError] = useState('');
  const set = (key) => (e) => {
    setError('');
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const toggleDay = (day) =>
    setForm((f) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day] }));

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return setError('Please enter a title.');
    if (!form.start) return setError('Please choose a start time.');
    if (form.end && form.end <= form.start) return setError('End time must be after start time.');
    if (!form.days.length) return setError('Choose at least one day.');
    onSubmit({ title, start: form.start, end: form.end || '', category: form.category, days: [...form.days].sort() });
  };

  return (
    <form onSubmit={submit} className="form" noValidate>
      <Field label="Title">
        <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Math lesson" maxLength={120} autoComplete="off" />
      </Field>

      <div className="form-row">
        <Field label="Start">
          <input type="time" className="input" value={form.start} onChange={set('start')} />
        </Field>
        <Field label="End">
          <input type="time" className="input" value={form.end} onChange={set('end')} />
        </Field>
      </div>

      <Field label="Category">
        <select className="input" value={form.category} onChange={set('category')}>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <fieldset className="field">
        <legend className="field-label">Repeat on</legend>
        <div className="day-picker">
          {WEEKDAY_ORDER.map((d) => (
            <button key={d} type="button" className="day-chip" aria-pressed={form.days.includes(d)} onClick={() => toggleDay(d)}>
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel={initial?.id ? 'Save changes' : 'Add event'}>
        {onDelete && (
          <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
            Delete
          </button>
        )}
      </FormActions>
    </form>
  );
}
