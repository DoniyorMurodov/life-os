import { useState } from 'react';
import { useSync } from '../context/SyncContext';
import Field, { FormError } from './Field';
import Segmented from './Segmented';

/** Email + password sign in / sign up for cloud sync. */
export default function AuthForm({ onSignedIn }) {
  const { signIn, signUp } = useSync();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(cleanEmail, password);
        onSignedIn?.();
      } else {
        const { needsConfirmation } = await signUp(cleanEmail, password);
        if (needsConfirmation) {
          setInfo('Account created. Open the confirmation email we sent you, then come back and sign in.');
          setMode('signin');
        } else {
          onSignedIn?.();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Segmented
        label="Account mode"
        options={[{ value: 'signin', label: 'Sign in' }, { value: 'signup', label: 'Create account' }]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError('');
        }}
      />
      <Field label="Email">
        <input className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Password" hint={mode === 'signup' ? 'At least 8 characters.' : undefined}>
        <input
          className="input"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <FormError message={error} />
      {info && <p className="small notice notice-info" role="status">{info}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
    </form>
  );
}
