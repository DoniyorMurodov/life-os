import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import AIAssistant from '../components/AIAssistant';
import BackupBanner from '../components/BackupBanner';
import Icon from '../components/Icon';
import { formatDuration, formatLongDate, greeting, relativeDay, timeToMinutes, todayKey } from '../utils/date';
import { computeStreak, getSubjectStats, getTodayTaskStats, getTopPriorities, sumMinutes } from '../utils/calculations';

function SectionCard({ title, to, linkLabel = 'View all', children }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">{title}</h2>
        {to && (
          <Link to={to} className="card-link">
            {linkLabel} <Icon name="chevronRight" size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { settings, tasks, toggleTask, schedule, subjects, studySessions, focusSessions, goals, streakDays } = useApp();

  const today = todayKey();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const taskStats = useMemo(() => getTodayTaskStats(tasks), [tasks]);
  const priorities = useMemo(() => getTopPriorities(tasks, 3), [tasks]);
  const streak = useMemo(() => computeStreak(streakDays), [streakDays]);
  const focusToday = useMemo(() => sumMinutes(focusSessions, (s) => s.date === today), [focusSessions, today]);
  const weekday = now.getDay();
  const todaysEvents = useMemo(
    () => schedule.filter((e) => e.days?.includes(weekday)).sort((a, b) => a.start.localeCompare(b.start)),
    [schedule, weekday],
  );
  const studyStats = useMemo(
    () => subjects.map((s) => ({ subject: s, stats: getSubjectStats(s, studySessions) })),
    [subjects, studySessions],
  );
  const topGoals = useMemo(
    () => [...goals].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 3),
    [goals],
  );

  return (
    <>
      <Header title={`${greeting()}, ${settings.name || 'friend'}`} subtitle={formatLongDate(now)}>
        <span className={`streak-chip ${streak.activeToday ? 'is-active' : ''}`}>
          <Icon name="flame" size={16} /> {streak.current} day streak
        </span>
      </Header>

      <BackupBanner />

      <section className="card progress-hero" aria-label="Today's progress">
        <div className="progress-hero-top">
          <div>
            <p className="eyebrow">Today's progress</p>
            <p className="progress-hero-value">{taskStats.percent}%</p>
          </div>
          <p className="muted progress-hero-note">
            {taskStats.total
              ? `${taskStats.completed} of ${taskStats.total} tasks done`
              : 'No tasks planned for today yet'}
          </p>
        </div>
        <ProgressBar value={taskStats.percent} label="Today's task progress" size="lg" />
      </section>

      <div className="stat-grid">
        <StatCard icon="tasks" label="Tasks today" value={taskStats.total} />
        <StatCard icon="check" label="Completed" value={taskStats.completed} tone="green" />
        <StatCard icon="timer" label="Focus time" value={formatDuration(focusToday)} tone="purple" />
        <StatCard icon="flame" label="Current streak" value={`${streak.current} ${streak.current === 1 ? 'day' : 'days'}`} tone="orange" />
      </div>

      <div className="grid-2">
        <SectionCard title="Today's priorities" to="/tasks">
          {priorities.length ? (
            <div className="stack-sm">
              {priorities.map((t) => (
                <TaskCard key={t.id} task={t} onToggle={toggleTask} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="tasks"
              title="All clear"
              description="No pending tasks."
              action={<Link to="/tasks" className="btn btn-soft btn-sm">Add a task</Link>}
            />
          )}
        </SectionCard>

        <SectionCard title="Today's schedule" to="/schedule">
          {todaysEvents.length ? (
            <ul className="event-list">
              {todaysEvents.map((e) => {
                const start = timeToMinutes(e.start);
                const end = timeToMinutes(e.end) ?? start + 60;
                const status = nowMinutes >= end ? 'is-past' : nowMinutes >= start ? 'is-now' : '';
                return (
                  <li key={e.id} className={`event-row ${status}`}>
                    <span className="event-time">{e.start}</span>
                    <span className="event-dot" aria-hidden="true" />
                    <span className="event-title">{e.title}</span>
                    {status === 'is-now' && <span className="badge badge-accent">Now</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState compact icon="calendar" title="Nothing scheduled today" />
          )}
        </SectionCard>

        <SectionCard title="Study progress" to="/study" linkLabel="Open">
          {studyStats.length ? (
            <div className="stack">
              {studyStats.map(({ subject, stats }) => (
                <div key={subject.id} className="mini-progress">
                  <div className="mini-progress-head">
                    <span className="mini-progress-name">
                      <span className="color-dot" style={{ background: subject.color }} aria-hidden="true" />
                      {subject.name}
                    </span>
                    <span className="muted small">
                      Today {formatDuration(stats.today)} · Week {formatDuration(stats.week)}
                    </span>
                  </div>
                  <ProgressBar value={stats.percent} color={subject.color} label={`${subject.name} weekly progress`} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact icon="book" title="No subjects yet" />
          )}
        </SectionCard>

        <SectionCard title="Current goals" to="/goals">
          {topGoals.length ? (
            <div className="stack">
              {topGoals.map((g) => (
                <div key={g.id} className="mini-progress">
                  <div className="mini-progress-head">
                    <span className="mini-progress-name">{g.title}</span>
                    <span className="muted small">
                      {g.progress}%{g.deadline ? ` · ${relativeDay(g.deadline)}` : ''}
                    </span>
                  </div>
                  <ProgressBar value={g.progress} label={`${g.title} progress`} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon="target"
              title="Set your first goal"
              action={<Link to="/goals" className="btn btn-soft btn-sm">Add goal</Link>}
            />
          )}
        </SectionCard>
      </div>

      <AIAssistant />
    </>
  );
}
