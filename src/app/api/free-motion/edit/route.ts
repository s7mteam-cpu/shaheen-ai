import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { FREE_FONTS, cleanColors, cleanContact } from "@/lib/server/freeMotion";
import { cleanMusicTiming, type Music } from "@/remotion/montage";
import { DIALECT_NAME, pickVoice, typeToGA, type VoiceItem } from "@/lib/voiceMatch";

export const maxDuration = 30;
const num = (v: unknown, a: number, z: number, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(z, Math.max(a, v)) : d);
const clean = (x: unknown, n: number) => String(x ?? "").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, n);

/** The customer's own sound from their phone: it must sit in their own folder; only the timing numbers are kept. */
function cleanOwn(m: unknown, userId: string): Music | null {
  if (!m || typeof m !== "object") return null;
  const o = m as Partial<Music>;
  const path = String(o.path ?? "");
  if (!userId || !path.startsWith(`${userId}/`) || path.includes("..")) return null;
  return { url: "", name: clean(o.name, 80) || "صوت", path, bucket: "uploads", own: true, ...cleanMusicTiming(o) };
}

/**
 * The live studio's server side. Actions:
 *  save    - store texts / colours / font / accounts / music (instant, free, nothing is drawn)
 *  revoice - record the voice again (edited sentences or another voice)
 *  export  - draw the finished mp4 from what is saved
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const id = String(b.job ?? "");
  const action = String(b.action ?? "save");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["save", "revoice", "export", "unlock"].includes(action)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,input,output").eq("id", id).eq("user_id", user.id).eq("tool_id", "free-motion").maybeSingle();
  if (!job || job.status !== "done" || !(job.output as { preview?: string } | null)?.preview) return NextResponse.json({ error: "التصميم غير جاهز." }, { status: 400 });
  const inp = job.input as Record<string, unknown> & { free?: { fields?: { key: string; label: string; value: string }[]; vo?: { sentences?: string[] } } };
  if (!inp.free) return NextResponse.json({ error: "ما لقينا التصميم." }, { status: 404 });

  // after an export the design is closed: editing it again costs the edit price ("unlock"), as in the other tools
  const exported = !!(job.output as { files?: unknown[] } | null)?.files?.length;
  if (action === "unlock") {
    if (!exported || inp.unlocked) return NextResponse.json({ ok: true, charged: 0 });
    const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", "free-motion").maybeSingle();
    const cost = Math.max(0, tool?.edit_cost ?? 8);
    // flip the flag first (only one request can win), then charge; if the payment fails the flag goes back
    const { data: won } = await admin.from("jobs").update({ input: { ...inp, unlocked: true }, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "done").or("input->>unlocked.is.null,input->>unlocked.neq.true").select("id");
    if (!won?.length) return NextResponse.json({ ok: true, charged: 0 });
    if (cost > 0) {
      const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
      if (payErr) { await admin.from("jobs").update({ input: { ...inp, unlocked: false }, updated_at: new Date().toISOString() }).eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
    }
    return NextResponse.json({ ok: true, charged: cost });
  }
  if (exported && !inp.unlocked) return NextResponse.json({ error: "الفيديو انصدّر. لتعديله افتح التعديل من صفحة الفيديو." }, { status: 403 });

  // what the customer edited in the studio (only values of the fields the design already has; never code)
  const asked = new Map((Array.isArray(b.fields) ? b.fields : []).map((f: Record<string, unknown>) => [String(f?.key ?? ""), clean(f?.value, 200)] as const));
  const fields = (inp.free.fields ?? []).map((f) => ({ ...f, value: asked.has(f.key) ? asked.get(f.key)! : f.value }));
  const texts = fields.map((f) => f.value).join(" ");
  const blocked = await guardContent(user.id, texts, "free-motion-edit");
  if (blocked) return blocked;
  const saved: Record<string, unknown> = {
    ...inp, editError: null,
    free: { ...inp.free, fields },
    ...(b.colors ? { colors: cleanColors(b.colors) } : {}),
    ...(FREE_FONTS.includes(String(b.font)) ? { font: String(b.font) } : {}),
    ...(Array.isArray(b.contact) ? { contact: cleanContact(b.contact) } : {}),
    ...(typeof b.musicOn === "boolean" ? { music: b.musicOn } : {}),
    ...(typeof b.logoPath === "string" && (b.logoPath === "" || (b.logoPath.startsWith(`${user.id}/`) && !b.logoPath.includes(".."))) ? { logoPath: b.logoPath } : {}),
    ...(typeof b.logoOn === "boolean" ? { logoOn: b.logoOn } : {}),
    ...(b.logoBox && typeof b.logoBox === "object" ? { logoBox: { x: num((b.logoBox as Record<string, unknown>).x, 0.03, 0.97, 0.85), y: num((b.logoBox as Record<string, unknown>).y, 0.03, 0.97, 0.09), w: num((b.logoBox as Record<string, unknown>).w, 0.06, 0.7, 0.18) } } : {}),
    ...(typeof b.musicVol === "number" ? { musicVol: Math.max(0, Math.min(0.6, b.musicVol)) } : {}),
    ...(b.trim && typeof b.trim === "object" ? (() => {
      const total = Number(inp.cseconds ?? inp.seconds ?? 15), t = b.trim as Record<string, unknown>;
      const st = num(t.start, 0, Math.max(0, total - 2), 0), en = num(t.end, st + 2, total, total);
      return { trim: { start: +st.toFixed(2), end: +en.toFixed(2) } };
    })() : {}),
    ...("ownAudio" in b ? { ownAudio: cleanOwn(b.ownAudio, user.id) } : {}),
  };
  const since = new Date(Date.now() - 60 * 60_000).toISOString();

  if (action === "save") {
    await admin.from("jobs").update({ input: saved, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "done");
    return NextResponse.json({ ok: true });
  }

  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "free-motion").in("input->>mode", ["export", "revoice"]).gte("updated_at", since);
  if ((count ?? 0) >= 15) return NextResponse.json({ error: "عمليات كثيرة بوقت قصير. جرّب بعد شوي." }, { status: 429 });

  if (action === "revoice") {
    const oldN = inp.free.vo?.sentences ?? [];
    if (!oldN.length) return NextResponse.json({ error: "هذا التصميم بدون تعليق صوتي." }, { status: 400 });
    const newN = Array.isArray(b.narration) && b.narration.length === oldN.length ? b.narration.map((x) => clean(x, 220)) : oldN; // same number of sentences, so the picture keeps following the voice
    if (newN.some((x) => !x)) return NextResponse.json({ error: "جملة التعليق ما تنفع فاضية." }, { status: 400 });
    const g2 = await guardContent(user.id, newN.join(" "), "free-motion-edit");
    if (g2) return g2;
    const dialect = typeof b.dialect === "string" && b.dialect in DIALECT_NAME ? b.dialect : String(inp.dialect ?? "kuwaiti");
    const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
    const voices = ((vc?.value as { items?: VoiceItem[] })?.items ?? []);
    const { gender, age } = typeToGA(String(b.vtype ?? "auto"));
    const v = String(b.vtype ?? "") ? pickVoice(voices, { dialect, gender, age }) : voices.find((x) => x.id === (inp.voice as { id?: string } | undefined)?.id);
    const voice = v ? { id: v.id, ...(v.model ? { model: v.model } : {}), ...(v.settings ? { settings: v.settings } : {}) } : inp.voice;
    saved.mode = "revoice"; saved.narration = newN; saved.voice = voice; saved.dialect = dialect; saved.dialectLabel = DIALECT_NAME[dialect];
  } else saved.mode = "export";

  const { error } = await admin.from("jobs").update({ status: "queued", progress: 0, input: saved, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "done");
  if (error) return NextResponse.json({ error: "تعذّر بدء العملية." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
