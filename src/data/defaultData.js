import { addDays, toDateKey } from '../utils/date';

/* ---------------- option lists ---------------- */

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const TASK_CATEGORIES = ['Study', 'Work', 'Personal', 'Health', 'Other'];
export const EVENT_CATEGORIES = ['School', 'Study', 'Work', 'Personal', 'Health', 'Other'];
export const GOAL_CATEGORIES = ['Education', 'Career', 'Health', 'Personal', 'Finance', 'Other'];
export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Education', 'Shopping', 'Entertainment', 'Other'];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Scholarship', 'Other'];
export const CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'];
export const FOCUS_PRESETS = {
  '25/5': { work: 25, brk: 5 },
  '50/10': { work: 50, brk: 10 },
};

export const SUBJECT_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444'];

/* ---------------- defaults ---------------- */

export const DEFAULT_SETTINGS = {
  name: 'Doniyor',
  theme: 'dark',
  notifications: true,
  currency: 'UZS',
  onboarded: false,
  onboardedAt: null,
  lastBackupAt: null,
  backupSnoozedUntil: null,
  aiAccessCode: '',
};

export const DEFAULT_SUBJECTS = [
  { id: 'sub-english', name: 'English', color: '#3b82f6', weeklyTarget: 420 },
  { id: 'sub-math', name: 'Math', color: '#22c55e', weeklyTarget: 300 },
  { id: 'sub-programming', name: 'Programming', color: '#a855f7', weeklyTarget: 420 },
];

const WEEKDAYS = [1, 2, 3, 4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const DEFAULT_SCHEDULE = [
  { id: 'ev-school', title: 'School', start: '07:50', end: '13:30', category: 'School', days: WEEKDAYS },
  { id: 'ev-math', title: 'Math', start: '15:00', end: '16:30', category: 'Study', days: WEEKDAYS },
  { id: 'ev-programming', title: 'Programming', start: '20:00', end: '21:30', category: 'Study', days: EVERY_DAY },
];

/** Goal templates offered during onboarding. */
export const GOAL_TEMPLATES = {
  IELTS: { title: 'IELTS 7.5', category: 'Education', description: 'Reach band 7.5 overall.', months: 6, progress: 20 },
  SAT: { title: 'SAT 1500+', category: 'Education', description: 'Score 1500+ on the SAT.', months: 8, progress: 15 },
  Programming: { title: 'Programming', category: 'Career', description: 'Build and ship real projects.', months: 12, progress: 30 },
  Fitness: { title: 'Fitness', category: 'Health', description: 'Train 4× per week consistently.', months: 3, progress: 10 },
  Other: { title: 'University admission', category: 'Education', description: 'Get admitted to my target university.', months: 12, progress: 5 },
};

export const ONBOARDING_GOALS = ['IELTS', 'SAT', 'Programming', 'Fitness', 'Other'];

export function buildGoal(key, id) {
  const t = GOAL_TEMPLATES[key];
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + t.months);
  return {
    id,
    title: t.title,
    description: t.description,
    category: t.category,
    deadline: toDateKey(deadline),
    progress: t.progress,
    createdAt: new Date().toISOString(),
  };
}

export const getDefaultGoals = () => [
  buildGoal('IELTS', 'goal-ielts'),
  buildGoal('SAT', 'goal-sat'),
  buildGoal('Programming', 'goal-programming'),
];

/** Example tasks are generated relative to "today" so the dashboard is meaningful. */
export function getExampleTasks() {
  const now = new Date();
  const today = toDateKey(now);
  const created = now.toISOString();
  return [
    { id: 'task-1', title: 'IELTS Reading — 2 passages', priority: 'high', category: 'Study', deadline: today, completed: false, completedAt: null, createdAt: created },
    { id: 'task-2', title: 'SAT Math practice set', priority: 'high', category: 'Study', deadline: today, completed: false, completedAt: null, createdAt: created },
    { id: 'task-3', title: 'Build one React component', priority: 'medium', category: 'Work', deadline: today, completed: false, completedAt: null, createdAt: created },
    { id: 'task-4', title: '30 min workout', priority: 'low', category: 'Health', deadline: toDateKey(addDays(now, 1)), completed: false, completedAt: null, createdAt: created },
  ];
}

export function getExampleNotes() {
  return [
    {
      id: 'note-welcome',
      title: 'Welcome to Life OS',
      content:
        'This is your personal space for ideas, vocabulary, and plans.\n\nTip: everything is stored on this device. Use Settings → Export data to make a backup.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}
