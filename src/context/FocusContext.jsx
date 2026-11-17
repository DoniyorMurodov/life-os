import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { normalizeObject } from '../utils/storage';
import { formatClock, toDateKey } from '../utils/date';
import { useApp } from './AppContext';
import { useToast } from '../components/Toast';
import { cancelPush, schedulePush } from '../services/push';

const FocusContext = createContext(null);

const DEFAULT_TIMER = {
  mode: 'work', // 'work' | 'break'
  status: 'idle', // 'idle' | 'running' | 'paused'
  endsAt: null, // timestamp while running
  remaining: 25 * 60, // seconds while idle / paused
  preset: '25/5',
  work: 25,
  brk: 5,
  subjectId: '',
  pushFor: null, // endsAt the background push was scheduled for
  pushId: null, // QStash message id (to cancel it)
};

const normalizeTimer = (value) => {
  const obj = normalizeObject(value);
  return obj ? { ...DEFAULT_TIMER, ...obj } : undefined;
};

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.25 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.25);
      osc.stop(ctx.currentTime + i * 0.25 + 0.45);
    });
  } catch {
    /* audio not available */
  }
}

async function systemNotify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag: 'lifeos-focus' });
    else new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

/**
 * Pomodoro timer that keeps running while you navigate between pages
 * and survives refresh (it stores the end timestamp, not a countdown).
 */
export function FocusProvider({ children }) {
  const { settings, focusActions, studyActions, subjects } = useApp();
  const toast = useToast();
  const [timer, setTimer] = useLocalStorage('timer', DEFAULT_TIMER, normalizeTimer);
  const [now, setNow] = useState(() => Date.now());
  const completing = useRef(null);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.status]);

  const secondsLeft =
    timer.status === 'running' ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : timer.remaining;
  const totalSeconds = (timer.mode === 'work' ? timer.work : timer.brk) * 60;

  const finish = useCallback(() => {
    if (completing.current === timer.endsAt) return;
    completing.current = timer.endsAt;
    const date = toDateKey(timer.endsAt);

    if (timer.mode === 'work') {
      const subject = subjects.find((s) => s.id === timer.subjectId);
      focusActions.add({ minutes: timer.work, date, subjectId: subject?.id || '', type: 'focus' });
      if (subject) studyActions.add({ subjectId: subject.id, minutes: timer.work, date, source: 'focus' });
      const message = `Focus session complete — ${timer.work} min${subject ? ` of ${subject.name}` : ''}. Take a break!`;
      toast(message);
      if (settings.notifications) systemNotify('Focus session complete', message);
      setTimer((t) => ({ ...t, mode: 'break', status: 'idle', endsAt: null, remaining: t.brk * 60 }));
    } else {
      toast('Break is over — ready for the next session?', { type: 'info' });
      if (settings.notifications) systemNotify('Break is over', 'Ready for the next focus session?');
      setTimer((t) => ({ ...t, mode: 'work', status: 'idle', endsAt: null, remaining: t.work * 60 }));
    }
    if (settings.notifications) playChime();
  }, [timer, subjects, focusActions, studyActions, toast, settings.notifications, setTimer]);

  useEffect(() => {
    if (timer.status === 'running' && timer.endsAt <= now) finish();
  }, [timer.status, timer.endsAt, now, finish]);

  // Background notification: schedule a server push for the moment this phase ends,
  // and cancel it whenever the timer is paused, reset, switched or finished in-app.
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const accessCode = settings.aiAccessCode;
  useEffect(() => {
    const wantsPush = settings.notifications && timer.status === 'running' && timer.endsAt > Date.now();
    const stale = timer.pushFor && (!wantsPush || timer.pushFor !== timer.endsAt);

    if (stale) {
      if (timer.pushId) cancelPush(timer.pushId, accessCode);
      setTimer((t) => ({ ...t, pushId: null, pushFor: null }));
      return;
    }
    if (!wantsPush || timer.pushFor) return;

    const endsAt = timer.endsAt;
    const isWork = timer.mode === 'work';
    setTimer((t) => ({ ...t, pushFor: endsAt, pushId: null }));
    schedulePush({
      fireAt: endsAt,
      title: isWork ? 'Focus session complete' : 'Break is over',
      body: isWork ? `${timer.work} min done — take a ${timer.brk} min break.` : 'Ready for the next focus session?',
      accessCode,
    }).then((id) => {
      if (!id) return;
      const current = timerRef.current;
      if (current.status === 'running' && current.endsAt === endsAt) setTimer((t) => ({ ...t, pushId: id }));
      else cancelPush(id, accessCode);
    });
  }, [timer.status, timer.endsAt, timer.pushFor, timer.pushId, timer.mode, timer.work, timer.brk, settings.notifications, accessCode, setTimer]);

  useEffect(() => {
    document.title = timer.status === 'running' ? `${formatClock(secondsLeft)} · ${timer.mode === 'work' ? 'Focus' : 'Break'}` : 'Life OS';
  }, [timer.status, timer.mode, secondsLeft]);

  const actions = useMemo(
    () => ({
      start() {
        const t = Date.now();
        setNow(t);
        setTimer((s) => ({ ...s, status: 'running', endsAt: t + s.remaining * 1000 }));
      },
      pause() {
        setTimer((s) =>
          s.status === 'running'
            ? { ...s, status: 'paused', remaining: Math.max(1, Math.ceil((s.endsAt - Date.now()) / 1000)), endsAt: null }
            : s,
        );
      },
      reset() {
        setTimer((s) => ({ ...s, status: 'idle', endsAt: null, remaining: (s.mode === 'work' ? s.work : s.brk) * 60 }));
      },
      switchMode(mode) {
        setTimer((s) => ({ ...s, mode, status: 'idle', endsAt: null, remaining: (mode === 'work' ? s.work : s.brk) * 60 }));
      },
      setDurations(preset, work, brk) {
        setTimer((s) => ({
          ...s,
          preset,
          work,
          brk,
          status: 'idle',
          endsAt: null,
          remaining: (s.mode === 'work' ? work : brk) * 60,
        }));
      },
      setSubject(subjectId) {
        setTimer((s) => ({ ...s, subjectId }));
      },
    }),
    [setTimer],
  );

  const value = useMemo(
    () => ({ timer, secondsLeft, totalSeconds, ...actions }),
    [timer, secondsLeft, totalSeconds, actions],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFocusTimer() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocusTimer must be used inside <FocusProvider>');
  return ctx;
}
