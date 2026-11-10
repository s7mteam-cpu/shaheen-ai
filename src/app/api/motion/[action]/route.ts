import { NextResponse } from "next/server";
import { box } from "@/design/spec";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson, speechReady } from "@/lib/providers/text";
import { music, tts } from "@/lib/providers/elevenlabs";
import { saveResult, signedResultUrls } from "@/lib/providers/storage";
import { brandHint, config, voiceById } from "@/lib/tools/run";
import { ICONS, normalise, type Aspect, type MotionSpec } from "@/remotion/spec";

export const maxDuration = 300;

const SYSTEM = `أنت مخرج موشن جرافيك خليجي محترف. تحوّل فكرة العميل إلى فيديو قصير للسوشال ميديا مكوّن من مشاهد.
أنواع المشاهد المتاحة فقط (type):
- intro: { icon, kicker?, title, subtitle? } افتتاحية قوية. title من 2-4 كلمات.
- statement: { text } جملة واحدة مؤثرة (حتى 12 كلمة).
- myth: { myth, fact } خرافة شائعة ثم الحقيقة (كل واحدة حتى 14 كلمة).
- points: { title, items: [{icon, label}] } من 2 إلى 4 نقاط، label كلمة أو كلمتين.
- stat: { value (رقم صحيح), suffix? ("%" أو "+" أو "x"), label } رقم لافت حقيقي ومنطقي.
- cta: { title, subtitle? (حساب أو رقم أو موقع إن وُجد), button? } دعوة لاتخاذ إجراء.
الأيقونات المتاحة فقط: ${ICONS.join(", ")}.
القواعد: النصوص قصيرة جداً وواضحة على الجوال. أول مشهد intro وآخر مشهد cta. لا تخترع أرقام هواتف أو حسابات لم يذكرها العميل.
اختر 5 ألوان hex متناسقة تناسب الموضوع والهوية: bg (خلفية غامقة غالباً)، bg2 (أغمق منها)، text (عالي التباين مع الخلفية)، accent (لون مميز)، accent2 (لون تنبيه مختلف).
اختر font من: Cairo, Tajawal, Almarai, Changa, Amiri.`;

const lengths = [15, 30, 60];
const aspects: Aspect[] = ["9:16", "1:1", "16:9"];
const sceneCount = (sec: number) => (sec <= 15 ? "3-4" : sec <= 30 ? "5-6" : "7-8");

type Body = { jobId?: string; idea?: string; seconds?: number; aspect?: Aspect; dialect?: string; brand?: string; spec?: MotionSpec; instruction?: string; prompt?: string; text?: string; voice?: string };

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Body;
  const admin = createAdminClient();

  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", "motion-video").single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });

  async function charge(jobId: string, amount: number) {
    if (amount <= 0) return null;
    const { error } = await admin.rpc("spend_credits", { p_user: user!.id, p_amount: amount, p_job: jobId });
    if (!error) return null;
    return NextResponse.json({ error: error.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
  }
  const writer = async () => { const c = await config("motion-video"); return { provider: c.provider === "gemini" ? "gemini" : "claude", model: c.model }; };
  // Arabic JSON is token-heavy: give room, and retry once if the answer comes back cut or malformed.
  async function writeJson(user: string) {
    const via = await writer();
    try { return await aiJson<Partial<MotionSpec>>(SYSTEM, user, 8000, via); }
    catch (first) { console.error("motion json retry", first); return await aiJson<Partial<MotionSpec>>(SYSTEM, user + "\nمهم: أعد JSON صالح ومكتمل فقط، ونصوص قصيرة.", 8000, via); }
  }

  // ---- New video: write the scenes ----
  if (action === "script") {
    const idea = String(body.idea ?? "").trim().slice(0, 1200);
    const seconds = lengths.includes(Number(body.seconds)) ? Number(body.seconds) : 30;
    const aspect = aspects.includes(body.aspect as Aspect) ? (body.aspect as Aspect) : "9:16";
    if (idea.length < 5) return NextResponse.json({ error: "اكتب فكرة الفيديو." }, { status: 400 });

    const { data: job, error } = await admin.from("jobs")
      .insert({ user_id: user.id, tool_id: "motion-video", title: idea.slice(0, 80), status: "draft", input: { idea, seconds, aspect } })
      .select("id").single();
    if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
    const denied = await charge(job.id, Math.max(1, Math.round(seconds / 15)) * tool.credit_cost);
    if (denied) { await admin.from("jobs").delete().eq("id", job.id); return denied; }

    try {
      const raw = await writeJson(
        `الفكرة: ${idea}\nاسم النشاط: ${body.brand || "غير محدد"}\nاللهجة: ${body.dialect || "خليجية"}\nالمدة: ${seconds} ثانية، عدد المشاهد: ${sceneCount(seconds)}.\n${await brandHint(user.id)}\n` +
        `أعد JSON بالشكل: { "font": "...", "brand": "اسم النشاط أو اتركه فارغاً", "colors": {...}, "scenes": [...] }`);
      const spec = normalise(raw, { aspect, seconds });
      if (!body.brand && !raw.brand) spec.brand = undefined;
      await admin.from("jobs").update({ input: { idea, seconds, aspect, spec } }).eq("id", job.id);
      return NextResponse.json({ jobId: job.id });
    } catch (e) {
      console.error("motion script", e);
      await admin.from("jobs").update({ status: "failed", error: `script: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
      await admin.rpc("refund_job", { p_job: job.id });
      return NextResponse.json({ error: "ما قدرنا نكتب الفيديو الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
    }
  }

  // ---- Everything else works on the user's own draft ----
  const { data: job } = await admin.from("jobs").select("id,user_id,status,input").eq("id", String(body.jobId)).single();
  if (!job || job.user_id !== user.id) return NextResponse.json({ error: "المشروع غير موجود." }, { status: 404 });
  if (job.status !== "draft") return NextResponse.json({ error: "هذا الفيديو انرسل للتصدير، ابدأ فيديو جديد." }, { status: 400 });
  const base = { aspect: job.input.aspect as Aspect, seconds: Number(job.input.seconds) };
  const keepMedia = (s: MotionSpec, from?: MotionSpec): MotionSpec => ({ ...s, music: from?.music ?? null, voice: from?.voice ?? null, logo: from?.logo ?? null });

  if (action === "revise") {
    const instruction = String(body.instruction ?? "").trim().slice(0, 600);
    if (!instruction || !body.spec) return NextResponse.json({ error: "اكتب التعديل المطلوب." }, { status: 400 });
    const denied = await charge(job.id, tool.edit_cost);
    if (denied) return denied;
    try {
      const current = { ...body.spec, music: undefined, voice: undefined };
      const raw = await writeJson(
        `هذا الفيديو الحالي:\n${JSON.stringify(current)}\n\nطلب العميل: ${instruction}\nطبّق الطلب فقط وحافظ على الباقي. المدة ${base.seconds} ثانية. أعد JSON كامل بنفس الشكل.`);
      const spec = keepMedia(normalise({ ...raw, brand: raw.brand ?? current.brand }, base), body.spec);
      await admin.from("jobs").update({ input: { ...job.input, spec } }).eq("id", job.id);
      return NextResponse.json({ spec });
    } catch (e) {
      console.error("motion revise", e);
      await admin.rpc("grant_credits", { p_user: user.id, p_amount: tool.edit_cost, p_reason: "refund: motion revise", p_ref: `${job.id}:${Date.now()}` }).then(() => null, () => null);
      return NextResponse.json({ error: "ما ضبط التعديل، ورجّعنا لك الريش. جرّب تكتبه بطريقة ثانية." }, { status: 502 });
    }
  }

  if (action === "music" || action === "voice") {
    const denied = await charge(job.id, tool.edit_cost);
    if (denied) return denied;
    try {
      let audio: ArrayBuffer;
      if (action === "music") {
        const prompt = String(body.prompt ?? "").slice(0, 300);
        audio = await music(`Instrumental background music for a short social media video, no vocals. ${prompt}`, Math.min(base.seconds + 2, 62));
      } else {
        const text = String(body.text ?? "").trim().slice(0, 1500);
        if (!text) return NextResponse.json({ error: "اكتب نص التعليق." }, { status: 400 });
        const vv = await voiceById(String(body.voice ?? ""));
        audio = await tts(await speechReady(text), vv.eleven, vv.model, vv.settings);
      }
      const path = await saveResult(user.id, job.id, audio, "audio/mpeg", "mp3");
      const [url] = await signedResultUrls([path], 60 * 60 * 24 * 7);
      return NextResponse.json({ url });
    } catch (e) {
      console.error("motion media", e);
      await admin.rpc("grant_credits", { p_user: user.id, p_amount: tool.edit_cost, p_reason: `refund: motion ${action}`, p_ref: `${job.id}:${Date.now()}` }).then(() => null, () => null);
      // Admins see the technical reason to fix setup issues (keys, voice ids, plan limits).
      const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
      const why = me?.role === "admin" ? ` [${String(e instanceof Error ? e.message : e).slice(0, 220)}]` : "";
      return NextResponse.json({ error: `ما ضبط، ورجّعنا لك الريش. حاول مرة ثانية.${why}` }, { status: 502 });
    }
  }

  if (action === "export") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه فيديو." }, { status: 400 });
    const spec = normalise(body.spec, base);
    // audio must be files we produced for this user
    const own = (u?: string) => !!u && /\/storage\/v1\/object\/sign\/results\//.test(u) && u.includes(`/${user.id}/`);
    const lib = await admin.from("site_content").select("value").eq("key", "motion_music").maybeSingle();
    const tracks = ((lib.data?.value as { items?: { url: string }[] })?.items ?? []).map((t) => t.url);
    spec.music = body.spec.music && (own(body.spec.music.url) || tracks.includes(body.spec.music.url)) ? body.spec.music : null;
    spec.voice = body.spec.voice && own(body.spec.voice.url) ? body.spec.voice : null;
    // the logo is one of the customer's uploads; the worker signs a fresh link at render time
    const lg = body.spec.logo, lb = box(lg?.box);
    spec.logo = lg?.on && typeof lg.path === "string" && lg.path.startsWith(`${user.id}/`) && lb ? { path: lg.path, url: "", on: true, box: lb } : null;
    const title = (spec.scenes[0] && "title" in spec.scenes[0] ? spec.scenes[0].title : job.input.idea) as string;
    await admin.from("jobs").update({ status: "queued", title: String(title).slice(0, 80), input: { ...job.input, spec, render: true }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
}
