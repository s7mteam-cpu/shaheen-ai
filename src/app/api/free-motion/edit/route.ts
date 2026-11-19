import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { FREE_FONTS, cleanColors, cleanContact } from "@/lib/server/freeMotion";

export const maxDuration = 30;
const FONTS = FREE_FONTS;

/** Edit texts / colours / font / accounts of a finished design: the same code is drawn again (no AI call, so no charge). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const id = String(b.job ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,input,updated_at").eq("id", id).eq("user_id", user.id).eq("tool_id", "free-motion").maybeSingle();
  if (!job || job.status !== "done") return NextResponse.json({ error: "التصميم غير جاهز للتعديل." }, { status: 400 });
  const inp = job.input as { free?: { code?: string; fields?: { key: string; label: string; value: string }[] } };
  if (!inp.free?.code) return NextResponse.json({ error: "ما لقينا التصميم." }, { status: 404 });
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "free-motion").eq("input->>mode", "rerender").gte("updated_at", since);
  if ((count ?? 0) >= 12) return NextResponse.json({ error: "تعديلات كثيرة بوقت قصير. جرّب بعد شوي." }, { status: 429 });
  // only the values of the fields the design already has can change (never new keys, never code)
  const asked = new Map((Array.isArray(b.fields) ? b.fields : []).map((f: Record<string, unknown>) => [String(f?.key ?? ""), String(f?.value ?? "").replace(/[<>]/g, "").slice(0, 200)] as const));
  const fields = (inp.free.fields ?? []).map((f) => ({ ...f, value: asked.has(f.key) ? asked.get(f.key)! : f.value }));
  const blocked = await guardContent(user.id, fields.map((f) => f.value).join(" "), "free-motion-edit");
  if (blocked) return blocked;
  const oldN = (inp.free as { vo?: { sentences?: string[] } }).vo?.sentences ?? [];
  const newN = Array.isArray(b.narration) && b.narration.length === oldN.length ? b.narration.map((x) => String(x ?? "").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, 220)) : null; // same number of sentences, so the picture keeps following the voice
  if (newN && newN.some((x) => !x)) return NextResponse.json({ error: "جملة التعليق ما تنفع فاضية." }, { status: 400 });
  if (newN) { const g2 = await guardContent(user.id, newN.join(" "), "free-motion-edit"); if (g2) return g2; }
  const next = { ...job.input, mode: "rerender", editError: null, ...(newN ? { narration: newN } : {}), free: { ...inp.free, fields }, colors: cleanColors(b.colors), font: FONTS.includes(String(b.font)) ? String(b.font) : "Cairo", contact: cleanContact(b.contact) };
  const { error } = await admin.from("jobs").update({ status: "queued", progress: 0, input: next, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "done");
  if (error) return NextResponse.json({ error: "تعذّر بدء التعديل." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
