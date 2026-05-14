let enabled = true;

export function setAudioFeedbackEnabled(value) {
  enabled = Boolean(value);
}

export function isAudioFeedbackEnabled() {
  return enabled;
}

function getSynth() {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis || null;
}

function speak(phrase, { rate = 1.0, pitch = 1.0 } = {}) {
  if (!enabled || !phrase) return;
  const synth = getSynth();
  if (!synth) return;
  try {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(phrase);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.lang = 'en-US';
    synth.speak(utter);
  } catch {}
}

export function speakAsync(phrase, { rate = 1.0, pitch = 1.0, force = false } = {}) {
  if ((!enabled && !force) || !phrase) return Promise.resolve();
  const synth = getSynth();
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = rate;
      utter.pitch = pitch;
      utter.lang = 'en-US';
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      synth.speak(utter);
    } catch {
      resolve();
    }
  });
}

export function cancelSpeech() {
  const synth = getSynth();
  if (synth) {
    try { synth.cancel(); } catch {}
  }
}

function vibrate(pattern) {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {}
}

export const feedback = {
  recordingStarted() {
    vibrate(20);
    speak('Listening');
  },
  recordingStopped() {
    vibrate(10);
  },
  noteSaved(title) {
    vibrate([10, 40, 10]);
    if (title) {
      speak(`Saved. ${title}`);
    } else {
      speak('Note saved');
    }
  },
  noteDeleted() {
    vibrate(30);
  },
  error(message = 'Something went wrong') {
    vibrate([60, 60, 60]);
    speak(message);
  },
  wakeWordDetected() {
    vibrate(40);
    speak('Yes');
  },
  command(message) {
    vibrate(20);
    if (message) speak(message);
  },
};
