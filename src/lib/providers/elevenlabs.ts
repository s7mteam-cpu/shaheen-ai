import "server-only";

const API = "https://api.elevenlabs.io/v1";
const key = () => process.env.ELEVENLABS_API_KEY ?? "";

async function check(res: Response) {
  if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

export async function tts(text: string, voiceId: string, model = "eleven_v3") {
  const call = (m: string) => fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: m }),
  }).then(check);
  // Some voices/plans don't support every model: fall back to the multilingual model.
  try { return (await call(model)).arrayBuffer(); }
  catch (e) { if (model === "eleven_multilingual_v2") throw e; console.error("tts fallback", e); return (await call("eleven_multilingual_v2")).arrayBuffer(); }
}

/** Speech + word timings (seconds), for captions that follow the voice. */
export async function ttsTimed(text: string, voiceId: string) {
  const call = (m: string) => fetch(`${API}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: m }),
  });
  let res = await call("eleven_v3");
  if (!res.ok) res = await call("eleven_multilingual_v2");
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
