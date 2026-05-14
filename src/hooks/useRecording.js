import { useCallback, useEffect, useRef, useState } from 'react';
import { feedback } from '../services/audioFeedback.js';

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const mimeRef = useRef('');

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
      analyserRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      mimeRef.current = mimeType;
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setIsRecording(true);
      feedback.recordingStarted();
      return true;
    } catch (err) {
      console.warn('start recording failed', err);
      feedback.error('Microphone access denied');
      cleanup();
      setIsRecording(false);
      return false;
    }
  }, [cleanup]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return null;
    const mimeType = mimeRef.current;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];
        cleanup();
        setIsRecording(false);
        feedback.recordingStopped();
        resolve({ blob, mimeType });
      };
      try {
        recorder.stop();
      } catch (err) {
        console.warn('stop failed', err);
        cleanup();
        setIsRecording(false);
        resolve(null);
      }
    });
  }, [cleanup]);

  return { isRecording, level, start, stop };
}
