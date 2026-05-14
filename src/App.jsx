import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRecording } from './hooks/useRecording.js';
import { useNotes } from './hooks/useNotes.js';
import {
  useVoiceActivation,
  hasWakePhrase,
  stripWakePhrase,
} from './hooks/useVoiceActivation.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { transcribeAudio } from './services/transcription.js';
import { structureNote } from './services/noteStructuring.js';
import { feedback, speakAsync, cancelSpeech } from './services/audioFeedback.js';
import { storageBackend } from './services/storage.js';
import { parseCommand, COMMAND_LABELS, HELP_TEXT } from './services/voiceCommands.js';
import { HeroMic } from './components/HeroMic.jsx';
import { ModeToggle } from './components/ModeToggle.jsx';
import { MoodSelector } from './components/MoodSelector.jsx';
import { NotesFeed } from './components/NotesFeed.jsx';
import { EmptyState } from './components/EmptyState.jsx';
import { CommandToast } from './components/CommandToast.jsx';

const PREF_KEYS = {
  listening: 'drivemind:autoListen',
  wake: 'drivemind:wakePhrase',
  gpt: 'drivemind:useGPT',
  driving: 'drivemind:drivingMode',
};

const CONVERSATION_TIMEOUT_MS = 12000;

function readBool(key, fallback = false) {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}

function writeBool(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

function extOfMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

export default function App() {
  const [processing, setProcessing] = useState(false);
  const [pendingMood, setPendingMood] = useState(null);
  const [useGPTStructuring, setUseGPTStructuring] = useState(() => readBool(PREF_KEYS.gpt));
  const [requireWakePhrase, setRequireWakePhrase] = useState(() => readBool(PREF_KEYS.wake));
  const [autoListen, setAutoListen] = useState(() => readBool(PREF_KEYS.listening));
  const [drivingMode, setDrivingMode] = useState(() => readBool(PREF_KEYS.driving));
  const [conversationActive, setConversationActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const notesRef = useRef([]);
  const conversationActiveRef = useRef(false);
  const conversationTimeoutRef = useRef(null);
  const drivingModeRef = useRef(drivingMode);
  const voiceRef = useRef(null);

  const recording = useRecording();
  const { notes, addNote, removeNote } = useNotes();
  notesRef.current = notes;
  drivingModeRef.current = drivingMode;

  useWakeLock(drivingMode);

  useEffect(() => writeBool(PREF_KEYS.gpt, useGPTStructuring), [useGPTStructuring]);
  useEffect(() => writeBool(PREF_KEYS.wake, requireWakePhrase), [requireWakePhrase]);
  useEffect(() => writeBool(PREF_KEYS.listening, autoListen), [autoListen]);
  useEffect(() => writeBool(PREF_KEYS.driving, drivingMode), [drivingMode]);

  const flashCommand = useCallback((label) => {
    setLastCommand(label);
    setTimeout(() => setLastCommand((cur) => (cur === label ? null : cur)), 3500);
  }, []);

  const speakWhilePaused = useCallback(async (phrase) => {
    if (!phrase) return;
    const v = voiceRef.current;
    const wasListening = v?.isListening;
    if (wasListening) v.pause();
    try {
      await speakAsync(phrase, { force: true });
    } finally {
      if (wasListening) {
        setTimeout(() => v.resume(), 250);
      }
    }
  }, []);

  const clearConversation = useCallback(() => {
    conversationActiveRef.current = false;
    setConversationActive(false);
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current);
      conversationTimeoutRef.current = null;
    }
  }, []);

  const enterConversation = useCallback(() => {
    conversationActiveRef.current = true;
    setConversationActive(true);
    if (conversationTimeoutRef.current) clearTimeout(conversationTimeoutRef.current);
    conversationTimeoutRef.current = setTimeout(() => {
      conversationActiveRef.current = false;
      setConversationActive(false);
      conversationTimeoutRef.current = null;
    }, CONVERSATION_TIMEOUT_MS);
  }, []);

  useEffect(() => () => {
    if (conversationTimeoutRef.current) clearTimeout(conversationTimeoutRef.current);
  }, []);

  const executeCommand = useCallback(
    async (cmd) => {
      const label = COMMAND_LABELS[cmd.type] || 'Command';
      flashCommand(label);
      switch (cmd.type) {
        case 'deleteLast': {
          const target = notesRef.current[0];
          if (!target) {
            await speakWhilePaused('No notes to delete.');
            return;
          }
          await removeNote(target.id);
          await speakWhilePaused('Deleted last note.');
          return;
        }
        case 'readLast': {
          const target = notesRef.current[0];
          if (!target) {
            await speakWhilePaused('You have no notes.');
            return;
          }
          const body = target.cleanedText || target.text || target.rawText || target.title || '';
          await speakWhilePaused(`${target.title || 'Note'}. ${body}`);
          return;
        }
        case 'readAll': {
          const list = notesRef.current.slice(0, 3);
          if (!list.length) {
            await speakWhilePaused('You have no notes.');
            return;
          }
          for (let i = 0; i < list.length; i++) {
            const n = list[i];
            const body = n.cleanedText || n.text || n.rawText || '';
            await speakWhilePaused(`Note ${i + 1}. ${n.title || ''}. ${body}`);
          }
          return;
        }
        case 'stopListening': {
          voiceRef.current?.stopListening();
          setAutoListen(false);
          await speakAsync('Stopped listening.');
          return;
        }
        case 'setMood': {
          const mood = cmd.args;
          setPendingMood(mood);
          flashCommand(`Mood: ${mood}`);
          await speakWhilePaused(`Mood set to ${mood}.`);
          return;
        }
        case 'help': {
          await speakWhilePaused(HELP_TEXT);
          return;
        }
        default:
          return;
      }
    },
    [removeNote, speakWhilePaused, flashCommand]
  );

  const ingestSegment = useCallback(
    async (blob, { mimeType, requireWakePhrase: needWake } = {}) => {
      try {
        setProcessing(true);
        setErrorMessage(null);
        const filename = `voice.${extOfMime(mimeType)}`;
        const { text: rawText, latencyMs } = await transcribeAudio(blob, { mimeType, filename });

        let payloadText = rawText;
        let bypassWake = false;

        if (conversationActiveRef.current) {
          clearConversation();
          bypassWake = true;
        }

        if (needWake && !bypassWake) {
          if (!hasWakePhrase(rawText)) {
            setProcessing(false);
            return;
          }
          payloadText = stripWakePhrase(rawText);
          if (!payloadText.trim()) {
            setProcessing(false);
            feedback.wakeWordDetected();
            await speakWhilePaused('Yes?');
            enterConversation();
            return;
          }
          feedback.wakeWordDetected();
        }

        const trimmed = payloadText.trim();
        if (!trimmed) {
          setProcessing(false);
          return;
        }

        const command = parseCommand(trimmed);
        if (command) {
          setProcessing(false);
          await executeCommand(command);
          return;
        }

        const structured = await structureNote(trimmed, { useGPT: useGPTStructuring });
        const saved = await addNote({
          ...structured,
          mood: pendingMood || structured.detectedMood || null,
          timestamp: new Date().toISOString(),
          transcriptionLatencyMs: latencyMs,
        });
        setPendingMood(null);

        if (drivingModeRef.current) {
          const body = saved?.cleanedText || saved?.text || saved?.title || '';
          await speakWhilePaused(`Got it. ${body}`);
        } else if (saved?.title) {
          await speakWhilePaused(`Saved. ${saved.title}.`);
        }
      } catch (err) {
        console.warn('ingestSegment failed', err);
        feedback.error('Transcription failed');
        setErrorMessage(err.message || 'Could not process recording.');
      } finally {
        setProcessing(false);
      }
    },
    [
      addNote,
      pendingMood,
      useGPTStructuring,
      executeCommand,
      speakWhilePaused,
      enterConversation,
      clearConversation,
    ]
  );

  const voice = useVoiceActivation({
    onSegmentCaptured: ingestSegment,
    requireWakePhrase,
  });
  voiceRef.current = voice;

  useEffect(() => {
    if (autoListen && !voice.isListening) {
      voice.startListening();
    }
    if (!autoListen && voice.isListening) {
      voice.stopListening();
    }
  }, [autoListen, voice]);

  const onTapRecord = useCallback(async () => {
    if (recording.isRecording) {
      const result = await recording.stop();
      if (result?.blob) await ingestSegment(result.blob, { mimeType: result.mimeType });
    } else {
      await recording.start();
    }
  }, [recording, ingestSegment]);

  const onListeningPill = useCallback(() => {
    cancelSpeech();
    setAutoListen((v) => !v);
  }, []);

  const onDrivingPill = useCallback(async () => {
    const next = !drivingMode;
    setDrivingMode(next);
    if (next) {
      setAutoListen(true);
      setRequireWakePhrase(true);
      await speakAsync('Driving mode on. Say hey DriveMind anytime.');
    } else {
      clearConversation();
      await speakAsync('Driving mode off.');
    }
  }, [drivingMode, clearConversation]);

  const onSmartPill = useCallback(() => {
    setUseGPTStructuring((v) => !v);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      try { await removeNote(id); } catch (err) {
        feedback.error('Could not delete note');
        setErrorMessage(err.message || 'Delete failed.');
      }
    },
    [removeNote]
  );

  const { micState, statusText, statusHint } = useMemo(() => {
    if (processing) return { micState: 'processing', statusText: 'Processing…', statusHint: 'Transcribing your audio' };
    if (recording.isRecording) return { micState: 'recording', statusText: 'Recording', statusHint: 'Tap again to stop' };
    if (voice.isPaused) return { micState: 'paused', statusText: 'Speaking…', statusHint: 'Listening will resume' };
    if (conversationActive) return { micState: 'conversation', statusText: 'Yes?', statusHint: 'Go ahead — I\'m listening' };
    if (voice.isCapturingSpeech) return { micState: 'capturing', statusText: 'I hear you…', statusHint: 'Pause when you\'re done' };
    if (voice.isListening) {
      const text = drivingMode || requireWakePhrase ? 'Listening' : 'Listening';
      const hint = drivingMode || requireWakePhrase ? 'Say "Hey DriveMind"' : 'Just talk — I\'ll save it';
      return { micState: 'listening', statusText: text, statusHint: hint };
    }
    return { micState: 'idle', statusText: 'Tap to record', statusHint: 'Or turn on Listening' };
  }, [
    processing,
    recording.isRecording,
    voice.isPaused,
    voice.isCapturingSpeech,
    voice.isListening,
    conversationActive,
    drivingMode,
    requireWakePhrase,
  ]);

  return (
    <div className={`app ${drivingMode ? 'driving-mode' : ''}`}>
      {drivingMode ? (
        <div className="driving-banner" role="status">
          <span className="driving-dot" aria-hidden="true" />
          DRIVING MODE · say "Hey DriveMind"
        </div>
      ) : null}

      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">DM</div>
          <h1 className="brand-name">DriveMind</h1>
        </div>
        <div className={`storage-badge ${storageBackend}`}>
          <span className="storage-dot" aria-hidden="true" />
          {storageBackend === 'firebase' ? 'Synced' : 'Local'}
        </div>
      </header>

      <main className="hero-section">
        <HeroMic
          state={micState}
          statusText={statusText}
          hint={statusHint}
          onClick={onTapRecord}
          disabled={voice.isListening && !recording.isRecording}
        />
      </main>

      <CommandToast label={lastCommand} />

      <section className="mode-row">
        <ModeToggle
          icon="🚗"
          label="Driving"
          active={drivingMode}
          onClick={onDrivingPill}
          accent="orange"
        />
        <ModeToggle
          icon="👂"
          label="Listening"
          active={autoListen}
          onClick={onListeningPill}
          accent="teal"
        />
        <ModeToggle
          icon="✨"
          label="Smart"
          active={useGPTStructuring}
          onClick={onSmartPill}
          accent="indigo"
        />
      </section>

      <section className="mood-section">
        <div className="section-head">
          <span className="section-eyebrow">Mood for next note</span>
          {pendingMood ? <span className="section-tag">{pendingMood}</span> : null}
        </div>
        <MoodSelector value={pendingMood} onChange={setPendingMood} />
      </section>

      <section className="notes-section">
        <div className="section-head">
          <h2 className="section-heading">Notes</h2>
          {notes.length ? <span className="section-count">{notes.length}</span> : null}
        </div>
        {notes.length === 0 ? (
          <EmptyState drivingMode={drivingMode} />
        ) : (
          <NotesFeed notes={notes} onDelete={handleDelete} />
        )}
      </section>

      <details className="hints" open={!notes.length && !drivingMode}>
        <summary>What can I say?</summary>
        <ul>
          <li><strong>"Hey DriveMind"</strong> — alone → app says "Yes?", then speak your note</li>
          <li><strong>"Hey DriveMind, [note]"</strong> — saves in one breath</li>
          <li><strong>"Scratch that"</strong> / <strong>"Delete last note"</strong></li>
          <li><strong>"Read last note"</strong> / <strong>"Read back"</strong> / <strong>"Read all my notes"</strong></li>
          <li><strong>"Stop listening"</strong> / <strong>"Pause"</strong> / <strong>"I'm done"</strong></li>
          <li><strong>"I'm feeling focused"</strong> / <strong>"Mood happy"</strong></li>
          <li><strong>"What can I say?"</strong> / <strong>"Help"</strong></li>
        </ul>
      </details>

      <details className="advanced" open={showAdvanced} onToggle={(e) => setShowAdvanced(e.target.open)}>
        <summary>Advanced</summary>
        <div className="advanced-row">
          <label className="advanced-toggle">
            <input
              type="checkbox"
              checked={requireWakePhrase}
              onChange={(e) => setRequireWakePhrase(e.target.checked)}
              disabled={drivingMode}
            />
            <span>Require "Hey DriveMind" wake phrase</span>
          </label>
        </div>
      </details>

      {errorMessage ? (
        <div className="error-bar" role="alert">
          <strong>Error:</strong> {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
