import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase, syncConfigured } from '../services/supabase';
import { clearSyncState, loadSyncState, runSync } from '../services/syncEngine';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const SyncContext = createContext(null);
const DEBOUNCE_MS = 2500;
const POLL_MS = 60000;

const AUTH_MESSAGES = {
  'Invalid login credentials': 'Wrong email or password.',
  'Email not confirmed': 'Please confirm your email first (check your inbox), then sign in.',
  'User already registered': 'An account with this email already exists — sign in instead.',
  'Failed to fetch': 'Cannot reach the server — check your internet connection.',
};

/**
 * Cloud sync: Supabase auth + automatic background sync.
 * Sync runs on sign-in, ~2.5 s after any local change, when the app comes back to the
 * foreground, when the device goes online, and every minute while open.
 */
export function SyncProvider({ children }) {
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!syncConfigured);
  const [status, setStatus] = useState('idle'); // idle | syncing | error | offline
  const [error, setError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState(() => loadSyncState()?.lastSyncAt || null);
  const [needsChoice, setNeedsChoice] = useState(false);
  const running = useRef(false);
  const queued = useRef(false);
  const syncRef = useRef(null);
  const choicePaused = useRef(false); // user closed the choice dialog: no auto-sync until they decide

  useEffect(() => {
    if (!syncConfigured) return undefined;
    let unsubscribe = () => {};
    let alive = true;
    getSupabase()
      .then(async (sb) => {
        if (!alive || !sb) return;
        setClient(sb);
        const { data } = await sb.auth.getSession();
        if (alive) setUser(data.session?.user ?? null);
        const { data: sub } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
        unsubscribe = () => sub.subscription.unsubscribe();
      })
      .catch((err) => console.warn('[Life OS] Supabase failed to load', err))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(
    async (options = {}) => {
      if (!client || !user) return null;
      if (options.auto && choicePaused.current) return null;
      if (!options.auto) choicePaused.current = false;
      if (!navigator.onLine) {
        setStatus('offline');
        return null;
      }
      if (running.current) {
        queued.current = true;
        return null;
      }
      running.current = true;
      setStatus('syncing');
      try {
        const result = await runSync(client, user.id, options);
        if (result.status === 'needs_choice') {
          setNeedsChoice(true);
        } else {
          setNeedsChoice(false);
          const at = new Date().toISOString();
          setLastSyncAt(at);
          const state = loadSyncState();
          if (state) localStorage.setItem('lifeos:sync', JSON.stringify({ ...state, lastSyncAt: at }));
        }
        setError('');
        setStatus('idle');
        return result;
      } catch (err) {
        console.warn('[Life OS] sync failed', err);
        setError(err?.message || 'Sync failed');
        setStatus('error');
        return null;
      } finally {
        running.current = false;
        if (queued.current) {
          queued.current = false;
          setTimeout(() => syncRef.current?.({ auto: true }), 0);
        }
      }
    },
    [client, user],
  );

  useEffect(() => {
    syncRef.current = syncNow;
  }, [syncNow]);

  // Automatic triggers
  useEffect(() => {
    if (!client || !user) return undefined;
    syncNow({ auto: true });
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => syncRef.current?.({ auto: true }), DEBOUNCE_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncRef.current?.({ auto: true });
      else if (timer) {
        clearTimeout(timer);
        syncRef.current?.({ auto: true }); // flush pending changes before the app is backgrounded
      }
    };
    const onOnline = () => syncRef.current?.({ auto: true });
    const poll = setInterval(() => document.visibilityState === 'visible' && syncRef.current?.({ auto: true }), POLL_MS);
    window.addEventListener('lifeos:local-change', schedule);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener('lifeos:local-change', schedule);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
    // syncNow identity changes with client/user only
  }, [client, user, syncNow]);

  const authError = (err) => AUTH_MESSAGES[err?.message] || err?.message || 'Something went wrong';

  const signIn = useCallback(
    async (email, password) => {
      const { error: err } = await client.auth.signInWithPassword({ email, password });
      if (err) throw new Error(authError(err));
    },
    [client],
  );

  const signUp = useCallback(
    async (email, password) => {
      const { data, error: err } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
      });
      if (err) throw new Error(authError(err));
      return { needsConfirmation: !data.session };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    clearSyncState();
    setLastSyncAt(null);
    setNeedsChoice(false);
    toast('Signed out. Your data stays on this device.', { type: 'info' });
  }, [client, toast]);

  const resolveChoice = useCallback(
    async (mode) => {
      setNeedsChoice(false);
      const result = await syncNow({ firstLinkMode: mode });
      if (result?.status === 'synced') {
        toast(mode === 'cloud' ? 'Cloud data restored on this device' : 'Data merged and synced');
      }
    },
    [syncNow, toast],
  );

  const value = useMemo(
    () => ({
      configured: syncConfigured,
      ready,
      user,
      status,
      error,
      lastSyncAt,
      syncNow,
      signIn,
      signUp,
      signOut,
      resolveChoice,
    }),
    [ready, user, status, error, lastSyncAt, syncNow, signIn, signUp, signOut, resolveChoice],
  );

  return (
    <SyncContext.Provider value={value}>
      {children}
      <Modal open={needsChoice} onClose={() => { choicePaused.current = true; setNeedsChoice(false); }} title="Your account already has data" size="sm">
        <p className="muted">
          This device also has data. Choose what to do — you only need to do this once per device.
        </p>
        <div className="stack list-gap">
          <button type="button" className="btn btn-primary btn-block" onClick={() => resolveChoice('cloud')}>
            Use cloud data (recommended)
          </button>
          <p className="muted small">Replaces this device's data with the data from your account.</p>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => resolveChoice('merge')}>
            Merge both
          </button>
          <p className="muted small">Keeps everything from both. Example tasks on a new device would be added too.</p>
        </div>
      </Modal>
    </SyncContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
