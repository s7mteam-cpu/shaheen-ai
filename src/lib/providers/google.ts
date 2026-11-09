import "server-only";

const API = "https://generativelanguage.googleapis.com/v1beta";
const key = () => process.env.GEMINI_API_KEY ?? "";

type Part = { text?: string; inlineData?: { mimeType: string; data: string } };
type Content = { role: "user" | "model"; parts: Part[] };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/${path}`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key() }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

async function toInline(url: string): Promise<Part> {
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  return { inlineData: { mimeType: r.headers.get("content-type") || "image/png", data: buf.toString("base64") } };
}

type GenResp = { candidates?: { content?: { parts?: Part[] } }[] };

/** Text / chat with Gemini. */
export async function geminiText(model: string, system: string, contents: Content[], maxTokens = 1200) {
  const r = await post<GenResp>(`models/${model}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  });
  return (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
}

/** Nano Banana image generation / editing. Returns image bytes. */
export async function geminiImage(model: string, prompt: string, imageUrls: string[], aspect: string) {
  const parts: Part[] = [{ text: prompt }, ...(await Promise.all(imageUrls.map(toInline)))];
  const r = await post<GenResp>(`models/${model}:generateContent`, {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
  });
  const img = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!img) throw new Error("google: no image returned");
  return { bytes: Buffer.from(img.data, "base64"), type: img.mimeType };
}

/** Gemini text-to-speech → WAV bytes. */
export async function geminiSpeech(model: string, text: string, voiceName: string) {
  const r = await post<GenResp>(`models/${model}:generateContent`, {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
  });
  const audio = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!audio) throw new Error("google: no audio returned");
  return pcmToWav(Buffer.from(audio.data, "base64"), 24000);
}

function pcmToWav(pcm: Buffer, rate: number) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Start a Veo video. Returns the operation name (we poll it). */
export async function veoStart(model: string, prompt: string, imageUrl: string | undefined, aspect: string, seconds: number) {
  const instance: Record<string, unknown> = { prompt };
  if (imageUrl) {
    const p = await toInline(imageUrl);
    instance.image = { bytesBase64Encoded: p.inlineData!.data, mimeType: p.inlineData!.mimeType };
  }
  const r = await post<{ name: string }>(`models/${model}:predictLongRunning`, {
    instances: [instance],
    parameters: { aspectRatio: aspect === "1:1" ? "16:9" : aspect, durationSeconds: seconds >= 8 ? 8 : seconds },
  });
  return r.name;
}

/** Check a Veo operation. Returns null while running, a downloadable URL when done. */
export async function veoCheck(operation: string): Promise<{ url: string } | null> {
  const res = await fetch(`${API}/${operation}`, { headers: { "x-goog-api-key": key() } });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const op = (await res.json()) as { done?: boolean; error?: { message: string }; response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] } } };
  if (!op.done) return null;
  if (op.error) throw new Error(op.error.message);
  const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) throw new Error("google: no video");
  return { url: `${uri}${uri.includes("?") ? "&" : "?"}key=${key()}` };
}
