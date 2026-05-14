export function EmptyState({ drivingMode }) {
  const tips = drivingMode
    ? [
        '"Hey DriveMind"',
        '"Hey DriveMind, remind me to…"',
        '"Hey DriveMind, what can I say?"',
      ]
    : [
        'Tap the mic and just talk',
        '"I\'m feeling focused"',
        '"Read last note"',
      ];

  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">🎙️</div>
      <h3 className="empty-title">No notes yet</h3>
      <p className="empty-sub">Try saying:</p>
      <div className="empty-tips">
        {tips.map((t, i) => (
          <div key={i} className="empty-tip">{t}</div>
        ))}
      </div>
    </div>
  );
}
