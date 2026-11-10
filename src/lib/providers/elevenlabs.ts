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
