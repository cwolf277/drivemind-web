import { NoteCard } from './NoteCard.jsx';

export function NotesFeed({ notes, onDelete }) {
  return (
    <div className="notes-feed">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={onDelete} />
      ))}
    </div>
  );
}
