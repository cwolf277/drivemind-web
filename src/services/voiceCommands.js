function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MOODS = ['happy', 'focused', 'stressed', 'tired', 'reflective', 'neutral'];
const MOOD_RE = MOODS.join('|');

const COMMANDS = [
  {
    type: 'deleteLast',
    patterns: [
      /^(delete|remove|scratch|forget|undo)( that| last| the last( one)?| my last( note)?| previous( note)?| last note| the last note)$/,
      /^(scratch that|never ?mind|cancel that|undo that)$/,
    ],
  },
  {
    type: 'readLast',
    patterns: [
      /^(read|repeat|play|say|tell me)( that| the last( note)?| my last( note)?| last note| the last one| my note| previous( note)?)$/,
      /^what did i (just )?say$/,
    ],
  },
  {
    type: 'readAll',
    patterns: [
      /^(read|play|tell me)( all| all my notes| my notes| everything)$/,
      /^summarize my notes$/,
      /^read back$/,
    ],
  },
  {
    type: 'stopListening',
    patterns: [
      /^(stop listening|pause listening|pause|sleep|go to sleep|stop|that's all|that is all|im done|i am done|done)$/,
    ],
  },
  {
    type: 'setMood',
    patterns: [
      new RegExp(`^i('m| am)?( feeling)? (${MOOD_RE})$`),
      new RegExp(`^(set )?mood( to)? (${MOOD_RE})$`),
      new RegExp(`^mood (${MOOD_RE})$`),
    ],
    extract: (m) => m[m.length - 1],
  },
  {
    type: 'help',
    patterns: [
      /^(help|what can i say|what can i do|what are my options|commands|menu)$/,
    ],
  },
];

export function parseCommand(text) {
  if (!text) return null;
  const normalized = normalize(text);
  if (!normalized) return null;
  for (const cmd of COMMANDS) {
    for (const pattern of cmd.patterns) {
      const m = normalized.match(pattern);
      if (m) {
        return { type: cmd.type, args: cmd.extract ? cmd.extract(m) : null };
      }
    }
  }
  return null;
}

export const COMMAND_LABELS = {
  deleteLast: 'Deleted last note',
  readLast: 'Reading last note',
  readAll: 'Reading recent notes',
  stopListening: 'Stopped listening',
  setMood: 'Mood set',
  help: 'Reading commands',
};

export const HELP_TEXT =
  "You can say: scratch that to delete the last note. Read last note. Read all notes. Stop listening. Or set a mood by saying I'm feeling, followed by happy, focused, stressed, tired, reflective, or neutral. To save a note, just speak it.";
