import { addDays, toDateKey, todayKey, getWeekDates, WEEKDAY_SHORT } from './date';

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/* ---------------- tasks ---------------- */

/** A task "belongs" to today if it is due today/overdue, created today without deadline, or completed today. */
export function isTaskForToday(task, today = todayKey()) {
  if (task.completed) return !!task.completedAt && toDateKey(task.completedAt) === today;
  if (task.deadline) return task.deadline <= today;
  return !!task.createdAt && toDateKey(task.createdAt) === today;
}

export function getTodayTaskStats(tasks) {
  const list = tasks.filter((t) => isTaskForToday(t));
  const completed = list.filter((t) => t.completed).length;
  return {
    total: list.length,
    completed,
    percent: list.length ? Math.round((completed / list.length) * 100) : 0,
  };
}

export function compareTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.completed) return (b.completedAt || '').localeCompare(a.completedAt || '');
  const today = todayKey();
  const aDue = a.deadline && a.deadline <= today ? 0 : 1;
  const bDue = b.deadline && b.deadline <= today ? 0 : 1;
  if (aDue !== bDue) return aDue - bDue;
  const p = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  if (p) return p;
  if (a.deadline !== b.deadline) return (a.deadline || '9999').localeCompare(b.deadline || '9999');
  return (a.createdAt || '').localeCompare(b.createdAt || '');
}

export function getTopPriorities(tasks, count = 3) {
  return tasks.filter((t) => !t.completed).sort(compareTasks).slice(0, count);
}

/* ---------------- sessions (study / focus) ---------------- */

export function sumMinutes(sessions, predicate = () => true) {
  return sessions.reduce((sum, s) => (predicate(s) ? sum + (Number(s.minutes) || 0) : sum), 0);
}

export function weekRange(date = new Date()) {
  const days = getWeekDates(date);
  return { from: toDateKey(days[0]), to: toDateKey(days[6]) };
}

export function getSubjectStats(subject, studySessions) {
  const today = todayKey();
  const { from, to } = weekRange();
  const own = studySessions.filter((s) => s.subjectId === subject.id);
  const week = sumMinutes(own, (s) => s.date >= from && s.date <= to);
  const target = Math.max(1, Number(subject.weeklyTarget) || 300);
  return {
    today: sumMinutes(own, (s) => s.date === today),
    week,
    total: sumMinutes(own),
    target,
    percent: clamp(Math.round((week / target) * 100), 0, 100),
  };
}

/* ---------------- streak ---------------- */

/** days: array of YYYY-MM-DD keys with at least one completed task. */
export function computeStreak(days) {
  const set = new Set(days);
  let cursor = new Date();
  if (!set.has(toDateKey(cursor))) cursor = addDays(cursor, -1);
  let current = 0;
  while (set.has(toDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  [...set].sort().forEach((key) => {
    const expected = prev ? toDateKey(addDays(new Date(prev), 1)) : null;
    run = expected === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = new Date(`${key}T00:00:00`);
  });

  return { current, best: Math.max(best, current), activeToday: set.has(todayKey()) };
}

/* ---------------- money ---------------- */

export function moneySummary(transactions) {
  let income = 0;
  let expense = 0;
  transactions.forEach((t) => {
    const amount = Number(t.amount) || 0;
    if (t.type === 'income') income += amount;
    else expense += amount;
  });
  return { income, expense, balance: income - expense };
}

export function formatMoney(amount, currency = 'UZS') {
  const digits = currency === 'UZS' ? 0 : 2;
  const formatted = Math.abs(Number(amount) || 0)
    .toLocaleString('en-US', { maximumFractionDigits: digits })
    .replace(/,/g, ' ');
  return `${amount < 0 ? '−' : ''}${formatted} ${currency}`;
}

/* ---------------- statistics ---------------- */

export function weeklyOverview(date, { tasks, studySessions, focusSessions }) {
  return getWeekDates(date).map((day) => {
    const key = toDateKey(day);
    return {
      key,
      label: WEEKDAY_SHORT[day.getDay()],
      tasks: tasks.filter((t) => t.completed && t.completedAt && toDateKey(t.completedAt) === key).length,
      study: sumMinutes(studySessions, (s) => s.date === key),
      focus: sumMinutes(focusSessions, (s) => s.date === key),
    };
  });
}

export function averageGoalProgress(goals) {
  if (!goals.length) return 0;
  return Math.round(goals.reduce((sum, g) => sum + (Number(g.progress) || 0), 0) / goals.length);
}
