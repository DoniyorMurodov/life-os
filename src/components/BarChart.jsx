import { memo } from 'react';

/**
 * Minimal CSS bar chart. data: [{ key, label, value }]
 * `format` renders the value label; `highlightKey` marks a bar (e.g. today).
 */
function BarChart({ data, format = (v) => v, highlightKey, color, label }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bar-chart" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`}>
      {data.map((d) => (
        <div key={d.key} className={`bar-col ${d.key === highlightKey ? 'is-current' : ''}`}>
          <span className="bar-value">{d.value ? format(d.value) : ''}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: `${(d.value / max) * 100}%`, ...(color ? { background: color } : null) }}
            />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default memo(BarChart);
