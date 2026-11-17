import { useEffect, useState } from 'react';
import { useSync } from '../context/SyncContext';
import AuthForm from '../components/AuthForm';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import { buildGoal, ONBOARDING_GOALS } from '../data/defaultData';
import { createId } from '../utils/storage';

export default function Onboarding() {
  const { settings, updateSettings, goalActions, taskActions, scheduleActions, noteActions } = useApp();
  const { configured, user, lastSyncAt } = useSync();
  const [restoring, setRestoring] = useState(false);
  const [name, setName] = useState(settings.name || '');
  const [selected, setSelected] = useState(['IELTS', 'SAT', 'Programming']);
  const [examples, setExamples] = useState(true);
  const [error, setError] = useState('');

  const toggle = (goal) =>
    setSelected((list) => (list.includes(goal) ? list.filter((g) => g !== goal) : [...list, goal]));

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Please enter your name.');
    goalActions.replaceAll(selected.map((key) => buildGoal(key, createId())));
    if (!examples) {
      taskActions.replaceAll([]);
      scheduleActions.replaceAll([]);
      noteActions.replaceAll([]);
    }
    updateSettings({ name: trimmed.slice(0, 40), onboarded: true, onboardedAt: new Date().toISOString() });
  };

  // Restore on a new device: once signed in, the first sync replaces this device's example data
  // with the cloud data (a device that hasn't finished onboarding counts as empty). Then skip onboarding.
  useEffect(() => {
    if (restoring && user && lastSyncAt) updateSettings({ onboarded: true, onboardedAt: new Date().toISOString() });
  }, [restoring, user, lastSyncAt, updateSettings]);

  return (
    <div className="onboarding">
      <form className="onboarding-card card" onSubmit={submit} noValidate>
        <Logo size={56} />
        <h1 className="onboarding-title">Welcome to Life OS</h1>
        <p className="muted">Your day, study, goals and money — in one calm place.</p>

        <label className="field">
          <span className="field-label">What's your name?</span>
          <input
            className="input input-lg"
            value={name}
            onChange={(e) => { setError(''); setName(e.target.value); }}
            placeholder="Doniyor"
            maxLength={40}
            autoComplete="given-name"
            aria-invalid={!!error}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}

        <fieldset className="field">
          <legend className="field-label">What are your main goals?</legend>
          <div className="goal-options">
            {ONBOARDING_GOALS.map((goal) => (
              <label key={goal} className={`goal-option ${selected.includes(goal) ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={selected.includes(goal)} onChange={() => toggle(goal)} />
                <span className="goal-option-box" aria-hidden="true"><Icon name="check" size={14} strokeWidth={3} /></span>
                <span>{goal}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="toggle-line">
          <input type="checkbox" checked={examples} onChange={(e) => setExamples(e.target.checked)} />
          <span>Start with example tasks & schedule (you can edit or delete them)</span>
        </label>

        <button type="submit" className="btn btn-primary btn-block btn-lg">
          Continue <Icon name="chevronRight" size={18} />
        </button>

        {configured && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setRestoring(true)}>
            Already have an account? Restore from cloud
          </button>
        )}
      </form>

      <Modal open={restoring} onClose={() => setRestoring(false)} title="Restore from cloud" size="sm">
        <p className="muted small list-gap-sm" style={{ marginBottom: 16 }}>
          Sign in with the account you use on your other device. Your data will download automatically.
        </p>
        {user ? <p className="muted" role="status">Signed in — downloading your data…</p> : <AuthForm />}
      </Modal>
    </div>
  );
}
