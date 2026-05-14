export function ModeToggle({ icon, label, active, onClick, accent = 'default', disabled }) {
  return (
    <button
      type="button"
      className={`mode-toggle accent-${accent} ${active ? 'is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <span className="mode-icon" aria-hidden="true">{icon}</span>
      <span className="mode-label">{label}</span>
      <span className={`mode-dot ${active ? 'is-active' : ''}`} aria-hidden="true" />
    </button>
  );
}
