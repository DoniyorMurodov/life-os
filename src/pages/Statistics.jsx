import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import BarChart from '../components/BarChart';
import ProgressBar from '../components/ProgressBar';
import Icon from '../components/Icon';
import { addDays, formatDuration, formatShortDate, getWeekDates, monthKey, todayKey, toDateKey } from '../utils/date';
import { averageGoalProgress, computeStreak, formatMoney, sumMinutes, weeklyOverview } from '../utils/calculations';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function Statistics() {
  const { tasks, studySessions, focusSessions, transactions, goals, subjects, streakDays, settings } = useApp();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDate = useMemo(() => addDays(new Date(), weekOffset * 7), [weekOffset]);
  const weekDays = getWeekDates(weekDate);
  const from = toDateKey(weekDays[0]);
  const to = toDateKey(weekDays[6]);
  const inWeek = (key) => key >= from && key <= to;

  const overview = useMemo(
    () => weeklyOverview(weekDate, { tasks, studySessions, focusSessions }),
    [weekDate, tasks, studySessions, focusSessions],
  );
  const streak = useMemo(() => computeStreak(streakDays), [streakDays]);
  const month = monthKey();
  const monthExpenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(month)).reduce((s, t) => s + Number(t.amount || 0), 0),
    [transactions, month],
  );

  const weekTasks = overview.reduce((s, d) => s + d.tasks, 0);
  const weekStudy = overview.reduce((s, d) => s + d.study, 0);
  const weekFocus = overview.reduce((s, d) => s + d.focus, 0);
  const totalCompleted = tasks.filter((t) => t.completed).length;
  const today = todayKey();

  const bySubject = subjects
    .map((s) => ({ ...s, minutes: sumMinutes(studySessions, (x) => x.subjectId === s.id && inWeek(x.date)) }))
    .sort((a, b) => b.minutes - a.minutes);
  const maxSubject = Math.max(1, ...bySubject.map((s) => s.minutes));

  const chart = (field) => overview.map((d) => ({ key: d.key, label: d.label, value: d[field] }));

  return (
    <>
      <Header title="Statistics" subtitle="Your progress at a glance" />

      <div className="stat-grid stat-grid-3 stat-grid-6">
        <StatCard icon="check" label="Tasks completed" value={totalCompleted} hint={`${weekTasks} this week`} tone="green" />
        <StatCard icon="timer" label="Focus time" value={formatDuration(weekFocus)} hint="this week" tone="purple" />
        <StatCard icon="book" label="Study time" value={formatDuration(weekStudy)} hint="this week" />
        <StatCard icon="wallet" label="Expenses" value={formatMoney(monthExpenses, settings.currency)} hint="this month" tone="red" />
        <StatCard icon="target" label="Goals progress" value={`${averageGoalProgress(goals)}%`} hint={`${goals.length} goals`} tone="blue" />
        <StatCard icon="flame" label="Current streak" value={plural(streak.current, "day")} hint={`Best: ${plural(streak.best, "day")}`} tone="orange" />
      </div>

      <div className="week-nav">
        <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)}>
          <Icon name="chevronLeft" />
        </button>
        <span className="week-nav-label">
          {weekOffset === 0 ? 'This week' : `${formatShortDate(from)} – ${formatShortDate(to)}`}
        </span>
        <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 0}>
          <Icon name="chevronRight" />
        </button>
      </div>

      <div className="grid-3">
        <section className="card">
          <div className="card-head"><h2 className="card-title">Tasks completed</h2><span className="muted small">{weekTasks}</span></div>
          <BarChart label="Tasks completed per day" data={chart('tasks')} highlightKey={today} color="var(--green)" />
        </section>
        <section className="card">
          <div className="card-head"><h2 className="card-title">Study time</h2><span className="muted small">{formatDuration(weekStudy)}</span></div>
          <BarChart label="Study minutes per day" data={chart('study')} format={formatDuration} highlightKey={today} />
        </section>
        <section className="card">
          <div className="card-head"><h2 className="card-title">Focus time</h2><span className="muted small">{formatDuration(weekFocus)}</span></div>
          <BarChart label="Focus minutes per day" data={chart('focus')} format={formatDuration} highlightKey={today} color="var(--purple)" />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Study by subject</h2>
          <div className="stack list-gap-sm">
            {bySubject.length ? bySubject.map((s) => (
              <div key={s.id} className="mini-progress">
                <div className="mini-progress-head">
                  <span className="mini-progress-name"><span className="color-dot" style={{ background: s.color }} aria-hidden="true" />{s.name}</span>
                  <span className="muted small">{formatDuration(s.minutes)}</span>
                </div>
                <ProgressBar value={s.minutes} max={maxSubject} color={s.color} label={`${s.name} study time`} />
              </div>
            )) : <p className="muted small">No subjects yet.</p>}
          </div>
        </section>
        <section className="card">
          <h2 className="card-title">Goals</h2>
          <div className="stack list-gap-sm">
            {goals.length ? goals.map((g) => (
              <div key={g.id} className="mini-progress">
                <div className="mini-progress-head">
                  <span className="mini-progress-name">{g.title}</span>
                  <span className="muted small">{g.progress}%</span>
                </div>
                <ProgressBar value={g.progress} label={`${g.title} progress`} />
              </div>
            )) : <p className="muted small">No goals yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
