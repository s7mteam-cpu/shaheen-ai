import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveResult } from "@/lib/providers/storage";

export const maxDuration = 60;
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODELS = { fast: "veo-3.1-fast-generate-preview", standard: "veo-3.1-generate-preview" } as const;

/** Admin-only trial of Veo: start one 8-second clip, then poll it. Nothing here is visible to customers. */
export async function POST(req: Request) {
  const admin = await requireAdmin("ai");
  if (!admin) return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_VIDEO_API_KEY غير مضاف في Vercel." }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as { prompt?: string; aspect?: string; model?: string };
  const prompt = String(b.prompt ?? "").trim().slice(0, 1500);
  if (prompt.length < 5) return NextResponse.json({ error: "اكتب وصف المشهد." }, { status: 400 });
  const model = MODELS[b.model === "standard" ? "standard" : "fast"];
  const r = await fetch(`${BASE}/models/${model}:predictLongRunning`, {
    method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: b.aspect === "16:9" ? "16:9" : "9:16" } }),
  });
  const d = (await r.json().catch(() => ({}))) as { name?: string; error?: { message?: string } };
  if (!r.ok || !d.name) return NextResponse.json({ error: `Google ${r.status}: ${d.error?.message ?? "no operation"}`.slice(0, 400) }, { status: 502 });
  return NextResponse.json({ op: d.name, model });
}

export async function GET(req: Request) {
  const admin = await requireAdmin("ai");
  if (!admin) return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  const key = process.env.GEMINI_VIDEO_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_VIDEO_API_KEY غير مضاف." }, { status: 400 });
  const op = new URL(req.url).searchParams.get("op") ?? "";
  if (!/^[\w\-/.]+$/.test(op) || !op.startsWith("models/")) return NextResponse.json({ error: "bad op" }, { status: 400 });
  const r = await fetch(`${BASE}/${op}`, { headers: { "x-goog-api-key": key } });
  const d = (await r.json().catch(() => ({}))) as {
    done?: boolean; error?: { message?: string };
    response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } };
  };
  if (!r.ok) return NextResponse.json({ error: `Google ${r.status}: ${d.error?.message ?? ""}`.slice(0, 400) }, { status: 502 });
  if (!d.done) return NextResponse.json({ done: false });
  if (d.error) return NextResponse.json({ done: true, error: d.error.message ?? "failed" });
  const uri = d.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) return NextResponse.json({ done: true, error: `ما رجع فيديو (${(d.response?.generateVideoResponse?.raiMediaFilteredReasons ?? []).join(" | ") || "رفض الوصف أو فلتر السلامة"})` });
  const v = await fetch(uri, { headers: { "x-goog-api-key": key }, redirect: "follow" });
  if (!v.ok) return NextResponse.json({ done: true, error: `download ${v.status}` });
  const path = await saveResult(admin.id, "veo-test", Buffer.from(await v.arrayBuffer()), "video/mp4", "mp4");
  const { data } = await createAdminClient().storage.from("results").createSignedUrl(path, 3600);
  return NextResponse.json({ done: true, url: data?.signedUrl ?? "" });
}
