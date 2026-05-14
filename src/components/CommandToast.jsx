export function CommandToast({ label }) {
  if (!label) return null;
  return (
    <div className="command-toast" role="status" aria-live="polite">
      <span className="command-toast-bolt" aria-hidden="true">⚡</span>
      <span>{label}</span>
    </div>
  );
}
