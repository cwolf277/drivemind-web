export const MOOD_OPTIONS = [
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'focused', label: 'Focused', emoji: '🎯' },
  { id: 'stressed', label: 'Stressed', emoji: '😣' },
  { id: 'tired', label: 'Tired', emoji: '😴' },
  { id: 'reflective', label: 'Reflective', emoji: '🤔' },
  { id: 'neutral', label: 'Neutral', emoji: '😐' },
];

export function MoodSelector({ value, onChange }) {
  return (
    <div className="mood-grid" role="radiogroup" aria-label="Mood for next note">
      {MOOD_OPTIONS.map((mood) => {
        const selected = value === mood.id;
        return (
          <button
            type="button"
            key={mood.id}
            className={`mood-tile ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(selected ? null : mood.id)}
            aria-pressed={selected}
          >
            <span className="mood-tile-emoji">{mood.emoji}</span>
            <span className="mood-tile-label">{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
}
