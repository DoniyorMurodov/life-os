import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useCollection, useLocalStorage } from '../hooks/useLocalStorage';
import { normalizeObject } from '../utils/storage';
import { toDateKey, todayKey } from '../utils/date';
import {
  DEFAULT_SCHEDULE,
  DEFAULT_SETTINGS,
  DEFAULT_SUBJECTS,
  getDefaultGoals,
  getExampleNotes,
  getExampleTasks,
} from '../data/defaultData';

const AppContext = createContext(null);

const normalizeSettings = (value) => {
  const obj = normalizeObject(value);
  if (!obj) return undefined;
  const merged = { ...DEFAULT_SETTINGS, ...obj };
  // Older installs have no onboardedAt — start the backup-reminder clock now.
  if (merged.onboarded && !merged.onboardedAt) merged.onboardedAt = new Date().toISOString();
  return merged;
};

const normalizeStreak = (value) => {
  const obj = normalizeObject(value);
  if (!obj || !Array.isArray(obj.days)) return undefined;
  return { days: obj.days.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) };
};

/**
 * Single source of truth for all user data. Each collection is persisted
 * independently, so Home / Statistics update instantly when any module changes.
 */
export function AppProvider({ children }) {
  const [settings, setSettings] = useLocalStorage('settings', DEFAULT_SETTINGS, normalizeSettings);
  const [tasks, taskActions] = useCollection('tasks', getExampleTasks);
  const [schedule, scheduleActions] = useCollection('schedule', DEFAULT_SCHEDULE);
  const [subjects, subjectActions] = useCollection('subjects', DEFAULT_SUBJECTS);
  const [studySessions, studyActions] = useCollection('studySessions', []);
  const [focusSessions, focusActions] = useCollection('focusSessions', []);
  const [transactions, transactionActions] = useCollection('expenses', []);
  const [notes, noteActions] = useCollection('notes', getExampleNotes);
  const [goals, goalActions] = useCollection('goals', getDefaultGoals);
  const [streak, setStreak] = useLocalStorage('streak', { days: [] }, normalizeStreak);

  const updateSettings = useCallback((patch) => setSettings((prev) => ({ ...prev, ...patch })), [setSettings]);

  const toggleTask = useCallback(
    (id) =>
      taskActions.update(id, (task) => ({
        completed: !task.completed,
        completedAt: task.completed ? null : new Date().toISOString(),
      })),
    [taskActions],
  );

  // Streak history: keep past active days even if tasks are deleted later;
  // today's status always mirrors the current task list.
  useEffect(() => {
    const today = todayKey();
    const fromTasks = new Set(
      tasks.filter((t) => t.completed && t.completedAt).map((t) => toDateKey(t.completedAt)),
    );
    setStreak((prev) => {
      const days = new Set(prev.days.filter((d) => d !== today));
      fromTasks.forEach((d) => days.add(d));
      const next = [...days].sort();
      const same = next.length === prev.days.length && next.every((d, i) => d === prev.days[i]);
      return same ? prev : { days: next };
    });
  }, [tasks, setStreak]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      tasks,
      taskActions,
      toggleTask,
      schedule,
      scheduleActions,
      subjects,
      subjectActions,
      studySessions,
      studyActions,
      focusSessions,
      focusActions,
      transactions,
      transactionActions,
      notes,
      noteActions,
      goals,
      goalActions,
      streakDays: streak.days,
    }),
    [
      settings, updateSettings, tasks, taskActions, toggleTask, schedule, scheduleActions,
      subjects, subjectActions, studySessions, studyActions, focusSessions, focusActions,
      transactions, transactionActions, notes, noteActions, goals, goalActions, streak.days,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
