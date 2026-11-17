import { clamp } from '../utils/calculations';

export default function ProgressBar({ value = 0, max = 100, label, color, size = 'md' }) {
  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div
      className={`progress progress-${size}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div className="progress-fill" style={{ width: `${percent}%`, ...(color ? { background: color } : null) }} />
    </div>
  );
}
