import { useState } from 'react';
import { MOOD_OPTIONS } from './MoodSelector.jsx';
import { timeAgo, fullTimestamp } from '../utils/time.js';

const MOOD_EMOJI = MOOD_OPTIONS.reduce((acc, m) => {
  acc[m.id] = m.emoji;
  return acc;
}, {});

export function NoteCard({ note, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const text = note.cleanedText || note.text || note.rawText || '';
  const title = note.title || text.slice(0, 60) || 'Untitled';
  const moodEmoji = note.mood ? MOOD_EMOJI[note.mood] : null;
  const relTime = timeAgo(note.timestamp);
  const fullTime = fullTimestamp(note.timestamp);

  return (
    <article className={`note-card ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="note-body-btn"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <header className="note-header">
          <div className="note-meta-line">
            {moodEmoji ? <span className="note-mood" title={note.mood}>{moodEmoji}</span> : null}
            <span className="note-time" title={fullTime}>{relTime}</span>
          </div>
          <button
            type="button"
            className="note-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            aria-label="Delete note"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9zM6 9v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9H6zm4 2a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6zm4 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6z" />
            </svg>
          </button>
        </header>
        <h3 className="note-title">{title}</h3>
        {note.summary ? <p className="note-summary">{note.summary}</p> : null}
        <p className={`note-text ${expanded ? '' : 'is-clamped'}`}>{text}</p>
        {expanded && note.tags?.length ? (
          <div className="note-tags">
            {note.tags.map((t) => (
              <span key={t} className="note-tag">#{t}</span>
            ))}
          </div>
        ) : null}
        {expanded && note.transcriptionLatencyMs ? (
          <p className="note-meta">Whisper: {note.transcriptionLatencyMs}ms</p>
        ) : null}
      </button>
    </article>
  );
}
