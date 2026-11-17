import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveResult } from "@/lib/providers/storage";

export const maxDuration = 60;
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-omni-1.1-flash"; // replaces Veo 3.1, which Google retired

/** The reply shape is not fixed in our hands, so look for the first video part anywhere inside it. */
function findVideo(o: unknown): { data?: string; uri?: string } | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (r.type === "video" || typeof r.mime_type === "string" && String(r.mime_type).startsWith("video/")) {
    const data = typeof r.data === "string" ? r.data : undefined;
    const uri = typeof r.uri === "string" ? r.uri : typeof r.url === "string" ? r.url : undefined;
    if (data || uri) return { data, uri };
  }
  for (const v of Object.values(r)) { const f = findVideo(v); if (f) return f; }
  return null;
}

async function finish(d: Record<string, unknown>, key: string, userId: string) {
  const v = findVideo(d);
  if (!v) return null;
  let buf: Buffer;
  if (v.data) buf = Buffer.from(v.data, "base64");
  else {
    const res = await fetch(v.uri!, { headers: { "x-goog-api-key": key }, redirect: "follow" });
    if (!res.ok) return { done: true, error: `download ${res.status}` };
    buf = Buffer.from(await res.arrayBuffer());
  }
  const path = await saveResult(userId, "veo-test", buf, "video/mp4", "mp4");
  const { data } = await createAdminClient().storage.from("results").createSignedUrl(path, 3600);
  return { done: true, url: data?.signedUrl ?? "" };
}

/** Admin-only trial of Google's video model: start one clip, then poll it. Nothing here is visible to customers. */
export async function POST(req: Request) {
  const admin = await requireAdmin("ai");
  if (!admin) return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_VIDEO_API_KEY غير مضاف في Vercel." }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as { prompt?: string; aspect?: string };
  const prompt = String(b.prompt ?? "").trim().slice(0, 1500);
  if (prompt.length < 5) return NextResponse.json({ error: "اكتب وصف المشهد." }, { status: 400 });
  const r = await fetch(`${BASE}/interactions`, {
    method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: prompt, background: true, store: true, response_format: { type: "video", aspect_ratio: b.aspect === "16:9" ? "16:9" : "9:16", resolution: "720p" } }),
  });
  const d = (await r.json().catch(() => ({}))) as Record<string, unknown> & { id?: string; name?: string; error?: { message?: string } };
  if (!r.ok) return NextResponse.json({ error: `Google ${r.status}: ${d.error?.message ?? JSON.stringify(d).slice(0, 300)}`.slice(0, 500) }, { status: 502 });
  const fin = await finish(d, key, admin.id); // some replies already carry the video
  if (fin) return NextResponse.json(fin);
  const id = d.id ?? d.name;
  if (!id) return NextResponse.json({ error: `رد Google بدون رقم متابعة: ${JSON.stringify(d).slice(0, 300)}` }, { status: 502 });
  return NextResponse.json({ op: String(id).replace(/^interactions\//, "") });
}

export async function GET(req: Request) {
  const admin = await requireAdmin("ai");
  if (!admin) return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_VIDEO_API_KEY غير مضاف." }, { status: 400 });
  const op = new URL(req.url).searchParams.get("op") ?? "";
  if (!/^[\w\-.]+$/.test(op)) return NextResponse.json({ error: "bad op" }, { status: 400 });
  const r = await fetch(`${BASE}/interactions/${op}`, { headers: { "x-goog-api-key": key } });
  const d = (await r.json().catch(() => ({}))) as Record<string, unknown> & { status?: string; error?: { message?: string } };
  if (!r.ok) return NextResponse.json({ error: `Google ${r.status}: ${d.error?.message ?? ""}`.slice(0, 400) }, { status: 502 });
  const fin = await finish(d, key, admin.id);
  if (fin) return NextResponse.json(fin);
  const st = String(d.status ?? "");
  if (/fail|cancel|error|incomplete/i.test(st)) return NextResponse.json({ done: true, error: `${st}: ${d.error?.message ?? JSON.stringify(d).slice(0, 400)}` });
  return NextResponse.json({ done: false, status: st });
}
