import { useCallback, useEffect, useRef, useState } from 'react';
import { feedback } from '../services/audioFeedback.js';

const SPEECH_RMS_THRESHOLD = 0.04;
const SILENCE_HOLD_MS = 1200;
const MIN_SPEECH_MS = 500;

const WAKE_PHRASES = [
  'hey drivemind',
  'hey drive mind',
  'drive mind',
  'drivemind',
  'ok drivemind',
];

export function hasWakePhrase(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return WAKE_PHRASES.some((p) => lower.includes(p));
}

export function stripWakePhrase(text) {
  if (!text) return '';
  let out = text;
  for (const p of WAKE_PHRASES) {
    out = out.replace(new RegExp(`^[\\s,.!?-]*${p}[\\s,.!?-]*`, 'i'), '');
  }
  return out.trim();
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function useVoiceActivation({ onSegmentCaptured, requireWakePhrase = false } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isCapturingSpeech, setIsCapturingSpeech] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const optionsRef = useRef({ onSegmentCaptured, requireWakePhrase });
  const resourcesRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    optionsRef.current = { onSegmentCaptured, requireWakePhrase };
  }, [onSegmentCaptured, requireWakePhrase]);

  useEffect(() => {
    if (!isListening) return undefined;
    let cancelled = false;

    const run = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn('mic denied', err);
        feedback.error('Microphone permission required');
        setIsListening(false);
        return;
      }

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);

      const mimeType = pickMimeType();

      let recorder = null;
      let chunks = [];
      let speechStartedAt = null;
      let lastLoudAt = null;
      let rafId = null;
      let suppressDispatch = false;

      const startSegment = () => {
        if (cancelled || pausedRef.current) return;
        try {
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch (err) {
          console.warn('MediaRecorder failed', err);
          return;
        }
        chunks = [];
        speechStartedAt = null;
        lastLoudAt = null;
        suppressDispatch = false;
        setIsCapturingSpeech(false);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const localChunks = chunks;
          const localStarted = speechStartedAt;
          const localLastLoud = lastLoudAt;
          const wasSuppressed = suppressDispatch;
          recorder = null;
          setIsCapturingSpeech(false);
          const hadSpeech = localStarted && localLastLoud && localLastLoud - localStarted >= MIN_SPEECH_MS;
          if (!wasSuppressed && hadSpeech && optionsRef.current.onSegmentCaptured) {
            const blob = new Blob(localChunks, { type: mimeType || 'audio/webm' });
            optionsRef.current.onSegmentCaptured(blob, {
              mimeType: mimeType || 'audio/webm',
              requireWakePhrase: optionsRef.current.requireWakePhrase,
            });
          }
          if (!cancelled && !pausedRef.current) startSegment();
        };
        recorder.start();
      };

      const tick = () => {
        if (cancelled) return;
        if (pausedRef.current) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > SPEECH_RMS_THRESHOLD) {
          if (!speechStartedAt) {
            speechStartedAt = now;
            setIsCapturingSpeech(true);
          }
          lastLoudAt = now;
        } else if (
          speechStartedAt &&
          lastLoudAt &&
          now - lastLoudAt > SILENCE_HOLD_MS &&
          recorder &&
          recorder.state === 'recording'
        ) {
          recorder.stop();
        }
        rafId = requestAnimationFrame(tick);
      };

      resourcesRef.current = {
        pause: () => {
          if (pausedRef.current) return;
          pausedRef.current = true;
          setIsPaused(true);
          if (recorder && recorder.state === 'recording') {
            suppressDispatch = true;
            try { recorder.stop(); } catch {}
          }
          setIsCapturingSpeech(false);
        },
        resume: () => {
          if (!pausedRef.current) return;
          pausedRef.current = false;
          setIsPaused(false);
          startSegment();
        },
        stop: () => {
          cancelled = true;
          if (rafId) cancelAnimationFrame(rafId);
          try { if (recorder && recorder.state === 'recording') { suppressDispatch = true; recorder.stop(); } } catch {}
          try { analyser.disconnect(); } catch {}
          try { source.disconnect(); } catch {}
          try { ctx.close(); } catch {}
          stream.getTracks().forEach((t) => t.stop());
          setIsCapturingSpeech(false);
          pausedRef.current = false;
          setIsPaused(false);
        },
      };

      startSegment();
      tick();
    };

    run();

    return () => {
      if (resourcesRef.current) {
        resourcesRef.current.stop();
        resourcesRef.current = null;
      }
    };
  }, [isListening]);

  const startListening = useCallback(() => setIsListening(true), []);
  const stopListening = useCallback(() => setIsListening(false), []);
  const pause = useCallback(() => {
    resourcesRef.current?.pause?.();
  }, []);
  const resume = useCallback(() => {
    resourcesRef.current?.resume?.();
  }, []);

  return {
    isListening,
    isCapturingSpeech,
    isPaused,
    startListening,
    stopListening,
    pause,
    resume,
  };
}
