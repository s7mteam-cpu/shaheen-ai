import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { vertexUrl } from "@/lib/server/gemGate";
import { getFreeEngine } from "@/lib/server/freeEngine";
import { modelFor } from "@/lib/server/models";

export const maxDuration = 60;

/** Admin-only: one tiny text request straight to Vertex AI (a fraction of a cent), to see whether the key and the model answer there. Never falls back, so the answer is about Vertex alone. */
export async function POST() {
  const admin = await requireAdmin("ai");
  if (!admin) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const key = process.env.VERTEX_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "VERTEX_API_KEY غير موجود في Vercel. أضفه ثم أعد النشر." });
  const model = await modelFor((await getFreeEngine()).model);
  try {
    const res = await fetch(vertexUrl(model, "generateContent"), { method: "POST", signal: AbortSignal.timeout(45_000), headers: { "x-goog-api-key": key, "content-type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "أجب بكلمة واحدة: تم" }] }], generationConfig: { maxOutputTokens: 200 } }) });
    const txt = (await res.text()).replaceAll(key, "***");
    if (!res.ok) return NextResponse.json({ ok: false, model, status: res.status, error: txt.slice(0, 400) });
    let reply = ""; try { reply = ((JSON.parse(txt) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }).candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim(); } catch { /* not json */ }
    return NextResponse.json({ ok: true, model, reply: reply.slice(0, 80) });
  } catch (e) { return NextResponse.json({ ok: false, model, error: String((e as Error)?.message ?? e).slice(0, 200) }); }
}
