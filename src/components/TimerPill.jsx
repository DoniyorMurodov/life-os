import { Link, useLocation } from 'react-router-dom';
import { useFocusTimer } from '../context/FocusContext';
import { formatClock } from '../utils/date';
import Icon from './Icon';

/** Small floating indicator so a running timer is visible from any page. */
export default function TimerPill() {
  const { timer, secondsLeft } = useFocusTimer();
  const { pathname } = useLocation();
  if (timer.status === 'idle' || pathname === '/focus') return null;

  return (
    <Link to="/focus" className={`timer-pill ${timer.mode === 'break' ? 'is-break' : ''}`} aria-label="Open focus timer">
      <Icon name={timer.status === 'running' ? 'timer' : 'pause'} size={16} />
      <span>{formatClock(secondsLeft)}</span>
      <span className="timer-pill-mode">{timer.status === 'paused' ? 'Paused' : timer.mode === 'work' ? 'Focus' : 'Break'}</span>
    </Link>
  );
}
