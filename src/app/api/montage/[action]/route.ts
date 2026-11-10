import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson } from "@/lib/providers/text";
import { music } from "@/lib/providers/elevenlabs";
import { saveResult, signedResultUrls } from "@/lib/providers/storage";
import { config } from "@/lib/tools/run";
import { captionLines, videoSeconds, type MontageSpec } from "@/remotion/montage";

export const maxDuration = 300;

const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];

type Body = { jobId?: string; spec?: MontageSpec; instruction?: string; prompt?: string; seconds?: number };

/** Only the parts the customer may change; cuts, words and the source stay as the worker planned them. */
function sanitize(base: MontageSpec, s: Partial<MontageSpec>): MontageSpec {
  const len = videoSeconds(base);
  return {
    ...base,
    font: FONTS.includes(String(s.font)) ? String(s.font) : base.font,
    colors: { text: hex(s.colors?.text, base.colors.text), accent: hex(s.colors?.accent, base.colors.accent), bg: hex(s.colors?.bg, base.colors.bg) },
    captions: {
      on: s.captions?.on ?? base.captions.on,
      style: ["karaoke", "box", "minimal"].includes(String(s.captions?.style)) ? s.captions!.style : base.captions.style,
      pos: ["bottom", "middle", "top"].includes(String(s.captions?.pos)) ? s.captions!.pos : base.captions.pos ?? "bottom",
    },
    titles: (Array.isArray(s.titles) ? s.titles : base.titles).slice(0, 15).map((t) => ({
      text: String(t.text ?? "").slice(0, 60), at: clamp(Number(t.at) || 0, 0, Math.max(0, len - 0.5)), dur: clamp(Number(t.dur) || 2.5, 1, 6), pos: t.pos === "center" ? "center" as const : "top" as const,
    })).filter((t) => t.text),
    zooms: (Array.isArray(s.zooms) ? s.zooms : base.zooms).slice(0, 15).map((z) => ({ at: clamp(Number(z.at) || 0, 0, len), dur: clamp(Number(z.dur) || 2, 0.5, 6), scale: clamp(Number(z.scale) || 1.15, 1.02, 1.35) })),
    intro: { on: !!(s.intro?.on ?? base.intro.on), title: String(s.intro?.title ?? base.intro.title).slice(0, 60), subtitle: String(s.intro?.subtitle ?? base.intro.subtitle).slice(0, 60) },
    outro: { on: !!(s.outro?.on ?? base.outro.on), title: String(s.outro?.title ?? base.outro.title).slice(0, 60), subtitle: String(s.outro?.subtitle ?? base.outro.subtitle).slice(0, 60) },
    music: s.music === undefined ? base.music ?? null : s.music,
    transition: ["none", "flash", "zoom"].includes(String(s.transition)) ? s.transition : base.transition ?? "none",
    logo: base.logo ? { ...base.logo, url: "", on: s.logo?.on ?? base.logo.on, pos: ["tl", "tr", "bl", "br"].includes(String(s.logo?.pos)) ? s.logo!.pos : base.logo.pos } : null,
    emojis: (Array.isArray(s.emojis) ? s.emojis : base.emojis ?? []).slice(0, 12).map((x) => ({ e: String(x.e ?? "").slice(0, 4), at: clamp(Number(x.at) || 0, 0, Math.max(0, len - 0.3)), dur: clamp(Number(x.dur) || 1.5, 0.6, 4) })).filter((x) => x.e),
    sfx: typeof s.sfx === "boolean" ? s.sfx : base.sfx ?? false,
    progress: typeof s.progress === "boolean" ? s.progress : base.progress ?? false,
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Body;
  const admin = createAdminClient();

  const { data: job } = await admin.from("jobs").select("id,user_id,status,input").eq("id", String(body.jobId)).single();
  if (!job || job.user_id !== user.id) return NextResponse.json({ error: "المشروع غير موجود." }, { status: 404 });
  if (job.status !== "draft" || !job.input?.spec) return NextResponse.json({ error: "هذا الفيديو انرسل للتصدير، ابدأ مونتاج جديد." }, { status: 400 });
  const base = job.input.spec as MontageSpec;
  const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", "video-editing").single();
  const cost = Math.max(0, tool?.edit_cost ?? 3);

  async function charge() {
    if (cost <= 0) return null;
    const { error } = await admin.rpc("spend_credits", { p_user: user!.id, p_amount: cost, p_job: job!.id });
    if (!error) return null;
    return NextResponse.json({ error: error.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
  }
  const refund = (why: string) => admin.rpc("grant_credits", { p_user: user.id, p_amount: cost, p_reason: `refund: montage ${why}`, p_ref: `${job.id}:${Date.now()}` }).then(() => null, () => null);

  if (action === "revise") {
    const instruction = String(body.instruction ?? "").trim().slice(0, 600);
    if (!instruction || !body.spec) return NextResponse.json({ error: "اكتب التعديل المطلوب." }, { status: 400 });
    const denied = await charge();
    if (denied) return denied;
    try {
      const current = sanitize(base, body.spec);
      const said = captionLines(current).map((l) => `[${l[0].s.toFixed(1)}] ${l.map((w) => w.t).join(" ")}`).join("\n").slice(0, 6000);
      const c = await config("video-editing");
      const via = c.provider === "google" ? { provider: "gemini", model: "gemini-2.5-pro" } : { provider: "claude", model: "claude-sonnet-5-5" };
      const raw = await aiJson<Partial<MontageSpec>>(
        "أنت مونتير ريلز خليجي محترف. تعدّل خطة مونتاج JSON حسب طلب العميل. الأوقات بالثواني على الفيديو النهائي (بدون بطاقة البداية). أعد JSON بنفس المفاتيح: font, colors{text,accent,bg}, captions{on,style,pos}, titles[{text,at,dur,pos}], zooms[{at,dur,scale}], intro{on,title,subtitle}, outro{on,title,subtitle}, transition (none|flash|zoom), emojis[{e,at,dur}], sfx (true/false مؤثرات صوتية), progress (true/false شريط تقدّم), logo{on,pos: tl|tr|bl|br}. العناوين قصيرة جداً ومن مضمون الكلام. الخطوط المتاحة: Cairo, Tajawal, Almarai, Changa, Amiri. أنماط الترجمة: karaoke, box, minimal. مكان الترجمة captions.pos: bottom (تحت), middle (الوسط), top (فوق). إذا طلب العميل تغيير مكان الترجمة غيّر captions.pos ولا تضف عناوين بدلها. إذا كانت الترجمة بالوسط فخلّ العناوين المتحركة فوق (pos: top).",
        `مدة الفيديو: ${videoSeconds(current).toFixed(1)} ثانية.\nالكلام بالتوقيت:\n${said}\n\nالخطة الحالية:\n${JSON.stringify({ font: current.font, colors: current.colors, captions: current.captions, titles: current.titles, zooms: current.zooms, intro: current.intro, outro: current.outro, transition: current.transition, emojis: current.emojis, sfx: current.sfx, progress: current.progress, logo: current.logo ? { on: current.logo.on, pos: current.logo.pos } : null })}\n\nطلب العميل: ${instruction}\nطبّق الطلب فقط وحافظ على الباقي.`,
        6000, via);
      const spec = sanitize(current, raw);
      await admin.from("jobs").update({ input: { ...job.input, spec: { ...spec, src: "" } } }).eq("id", job.id);
      return NextResponse.json({ spec: { ...spec, src: "", words: [] } });
    } catch (e) {
      console.error("montage revise", e);
      await refund("revise");
      return NextResponse.json({ error: "ما ضبط التعديل، ورجّعنا لك الريش. جرّب تكتبه بطريقة ثانية." }, { status: 502 });
    }
  }

  if (action === "music") {
    const denied = await charge();
    if (denied) return denied;
    try {
      const prompt = String(body.prompt ?? "").slice(0, 300);
      const audio = await music(`Soft instrumental background music to sit under speech in a social media video, no vocals, low energy peaks. ${prompt}`, clamp(Math.round(Number(body.seconds) || 30), 10, 120));
      const path = await saveResult(user.id, job.id, audio, "audio/mpeg", "mp3");
      const [url] = await signedResultUrls([path], 60 * 60 * 24 * 7);
      return NextResponse.json({ url });
    } catch (e) {
      console.error("montage music", e);
      await refund("music");
      return NextResponse.json({ error: "ما ضبطت الموسيقى، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
    }
  }

  if (action === "export") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه فيديو." }, { status: 400 });
    const spec = sanitize(base, body.spec);
    const own = (u?: string) => !!u && /\/storage\/v1\/object\/sign\/results\//.test(u) && u.includes(`/${user.id}/`);
    const lib = await admin.from("site_content").select("value").eq("key", "motion_music").maybeSingle();
    const tracks = ((lib.data?.value as { items?: { url: string }[] })?.items ?? []).map((t) => t.url);
    spec.music = body.spec.music && (own(body.spec.music.url) || tracks.includes(body.spec.music.url)) ? body.spec.music : null;
    await admin.from("jobs").update({ status: "queued", progress: 0, input: { ...job.input, spec: { ...spec, src: "" }, render: true }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
}
