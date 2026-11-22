import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { getFreeEngine } from "@/lib/server/freeEngine";
import { FX_IDS, FX_MAX_SECONDS } from "@/lib/fxStyles";

export const maxDuration = 30;
const TOOL = "free-montage";
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
/** what the customer reads when the worker stops a job (the feathers are already back) */
const WHY: Record<string, string> = {
  FX_NO_VIDEO: "ما قدرنا نقرأ الفيديو. ارفعه مرة ثانية بصيغة MP4.",
  FX_TOO_LONG: "الفيديو أطول من الحد المسموح حالياً.",
  FX_DURATION_MISMATCH: "مدة الفيديو أطول من اللي انحسب سعرها. ارفعه مرة ثانية.",
  FX_NO_SPEECH: "ما لقينا كلام واضح بالفيديو. المونتاج المبتكر يعتمد على كلام المتحدث.",
  FX_NO_PLAN: "ما قدرنا نطلع خطة مونتاج من هذا الفيديو. جرّب وصف أوضح.",
  FX_QUALITY: "الغرافيكس ما طلع بجودة كافية بعد محاولتين، فما سلّمناه.",
  WORKER_RESTARTED: "توقف التنفيذ بسبب تحديث بالنظام. ابدأ من جديد.",
};

/** «مونتاج مبتكر»: the customer's own video + his wishes become a job; the video worker listens, plans, writes the graphics layer and draws it over the video. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", TOOL).maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  // SECURITY: only a file of his own folder in the private uploads bucket (the worker checks again)
  const video = String(b.video ?? "");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov|webm)$/i.test(video) || !video.startsWith(`${user.id}/`) || video.includes("..")) return NextResponse.json({ error: "ارفع الفيديو أولاً." }, { status: 400 });
  const secs = Math.ceil(Number(b.seconds));
  if (!Number.isFinite(secs) || secs < 5) return NextResponse.json({ error: "الفيديو قصير جداً (أقل من 5 ثواني)." }, { status: 400 });
  if (secs > FX_MAX_SECONDS) return NextResponse.json({ error: `الحد الأقصى حالياً ${Math.round(FX_MAX_SECONDS / 60)} دقائق للفيديو.` }, { status: 400 });
  const fx = FX_IDS.includes(String(b.style)) ? String(b.style) : b.style === "desc" ? "desc" : "";
  if (!fx) return NextResponse.json({ error: "اختر ستايل المونتاج." }, { status: 400 });
  const styleDesc = fx === "desc" ? clean(b.styleDesc, 600) : "";
  if (fx === "desc" && styleDesc.length < 15) return NextResponse.json({ error: "اكتب وصف الستايل بتفصيل أكثر (جملة أو جملتين)." }, { status: 400 });
  const notes = clean(b.notes, 800);
  const blocked = await guardContent(user.id, `${notes} ${styleDesc}`, TOOL);
  if (blocked) return blocked;
  const eng = await getFreeEngine();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: today } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).gte("created_at", since);
  if ((today ?? 0) >= eng.dailyCap) return NextResponse.json({ error: "وصلت الحد اليومي لعدد المونتاجات، جرّب بكرة." }, { status: 429 });
  const { count: busy } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).in("status", ["queued", "running"]);
  if ((busy ?? 0) >= 1) return NextResponse.json({ error: "عندك مونتاج قيد التنفيذ. انتظر يخلص ثم ابدأ الثاني." }, { status: 429 });
  let colors: string[] = [];
  if (b.useIdentity !== false) {
    const { data: kit } = await admin.from("brand_kits").select("colors").eq("user_id", user.id).maybeSingle();
    colors = ((kit?.colors ?? []) as unknown[]).map((c) => String(c ?? "")).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 4);
  }
  const cost = Math.max(1, Math.ceil(secs / 60)) * tool.credit_cost;
  const input = { kind: "fx", mode: "new", video, seconds: secs, notes, fx, ...(styleDesc ? { styleDesc } : {}), captions: b.captions !== false, model: eng.model, ...(colors.length ? { colors } : {}) };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: TOOL, title: (notes || "مونتاج مبتكر").slice(0, 60), status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء المونتاج." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  return NextResponse.json({ jobId: job.id });
}

/** Polled by the page: the step and the progress while the montage is made, then the video. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,progress,error,input,output,title").eq("id", id).eq("user_id", user.id).eq("tool_id", TOOL).maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed") { const code = String(job.error ?? ""); return NextResponse.json({ status: "failed", error: WHY[code] ?? (/scribe|quota|429/i.test(code) ? "خدمة تفريغ الصوت غير متاحة حالياً. جرّب بعد شوي." : "ما اكتمل المونتاج.") }); }
  if (job.status !== "done") return NextResponse.json({ status: job.status, progress: job.progress ?? 0, step: job.status === "running" ? String(job.title ?? "") : "" });
  const path = String((job.output as { files?: { path?: string }[] } | null)?.files?.[0]?.path ?? "");
  // SECURITY: only a result inside his own folder is ever signed
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return NextResponse.json({ status: "failed", error: "ما لقينا الفيديو." });
  const [play, dl] = await Promise.all([admin.storage.from("results").createSignedUrl(path, 60 * 60 * 6), admin.storage.from("results").createSignedUrl(path, 60 * 60 * 6, { download: "shaheen-montage.mp4" })]);
  const inp = (job.input ?? {}) as { aspect?: string; cseconds?: number; fxr?: { missing?: number; cues?: unknown[] } };
  return NextResponse.json({ status: "done", title: job.title, aspect: inp.aspect ?? "9:16", seconds: inp.cseconds ?? 0, cues: Array.isArray(inp.fxr?.cues) ? inp.fxr!.cues!.length : 0, missing: inp.fxr?.missing ?? 0, videoUrl: play.data?.signedUrl ?? "", downloadUrl: dl.data?.signedUrl ?? "" });
}
