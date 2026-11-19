import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { signedResultUrls } from "@/lib/providers/storage";
import { FREE_FONTS, cleanColors, cleanContact } from "@/lib/server/freeMotion";
import { DIALECT_NAME, pickVoice, typeToGA, type VoiceItem } from "@/lib/voiceMatch";

export const maxDuration = 30;
const ASPECTS = ["9:16", "16:9", "1:1", "4:5"];
const FONTS = FREE_FONTS;

/** «تصميم مبتكر»: the customer's idea becomes a job; the video worker asks the AI to write the design, checks it and renders it. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const idea = String(b.idea ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (idea.length < 10) return NextResponse.json({ error: "اكتب فكرتك بتفصيل أكثر (جملتين على الأقل)." }, { status: 400 });
  const blocked = await guardContent(user.id, idea, "free-motion");
  if (blocked) return blocked;
  const aspect = ASPECTS.includes(String(b.aspect)) ? String(b.aspect) : "9:16";
  const seconds = [15, 30].includes(Number(b.seconds)) ? Number(b.seconds) : 15;
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", "free-motion").maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const { count: waiting } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "free-motion").in("status", ["queued", "running"]);
  if ((waiting ?? 0) >= 2) return NextResponse.json({ error: "عندك تصميمين قيد التنفيذ، انتظر لين يخلصون." }, { status: 429 });
  // "similar": the same design (its code is copied from the customer's own finished job), new words → cheaper
  let free: unknown = null;
  const from = typeof b.fromJob === "string" && /^[0-9a-f-]{36}$/i.test(b.fromJob) ? b.fromJob : "";
  if (from) {
    const { data: src } = await admin.from("jobs").select("input").eq("id", from).eq("user_id", user.id).eq("tool_id", "free-motion").eq("status", "done").maybeSingle();
    const f = (src?.input as { free?: { code?: string; title?: string; fields?: unknown[] } } | null)?.free;
    if (!f?.code) return NextResponse.json({ error: "ما لقينا التصميم الأصلي." }, { status: 404 });
    free = f;
  }
  // the narrator: the best registered voice for the dialect / gender / age the customer asked for
  const wantVoice = b.voiceover !== false;
  let voice: { id: string; model?: string; settings?: unknown } | null = null;
  const dialect = typeof b.dialect === "string" && b.dialect in DIALECT_NAME ? b.dialect : "kuwaiti";
  if (wantVoice) {
    const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
    const voices = ((vc?.value as { items?: VoiceItem[] })?.items ?? []);
    const { gender, age } = typeToGA(String(b.vtype ?? "auto"));
    const v = voices.some((x) => x.id === b.voice) ? voices.find((x) => x.id === b.voice) : pickVoice(voices, { dialect, gender, age });
    if (v) voice = { id: v.id, ...(v.model ? { model: v.model } : {}), ...(v.settings ? { settings: v.settings } : {}) };
  }
  const cost = from ? tool.edit_cost ?? 8 : Math.max(1, Math.round(seconds / 15)) * tool.credit_cost;
  const input = { kind: "free", mode: from ? "similar" : "new", voiceover: !!voice, voice, dialect, dialectLabel: DIALECT_NAME[dialect], music: b.music !== false, idea, aspect, seconds, brand: { name: String(b.brand ?? "").slice(0, 60) }, colors: cleanColors(b.colors), font: FONTS.includes(String(b.font)) ? String(b.font) : "Cairo", contact: cleanContact(b.contact), ...(free ? { free } : {}), ...(typeof b.logoPath === "string" && b.logoPath.startsWith(`${user.id}/`) && !b.logoPath.includes("..") ? { logoPath: b.logoPath } : {}) };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "free-motion", title: idea.slice(0, 60), status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء التصميم." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  return NextResponse.json({ jobId: job.id });
}

/** Polled by the page: progress, then the video and the editable fields. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const { data: job } = await createAdminClient().from("jobs").select("id,status,progress,error,input,output,title,created_at").eq("id", id).eq("user_id", user.id).eq("tool_id", "free-motion").maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed") return NextResponse.json({ status: "failed", error: "ما قدرنا نكمل هذا التصميم. تم إرجاع ريشك، جرّب فكرة أبسط أو القوالب الجاهزة." });
  if (job.status !== "done") return NextResponse.json({ status: job.status, progress: job.progress ?? 0, rerender: (job.input as { mode?: string })?.mode === "rerender" });
  const inp = (job.input ?? {}) as { voiceover?: boolean; free?: { fields?: unknown[]; title?: string; vo?: { sentences?: string[] } }; colors?: unknown; font?: string; contact?: unknown; aspect?: string; seconds?: number; idea?: string; editError?: string; brand?: { name?: string } };
  const out = (job.output ?? {}) as { files?: { path: string }[]; thumb?: string };
  const paths = [out.files?.[0]?.path, out.thumb].filter((x): x is string => !!x && x.startsWith(`${user.id}/`));
  const urls = await signedResultUrls(paths, 60 * 60 * 3);
  return NextResponse.json({
    status: "done", title: job.title, voiceover: !!inp.voiceover, narration: Array.isArray(inp.free?.vo?.sentences) ? inp.free!.vo!.sentences : [], video: urls[0] ?? "", aspect: inp.aspect ?? "9:16", seconds: inp.seconds ?? 15, idea: inp.idea ?? "", editError: inp.editError ? "تعذّر تطبيق التعديل، وبقي الفيديو السابق." : "",
    fields: Array.isArray(inp.free?.fields) ? inp.free!.fields : [], colors: cleanColors(inp.colors), font: inp.font ?? "Cairo", contact: cleanContact(inp.contact), brand: inp.brand?.name ?? "",
  });
}
