function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="42" height="42" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
      <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function HeroMic({ state, statusText, hint, onClick, disabled }) {
  const showStop = state === 'recording';
  return (
    <div className={`hero-wrap state-${state}`}>
      <div className="hero-rings" aria-hidden="true">
        <span className="hero-ring hero-ring-1" />
        <span className="hero-ring hero-ring-2" />
        <span className="hero-ring hero-ring-3" />
      </div>
      <button
        type="button"
        className="hero-mic"
        onClick={onClick}
        disabled={disabled}
        aria-label={statusText}
      >
        {state === 'processing' ? (
          <span className="spinner-lg" />
        ) : showStop ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>
      <div className="hero-status">
        <p className="hero-status-text">{statusText}</p>
        {hint ? <p className="hero-status-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
