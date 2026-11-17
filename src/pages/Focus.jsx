import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useFocusTimer } from '../context/FocusContext';
import { FOCUS_PRESETS } from '../data/defaultData';
import Header from '../components/Header';
import Segmented from '../components/Segmented';
import StatCard from '../components/StatCard';
import Field, { FormError } from '../components/Field';
import Icon from '../components/Icon';
import { formatClock, formatDuration, formatShortDate, todayKey } from '../utils/date';
import { sumMinutes } from '../utils/calculations';

const RADIUS = 110;
const CIRC = 2 * Math.PI * RADIUS;

function CustomDurations({ timer, onApply }) {
  const [work, setWork] = useState(String(timer.work));
  const [brk, setBrk] = useState(String(timer.brk));
  const [error, setError] = useState('');

  const apply = (e) => {
    e.preventDefault();
    const w = Number(work);
    const b = Number(brk);
    if (!Number.isInteger(w) || w < 1 || w > 180) return setError('Focus must be 1–180 minutes.');
    if (!Number.isInteger(b) || b < 1 || b > 60) return setError('Break must be 1–60 minutes.');
    setError('');
    onApply(w, b);
  };

  return (
    <form className="custom-durations" onSubmit={apply} noValidate>
      <Field label="Focus (min)">
        <input className="input" type="number" inputMode="numeric" min="1" max="180" value={work} onChange={(e) => setWork(e.target.value)} />
      </Field>
      <Field label="Break (min)">
        <input className="input" type="number" inputMode="numeric" min="1" max="60" value={brk} onChange={(e) => setBrk(e.target.value)} />
      </Field>
      <button type="submit" className="btn btn-soft">Apply</button>
      <FormError message={error} />
    </form>
  );
}

export default function Focus() {
  const { subjects, focusSessions } = useApp();
  const { timer, secondsLeft, totalSeconds, start, pause, reset, switchMode, setDurations, setSubject } = useFocusTimer();
  const [customOpen, setCustomOpen] = useState(timer.preset === 'Custom');

  const running = timer.status === 'running';
  const locked = timer.status !== 'idle';
  const progress = totalSeconds ? 1 - secondsLeft / totalSeconds : 0;
  const today = todayKey();

  const todaySessions = useMemo(() => focusSessions.filter((s) => s.date === today), [focusSessions, today]);
  const recent = useMemo(() => focusSessions.slice(0, 6), [focusSessions]);
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name;

  const choosePreset = (value) => {
    if (value === 'Custom') return setCustomOpen(true);
    setCustomOpen(false);
    setDurations(value, FOCUS_PRESETS[value].work, FOCUS_PRESETS[value].brk);
  };

  return (
    <>
      <Header title="Focus" subtitle="Deep work with the Pomodoro method" />

      <div className="focus-layout">
        <section className={`card focus-card mode-${timer.mode} ${running ? 'is-running' : ''}`} aria-label="Focus timer">
          <Segmented
            label="Timer mode"
            options={[{ value: 'work', label: 'Focus' }, { value: 'break', label: 'Break' }]}
            value={timer.mode}
            onChange={switchMode}
            disabled={locked}
          />

          <div className="timer-ring">
            <svg viewBox="0 0 260 260" aria-hidden="true">
              <circle className="ring-track" cx="130" cy="130" r={RADIUS} />
              <circle
                className="ring-progress"
                cx="130"
                cy="130"
                r={RADIUS}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
              />
            </svg>
            <div className="timer-center">
              <span className="timer-time" role="timer" aria-live="off">{formatClock(secondsLeft)}</span>
              <span className="timer-label">
                {timer.status === 'paused' ? 'Paused' : timer.mode === 'work' ? (running ? 'Stay focused' : 'Focus') : 'Break'}
              </span>
            </div>
          </div>

          <div className="timer-controls">
            <button type="button" className="btn btn-ghost btn-round" onClick={reset} aria-label="Reset timer" disabled={timer.status === 'idle' && secondsLeft === totalSeconds}>
              <Icon name="reset" size={20} />
            </button>
            {running ? (
              <button type="button" className="btn btn-primary btn-xl" onClick={pause}>
                <Icon name="pause" size={22} /> Pause
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-xl" onClick={start}>
                <Icon name="play" size={22} /> {timer.status === 'paused' ? 'Resume' : 'Start'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-round"
              onClick={() => switchMode(timer.mode === 'work' ? 'break' : 'work')}
              aria-label={timer.mode === 'work' ? 'Skip to break' : 'Skip break'}
            >
              <Icon name="skip" size={20} />
            </button>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h2 className="card-title">Session settings</h2>
            <div className="stack list-gap-sm">
              <div className="field">
                <span className="field-label">Preset</span>
                <Segmented
                  label="Timer preset"
                  options={['25/5', '50/10', 'Custom']}
                  value={customOpen ? 'Custom' : timer.preset}
                  onChange={choosePreset}
                  disabled={locked}
                />
              </div>
              {customOpen && !locked && (
                <CustomDurations timer={timer} onApply={(w, b) => setDurations('Custom', w, b)} />
              )}
              <Field label="Studying (optional)" hint="Completed focus time is added to this subject in Study.">
                <select className="input" value={timer.subjectId} onChange={(e) => setSubject(e.target.value)} disabled={locked}>
                  <option value="">No subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </section>

          <div className="stat-grid stat-grid-2">
            <StatCard icon="check" label="Sessions today" value={todaySessions.length} tone="green" />
            <StatCard icon="timer" label="Focus today" value={formatDuration(sumMinutes(todaySessions))} tone="purple" />
          </div>

          <section className="card">
            <h2 className="card-title">Recent sessions</h2>
            {recent.length ? (
              <ul className="simple-list">
                {recent.map((s) => (
                  <li key={s.id} className="simple-row">
                    <span className="simple-row-main">{subjectName(s.subjectId) || 'Focus session'}</span>
                    <span className="muted small">{formatShortDate(s.date)}</span>
                    <span className="strong">{formatDuration(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small list-gap-sm">Completed sessions will appear here.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
