import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useFocusTimer } from '../context/FocusContext';
import { useToast } from '../components/Toast';
import Header from '../components/Header';
import Modal from '../components/Modal';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import Field, { FormActions, FormError } from '../components/Field';
import Icon from '../components/Icon';
import { SUBJECT_COLORS } from '../data/defaultData';
import { formatDuration, formatShortDate, todayKey } from '../utils/date';
import { getSubjectStats, sumMinutes, weekRange } from '../utils/calculations';

function SubjectForm({ initial, onSubmit, onCancel, onDelete }) {
  const [name, setName] = useState(initial.name || '');
  const [target, setTarget] = useState(String((initial.weeklyTarget || 300) / 60));
  const [color, setColor] = useState(initial.color || SUBJECT_COLORS[0]);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const hours = Number(target);
    if (!name.trim()) return setError('Please enter a subject name.');
    if (!Number.isFinite(hours) || hours <= 0 || hours > 100) return setError('Weekly target must be between 0.5 and 100 hours.');
    onSubmit({ name: name.trim(), weeklyTarget: Math.round(hours * 60), color });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Subject name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics" maxLength={60} />
      </Field>
      <Field label="Weekly target (hours)">
        <input className="input" type="number" inputMode="decimal" min="0.5" max="100" step="0.5" value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <fieldset className="field">
        <legend className="field-label">Color</legend>
        <div className="color-picker">
          {SUBJECT_COLORS.map((c) => (
            <button key={c} type="button" className="color-swatch" style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} />
          ))}
        </div>
      </fieldset>
      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel={initial.id ? 'Save' : 'Add subject'}>
        {onDelete && <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>Delete</button>}
      </FormActions>
    </form>
  );
}

function LogForm({ subjects, defaultSubject, onSubmit, onCancel }) {
  const [subjectId, setSubjectId] = useState(defaultSubject || subjects[0]?.id || '');
  const [minutes, setMinutes] = useState('30');
  const [date, setDate] = useState(todayKey());
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const m = Number(minutes);
    if (!subjectId) return setError('Choose a subject.');
    if (!Number.isInteger(m) || m < 1 || m > 720) return setError('Minutes must be a whole number between 1 and 720.');
    if (!date || date > todayKey()) return setError('Date cannot be in the future.');
    onSubmit({ subjectId, minutes: m, date, source: 'manual' });
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Subject">
        <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <div className="form-row">
        <Field label="Minutes">
          <input className="input" type="number" inputMode="numeric" min="1" max="720" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="Date">
          <input className="input" type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <FormError message={error} />
      <FormActions onCancel={onCancel} submitLabel="Log time" />
    </form>
  );
}

export default function Study() {
  const { subjects, subjectActions, studySessions, studyActions } = useApp();
  const { timer, setSubject, switchMode } = useFocusTimer();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null);
  const [logging, setLogging] = useState(null);

  const stats = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, getSubjectStats(s, studySessions)])),
    [subjects, studySessions],
  );
  const { from, to } = weekRange();
  const weekTotal = sumMinutes(studySessions, (s) => s.date >= from && s.date <= to);
  const recent = useMemo(
    () => [...studySessions].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 8),
    [studySessions],
  );
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || 'Deleted subject';

  const startSession = (subject) => {
    if (timer.status === 'idle') {
      setSubject(subject.id);
      if (timer.mode !== 'work') switchMode('work');
    }
    navigate('/focus');
  };

  const saveSubject = (data) => {
    if (editing.id) subjectActions.update(editing.id, data);
    else subjectActions.add(data);
    toast(editing.id ? 'Subject updated' : 'Subject added');
    setEditing(null);
  };

  const deleteSubject = () => {
    const subject = editing;
    subjectActions.remove(subject.id);
    setEditing(null);
    toast(`${subject.name} removed`, { action: { label: 'Undo', onClick: () => subjectActions.restore(subject) } });
  };

  return (
    <>
      <Header title="Study" subtitle={`This week: ${formatDuration(weekTotal)}`}>
        <button type="button" className="btn btn-ghost" onClick={() => setLogging({})} disabled={!subjects.length}>
          <Icon name="clock" size={18} /> Log time
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon name="plus" size={18} /> Subject
        </button>
      </Header>

      {subjects.length ? (
        <div className="card-grid">
          {subjects.map((s) => {
            const st = stats[s.id];
            return (
              <article key={s.id} className="card subject-card" style={{ '--subject': s.color }}>
                <div className="card-head">
                  <h2 className="card-title">
                    <span className="color-dot" style={{ background: s.color }} aria-hidden="true" /> {s.name}
                  </h2>
                  <button type="button" className="icon-btn" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}>
                    <Icon name="edit" size={18} />
                  </button>
                </div>
                <dl className="subject-stats">
                  <div><dt>Today</dt><dd>{formatDuration(st.today)}</dd></div>
                  <div><dt>This week</dt><dd>{formatDuration(st.week)}</dd></div>
                  <div><dt>Total</dt><dd>{formatDuration(st.total)}</dd></div>
                </dl>
                <div className="mini-progress-head">
                  <span className="muted small">Weekly goal {formatDuration(st.target)}</span>
                  <span className="small strong">{st.percent}%</span>
                </div>
                <ProgressBar value={st.percent} color={s.color} label={`${s.name} weekly progress`} />
                <div className="subject-actions">
                  <button type="button" className="btn btn-soft" onClick={() => startSession(s)}>
                    <Icon name="play" size={16} /> Start Study Session
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setLogging({ subjectId: s.id })}>
                    Log
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="book" title="No subjects yet" description="Add the subjects you want to track." action={<button type="button" className="btn btn-primary" onClick={() => setEditing({})}>Add subject</button>} />
      )}

      <section className="card list-gap">
        <div className="card-head"><h2 className="card-title">Recent sessions</h2></div>
        {recent.length ? (
          <ul className="simple-list">
            {recent.map((r) => (
              <li key={r.id} className="simple-row">
                <span className="simple-row-main">{subjectName(r.subjectId)}</span>
                <span className="muted small">{formatShortDate(r.date)} · {r.source === 'focus' ? 'Focus timer' : 'Manual'}</span>
                <span className="strong">{formatDuration(r.minutes)}</span>
                <button type="button" className="icon-btn icon-btn-sm danger" aria-label="Delete session" onClick={() => studyActions.remove(r.id)}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon="clock" title="No study sessions yet" description="Start a focus session or log time manually." />
        )}
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit subject' : 'New subject'} size="sm">
        {editing && <SubjectForm initial={editing} onSubmit={saveSubject} onCancel={() => setEditing(null)} onDelete={editing.id ? deleteSubject : undefined} />}
      </Modal>

      <Modal open={!!logging} onClose={() => setLogging(null)} title="Log study time" size="sm">
        {logging && (
          <LogForm
            subjects={subjects}
            defaultSubject={logging.subjectId}
            onCancel={() => setLogging(null)}
            onSubmit={(data) => {
              studyActions.add(data);
              toast(`Logged ${formatDuration(data.minutes)}`);
              setLogging(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
