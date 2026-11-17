/** Reusable segmented control (filters, view switches, presets). */
export default function Segmented({ options, value, onChange, label, disabled = false }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((opt) => {
        const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return (
          <button
            key={item.value}
            type="button"
            className="segmented-item"
            aria-pressed={value === item.value}
            disabled={disabled}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
