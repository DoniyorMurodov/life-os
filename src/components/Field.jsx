/** Labeled form field wrapper + shared form helpers. */
export default function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

export function FormActions({ onCancel, submitLabel = 'Save', children }) {
  return (
    <div className="form-actions">
      {children}
      <span className="spacer" />
      {onCancel && (
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
    </div>
  );
}
