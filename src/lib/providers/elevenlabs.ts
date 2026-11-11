import "server-only";

const API = "https://api.elevenlabs.io/v1";
const key = () => process.env.ELEVENLABS_API_KEY ?? "";

async function check(res: Response) {
  if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

// Same as the ElevenLabs site: Eleven v4 with the language fixed to Arabic (fallback: Multilingual v2).
export const DEFAULT_TTS = "eleven_v4";
const FALLBACK_TTS = "eleven_multilingual_v2";
const takesLanguage = (m: string) => /^eleven_(v3|v4|flash_v2_5|turbo_v2_5)/.test(m);

/** Text the voice reads smoothly: one flowing paragraph, pauses as commas, no "…" or stray line breaks. */
export function speakable(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[…]+|\.{3,}/g, "، ")
    .replace(/\s*\n+\s*/g, (m) => (m.includes("\n\n") ? ". " : "، "))
    .replace(/([.،!؟?])\s*[،,]\s*/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Same sliders as the ElevenLabs site (0..1), saved per voice in /admin → content → voices → "settings". */
export type VoiceSettings = { stability?: number; similarity?: number; style?: number; speed?: number; speaker_boost?: boolean };
export function voiceSettings(s?: VoiceSettings) {
  if (!s) return undefined;
  const n = (v: unknown, d: number) => (typeof v === "number" && v >= 0 && v <= 2 ? v : d);
  return { stability: n(s.stability, 0.5), similarity_boost: n(s.similarity, 0.75), style: n(s.style, 0), speed: n(s.speed, 1), use_speaker_boost: s.speaker_boost ?? true };
}

export async function tts(text: string, voiceId: string, model = DEFAULT_TTS, settings?: VoiceSettings) {
  const call = (m: string) => fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text: speakable(text), model_id: m, ...(takesLanguage(m) ? { language_code: "ar" } : {}), ...(voiceSettings(settings) ? { voice_settings: voiceSettings(settings) } : {}) }),
  }).then(check);
  // Some voices/plans don't support every model: fall back to the multilingual model.
  try { return (await call(model)).arrayBuffer(); }
  catch (e) { const alt = model === FALLBACK_TTS ? DEFAULT_TTS : FALLBACK_TTS; console.error("tts fallback", e); return (await call(alt)).arrayBuffer(); }
}

/** Speech + word timings (seconds), for captions that follow the voice. */
export async function ttsTimed(text: string, voiceId: string, model = DEFAULT_TTS, settings?: VoiceSettings) {
  const call = (m: string) => fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text: speakable(text), model_id: m, ...(takesLanguage(m) ? { language_code: "ar" } : {}), ...(voiceSettings(settings) ? { voice_settings: voiceSettings(settings) } : {}) }),
  });
  let res = await call(model);
  if (!res.ok) res = await call(model === FALLBACK_TTS ? DEFAULT_TTS : FALLBACK_TTS);
  await check(res);
  const d = (await res.json()) as { audio_base64: string; alignment?: Align; normalized_alignment?: Align };
  const a = d.alignment ?? d.normalized_alignment;
  const words: { t: string; s: number; e: number }[] = [];
  let cur = "", s0 = -1, e0 = 0;
  const chars = a?.characters ?? [];
  for (let i = 0; i < chars.length; i++) {
    if (/\s/.test(chars[i])) { if (cur && s0 >= 0) words.push({ t: cur, s: +s0.toFixed(2), e: +e0.toFixed(2) }); cur = ""; s0 = -1; continue; }
    if (s0 < 0) s0 = a!.character_start_times_seconds[i];
    cur += chars[i]; e0 = a!.character_end_times_seconds[i];
  }
  if (cur && s0 >= 0) words.push({ t: cur, s: +s0.toFixed(2), e: +e0.toFixed(2) });
  return { audio: Buffer.from(d.audio_base64, "base64"), words, duration: words.length ? words[words.length - 1].e + 0.3 : 0 };
}
type Align = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };

/** Instant voice clone from one sample. Returns the new voice id. */
export async function cloneVoice(name: string, sample: Blob) {
  const form = new FormData();
  form.append("name", name);
  form.append("files", sample, "sample.mp3");
  const res = await fetch(`${API}/voices/add`, { method: "POST", headers: { "xi-api-key": key() }, body: form }).then(check);
  return ((await res.json()) as { voice_id: string }).voice_id;
}

export async function deleteVoice(voiceId: string) {
  await fetch(`${API}/voices/${voiceId}`, { method: "DELETE", headers: { "xi-api-key": key() } });
}

/** Eleven Music. For nasheeds the prompt forbids any instruments. */
export async function music(prompt: string, seconds: number) {
  const res = await fetch(`${API}/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ prompt, music_length_ms: seconds * 1000 }),
  }).then(check);
  return res.arrayBuffer();
}

/** Speech → text with ElevenLabs Scribe (Arabic, Gulf dialect included). Used by the mic in «كلّم شاهين». */
export async function transcribe(audio: Blob, filename: string) {
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("language_code", "ara");
  form.append("tag_audio_events", "false");
  form.append("file", audio, filename);
  const res = await check(await fetch(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": key() }, body: form }));
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}
