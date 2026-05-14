const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

const apiKey = () => import.meta.env.VITE_OPENAI_API_KEY;

export async function transcribeAudio(blob, { mimeType = 'audio/webm', filename = 'voice.webm' } = {}) {
  if (!apiKey()) throw new Error('OPENAI_API_KEY not set');
  if (!blob) throw new Error('No audio blob to transcribe');

  const file = new File([blob], filename, { type: mimeType });
  const form = new FormData();
  form.append('file', file);
  form.append('model', 'whisper-1');

  const started = performance.now();
  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  const latencyMs = Math.round(performance.now() - started);

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Whisper failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return { text: data.text || '', latencyMs };
}
