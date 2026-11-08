// Шошго + оролт + алдааны мессеж нэг дор
export default function Field({ label, error, id, as: As = 'input', className = '', children, hint, ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {children ?? (
        <As id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
            className={`input ${error ? 'input-error' : ''} ${As === 'textarea' ? 'min-h-24 resize-y' : ''}`} {...props} />
      )}
      {error ? <p id={`${id}-err`} className="field-error">{error}</p> : hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}
