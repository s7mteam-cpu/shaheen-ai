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
    // Flash models "think" by default and that eats the reply's token budget → no thinking for short chat/copy answers
    generationConfig: { maxOutputTokens: maxTokens, ...(/flash/i.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
  });
  const text = (r.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error(`google: empty reply (${model})`);
  return text;
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

/** Find the first video item ({uri} or {data}) anywhere in an Interactions API response. */
function findVideo(o: unknown): { uri?: string; data?: string } | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.type === "video" && (typeof r.uri === "string" || typeof r.data === "string")) return { uri: r.uri as string | undefined, data: r.data as string | undefined };
  for (const v of Object.values(r)) {
    const f = Array.isArray(v) ? v.map(findVideo).find(Boolean) : findVideo(v);
    if (f) return f;
  }
  return null;
}

/**
 * Start a Gemini Omni video from a first-frame image (Interactions API, URI delivery).
 * Returns either the finished video bytes (when the model answers inline) or a file id to poll.
 */
export async function omniStart(model: string, prompt: string, imageUrl: string, aspect: "9:16" | "16:9", seconds: number, resolution = "1080p") {
  const img = await toInline(imageUrl);
  const r = await post<Record<string, unknown>>("interactions", {
    model,
    input: [
      { type: "image", data: img.inlineData!.data, mime_type: img.inlineData!.mimeType },
      { type: "text", text: prompt },
    ],
    response_format: { type: "video", delivery: "uri", aspect_ratio: aspect, duration: `${Math.min(15, Math.max(3, Math.round(seconds)))}s`, resolution },
  });
  const v = findVideo(r);
  if (v?.data) return { bytes: Buffer.from(v.data, "base64") };
  if (!v?.uri) throw new Error(`google: no video in response (${String((r as { status?: string }).status ?? "")})`);
  const id = v.uri.split("?")[0].replace(/:download$/, "").split("/").filter(Boolean).pop()!;
  return { fileId: id };
}

/** Poll an Omni video file. null while processing; a download URL when ready. */
export async function omniCheck(fileId: string): Promise<{ url: string } | null> {
  const res = await fetch(`${API}/files/${fileId}`, { headers: { "x-goog-api-key": key() } });
  if (!res.ok) throw new Error(`google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const f = (await res.json()) as { state?: string; error?: { message?: string } };
  if (f.state === "FAILED") throw new Error(f.error?.message || "google: video failed");
  if (f.state !== "ACTIVE") return null;
  return { url: `${API}/files/${fileId}:download?alt=media&key=${key()}` };
}
