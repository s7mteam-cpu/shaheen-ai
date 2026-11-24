import { saveResult } from "@/lib/providers/storage";
import { modelFor } from "@/lib/server/models";
import { geminiImage } from "@/lib/providers/google";
import { noteUsage } from "@/lib/server/usageCtx";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-omni-1.1-flash"; // Google's current video model (Veo 3.1 was retired)

export const aiClipsReady = () => !!process.env.GEMINI_VIDEO_API_KEY;

/** The reply shape is Google's to change, so look for the first video part anywhere inside it. */
function findVideo(o: unknown): { data?: string; uri?: string } | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.type === "video" || (typeof r.mime_type === "string" && r.mime_type.startsWith("video/"))) {
    const data = typeof r.data === "string" ? r.data : undefined;
    const uri = typeof r.uri === "string" ? r.uri : typeof r.url === "string" ? r.url : undefined;
    if (data || uri) return { data, uri };
  }
  for (const v of Object.values(r)) { const f = findVideo(v); if (f) return f; }
  return null;
}

/** Length of an mp4 in seconds, read from its header (no ffprobe needed). */
function mp4Seconds(buf: Buffer): number {
  const i = buf.indexOf("mvhd");
  if (i < 0) return 0;
  const v = buf[i + 4];
  const ts = buf.readUInt32BE(i + (v === 1 ? 24 : 16)), du = v === 1 ? Number(buf.readBigUInt64BE(i + 28)) : buf.readUInt32BE(i + 20);
  return ts ? du / ts : 0;
}

let lastErr = "";
export const omniError = () => lastErr;

/** One AI-made clip from a description. Null when Google refuses or it does not finish before the deadline. */
export async function generateClip(desc: string, aspect: string, userId: string, jobId: string, deadline: number, ref?: { data: string; mime: string } | null, mode: "subject" | "first" = "subject"): Promise<{ img: string; cdur: number } | null> {
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key || !desc.trim()) return null;
  const prompt = `${desc.trim().slice(0, 900)}. Photorealistic cinematic video, natural smooth motion, steady camera, modest formal professional attire, clean bright elegant setting, no on-screen text, no logos, no subtitles.`;
  try {
    const r = await fetch(`${BASE}/interactions`, {
      method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ model: await modelFor(MODEL), input: ref ? [{ type: "image", data: ref.data, mime_type: ref.mime }, { type: "text", text: mode === "first" ? `Use the attached image as the very first frame of the video. Keep exactly the same person, face, outfit and place, and animate it naturally. ${prompt}` : `The person in the attached reference photo is the main person of this shot: keep exactly the same face, hair, skin tone and build, never change who he or she is. ${prompt}` }] : prompt, background: true, store: true, response_format: { type: "video", aspect_ratio: aspect === "16:9" ? "16:9" : "9:16", resolution: "720p" } }),
    });
    let d = (await r.json().catch(() => ({}))) as Record<string, unknown> & { id?: string; name?: string; status?: string; error?: { message?: string } };
    if (!r.ok) { lastErr = `Google ${r.status}: ${d.error?.message ?? ""}`.slice(0, 200); return null; }
    const id = String(d.id ?? d.name ?? "").replace(/^interactions\//, "");
    let v = findVideo(d);
    while (!v && id && Date.now() < deadline) {
      await new Promise((res) => setTimeout(res, 6000));
      const p = await fetch(`${BASE}/interactions/${id}`, { headers: { "x-goog-api-key": key } });
      d = (await p.json().catch(() => ({}))) as typeof d;
      if (!p.ok) { lastErr = `poll ${p.status}: ${d.error?.message ?? ""}`.slice(0, 200); return null; }
      v = findVideo(d);
      if (!v && /fail|cancel|error|incomplete/i.test(String(d.status ?? ""))) { lastErr = `${d.status}: ${d.error?.message ?? ""}`.slice(0, 200); return null; }
    }
    if (!v) { lastErr = lastErr || "timeout"; return null; }
    let buf: Buffer;
    if (v.data) buf = Buffer.from(v.data, "base64");
    else { const res = await fetch(v.uri!, { headers: { "x-goog-api-key": key }, redirect: "follow" }); if (!res.ok) { lastErr = `download ${res.status}`; return null; } buf = Buffer.from(await res.arrayBuffer()); }
    if (buf.length < 10_000) { lastErr = "empty video"; return null; }
    const cdur = Math.max(1, mp4Seconds(buf) || 5);
    noteUsage({ provider: "google", model: MODEL, source: "فيديو Google", units: Math.round(cdur) }); // priced per second in «تكلفة كل طلب»
    return { img: await saveResult(userId, jobId, buf, "video/mp4", "mp4"), cdur };
  } catch (e) { lastErr = (e as Error).message?.slice(0, 200); console.error("omni clip", e); return null; }
}

const IMG_MODEL = "gemini-3-pro-image-preview";
const aspectOf = (a: string) => (a === "16:9" ? "16:9" : "9:16");

/** A still of the scene (same person as the reference photo when there is one), made by Gemini's image model. Null when it fails. */
async function sceneStill(desc: string, aspect: string, ref: { data: string; mime: string } | null): Promise<{ data: string; mime: string } | null> {
  try {
    const prompt = `${ref ? "The person in the attached reference photo is the main person: keep exactly the same face, hair, skin tone, build and outfit. " : ""}${desc.trim().slice(0, 900)}. Photorealistic cinematic photo, natural light, modest formal professional attire, clean bright elegant setting, no on-screen text, no logos.`;
    const r = await geminiImage(IMG_MODEL, prompt, ref ? [`data:${ref.mime};base64,${ref.data}`] : [], aspectOf(aspect));
    return { data: r.bytes.toString("base64"), mime: r.type || "image/png" };
  } catch (e) { lastErr = `image: ${(e as Error).message}`.slice(0, 200); return null; }
}

/** Makes every "clip" scene with AI: a still of the scene first (the same person in every one: the customer's photo, or the first still), then the still becomes the video. A scene whose still fails goes straight from text to video. */
export async function fillAiClips<G extends { kind: string; q?: string; img?: string; cdur?: number; credit?: string }>(graphics: G[], aspect: string, userId: string, jobId: string, deadline: number, ref?: { data: string; mime: string } | null): Promise<G[]> {
  const todo = graphics.filter((g) => g.kind === "clip" && g.q && !g.img);
  if (!todo.length) return graphics;
  const hasPerson = (q: string) => /\b(man|men|woman|women|person|people|girl|boy|lady|gentleman|businessman|businesswoman|trainer|coach|presenter|speaker|team|colleagues?|students?|employee|manager|doctor|teacher|child|children|family|couple|he|she)\b/i.test(q);
  let anchor = ref ?? null; // the same person in every scene that has a person; scenes about a place or a thing get no reference
  const stills = new Map<G, { data: string; mime: string } | null>();
  if (!anchor) {
    const firstP = todo.find((g) => hasPerson(g.q!));
    if (firstP) { const st = await sceneStill(firstP.q!, aspect, null); stills.set(firstP, st); anchor = st; }
  }
  await Promise.all(todo.filter((g) => !stills.has(g)).map(async (g) => { stills.set(g, await sceneStill(g.q!, aspect, hasPerson(g.q!) ? anchor : null)); }));
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (g) => {
      const still = stills.get(g) ?? null;
      let c = still ? await generateClip(g.q!, aspect, userId, jobId, deadline, still, "first") : null;
      if (!c) c = await generateClip(g.q!, aspect, userId, jobId, deadline, null); // still or its video failed: plain text-to-video
      if (c) { g.img = c.img; g.cdur = c.cdur; g.credit = ""; }
    }));
  }
  return graphics;
}
