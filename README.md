# DriveMind (web)

Voice-activated AI note-taking app — web version (React + Vite). Runs in any modern browser; tested on Chrome / Edge on Windows.

## Quick start

```powershell
cd drivemind-web
npm install
copy .env.example .env
# edit .env and set VITE_OPENAI_API_KEY
npm run dev
```

Open http://127.0.0.1:5173 in Chrome. Allow microphone access when prompted.

## Features

- **Manual recording** — tap the record button, again to stop. Audio captured via `MediaRecorder`, sent to OpenAI Whisper.
- **Listening mode** — continuous voice-activated capture using Web Audio API `AnalyserNode` for VAD. Auto-records when you speak, auto-stops on ~1.2s of silence.
- **"Hey DriveMind" wake-phrase** — when enabled, segments without the wake phrase are discarded; the phrase is stripped from saved notes.
- **Mood tagging** — manual chips + automatic detection from text (or via GPT).
- **Smart structuring** — toggle `gpt-4o-mini` to extract title / summary / tags / mood as JSON.
- **Audio feedback** — Web Speech API for spoken confirmations + Vibration API on supported devices.
- **Cloud sync** — Firebase Firestore when configured, otherwise `localStorage` fallback.

## Architecture (SOLID layers)

```
src/
  config/firebase.js          init + isFirebaseConfigured flag
  services/
    storage.js                Firebase | localStorage interface
    transcription.js          OpenAI Whisper (fetch + FormData)
    noteStructuring.js        cleaning, tags, mood, GPT structuring
    audioFeedback.js          Speech Synthesis + Vibration API
  hooks/
    useRecording.js           MediaRecorder + AudioContext metering
    useNotes.js               CRUD over storage interface
    useVoiceActivation.js     continuous VAD + wake-phrase
  components/
    RecordButton.jsx
    MoodSelector.jsx
    NoteCard.jsx
    NotesFeed.jsx
  App.jsx                     composition / screen layout
```

## Security note

`VITE_OPENAI_API_KEY` and Firebase config are bundled into the client. That's fine for local development and personal use, but **for production** you'd front Whisper / GPT calls with a small server (Cloud Functions, Cloudflare Worker, etc.) so the key isn't exposed.

## Optional: Firebase

Without keys, notes persist in browser localStorage. To enable cross-device sync:

1. Create a Firebase project, enable Firestore.
2. Add a Web app, copy the config keys into `.env` (`VITE_FIREBASE_*`).
3. Set Firestore rules — for dev only:
   ```
   match /notes/{doc} { allow read, write: if true; }
   ```
   Tighten before shipping (add Firebase Auth + per-user rules).
