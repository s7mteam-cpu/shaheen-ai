import { saveResult } from "@/lib/providers/storage";
import { modelFor } from "@/lib/server/models";

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
export async function generateClip(desc: string, aspect: string, userId: string, jobId: string, deadline: number, ref?: { data: string; mime: string } | null): Promise<{ img: string; cdur: number } | null> {
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key || !desc.trim()) return null;
  const prompt = `${desc.trim().slice(0, 900)}. Photorealistic cinematic video, natural smooth motion, steady camera, modest formal professional attire, clean bright elegant setting, no on-screen text, no logos, no subtitles.`;
  try {
    const r = await fetch(`${BASE}/interactions`, {
      method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ model: await modelFor(MODEL), input: ref ? [{ type: "image", data: ref.data, mime_type: ref.mime }, { type: "text", text: `The person in the attached reference photo is the main person of this shot: keep exactly the same face, hair, skin tone and build, never change who he or she is. ${prompt}` }] : prompt, background: true, store: true, response_format: { type: "video", aspect_ratio: aspect === "16:9" ? "16:9" : "9:16", resolution: "720p" } }),
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
    return { img: await saveResult(userId, jobId, buf, "video/mp4", "mp4"), cdur: Math.max(1, mp4Seconds(buf) || 5) };
  } catch (e) { lastErr = (e as Error).message?.slice(0, 200); console.error("omni clip", e); return null; }
}

/** Makes every "clip" scene with AI, a few at a time (they run at Google, so this is waiting, not computing). */
export async function fillAiClips<G extends { kind: string; q?: string; img?: string; cdur?: number; credit?: string }>(graphics: G[], aspect: string, userId: string, jobId: string, deadline: number, ref?: { data: string; mime: string } | null): Promise<G[]> {
  const todo = graphics.filter((g) => g.kind === "clip" && g.q && !g.img);
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (g) => {
      let c = await generateClip(g.q!, aspect, userId, jobId, deadline, ref);
      if (!c && ref) c = await generateClip(g.q!, aspect, userId, jobId, deadline, null); // Google may refuse a face photo: try the same shot without it
      if (!c) c = await generateClip(g.q!, aspect, userId, jobId, deadline, null); // one more try before the scene borrows a neighbour's clip
      if (c) { g.img = c.img; g.cdur = c.cdur; g.credit = ""; }
    }));
  }
  return graphics;
}
