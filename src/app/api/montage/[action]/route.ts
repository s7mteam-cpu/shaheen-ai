import { NextResponse } from "next/server";
import { box } from "@/design/spec";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson, speechReady } from "@/lib/providers/text";
import { music, ttsTimed, type VoiceSettings } from "@/lib/providers/elevenlabs";
import { saveResult, signedResultUrls } from "@/lib/providers/storage";
import { config } from "@/lib/tools/run";
import { PLAYBOOK, PLAYBOOK_RULES, playbookText } from "@/remotion/playbook";
import { BOARD_STYLES, CAPTION_STYLES, GRADES, ICONS, LAYOUTS, TITLE_STYLES, TRANSITIONS, captionLines, cleanGraphics, videoSeconds, type MontageSpec } from "@/remotion/montage";

const ok = <T extends string>(list: [T, string][], v: unknown): T | undefined => list.find((x) => x[0] === v)?.[0];

export const maxDuration = 300;

const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];

type Body = { jobId?: string; spec?: MontageSpec; instruction?: string; prompt?: string; seconds?: number; text?: string; voice?: string; dialect?: string };


/** Only the parts the customer may change; cuts, words and the source stay as the worker planned them. */
function sanitize(base: MontageSpec, s: Partial<MontageSpec>, userId = ""): MontageSpec {
  const len = videoSeconds(base);
  return {
    ...base,
    font: FONTS.includes(String(s.font)) ? String(s.font) : base.font,
    colors: { text: hex(s.colors?.text, base.colors.text), accent: hex(s.colors?.accent, base.colors.accent), bg: hex(s.colors?.bg, base.colors.bg) },
    captions: {
      on: s.captions?.on ?? base.captions.on,
      style: ok(CAPTION_STYLES, s.captions?.style) ?? base.captions.style,
      pos: ["bottom", "middle", "top"].includes(String(s.captions?.pos)) ? s.captions!.pos : base.captions.pos ?? "bottom",
    },
    titles: (Array.isArray(s.titles) ? s.titles : base.titles).slice(0, 15).map((t) => ({
      text: String(t.text ?? "").slice(0, 60), at: clamp(Number(t.at) || 0, 0, Math.max(0, len - 0.5)), dur: clamp(Number(t.dur) || 2.5, 1, 6), pos: t.pos === "center" ? "center" as const : "top" as const,
      style: ok(TITLE_STYLES, t.style) ?? "pill",
      hl: t.hl ? String(t.hl).slice(0, 30) : undefined, sub: t.sub ? String(t.sub).slice(0, 50) : undefined,
    })).filter((t) => t.text),
    drift: typeof s.drift === "boolean" ? s.drift : base.drift ?? false,
    vignette: typeof s.vignette === "boolean" ? s.vignette : base.vignette ?? false,
    layout: base.layout === "board" ? "board" : ok(LAYOUTS, s.layout) ?? base.layout ?? "full",
    domain: PLAYBOOK.some((d) => d.id === s.domain) ? s.domain : base.domain,
    quality: s.quality === "4k" || s.quality === "1080" ? s.quality : base.quality ?? "1080",
    panel: s.panel === "dark" || s.panel === "light" ? s.panel : base.panel ?? "light",
    board: ok(BOARD_STYLES, s.board) ?? base.board,
    graphics: cleanGraphics(Array.isArray(s.graphics) ? s.graphics : base.graphics ?? [], len),
    zooms: (Array.isArray(s.zooms) ? s.zooms : base.zooms).slice(0, 15).map((z) => ({ at: clamp(Number(z.at) || 0, 0, len), dur: clamp(Number(z.dur) || 2, 0.5, 6), scale: clamp(Number(z.scale) || 1.15, 1.02, 1.35) })),
    intro: { on: !!(s.intro?.on ?? base.intro.on), title: String(s.intro?.title ?? base.intro.title).slice(0, 60), subtitle: String(s.intro?.subtitle ?? base.intro.subtitle).slice(0, 60) },
    outro: { on: !!(s.outro?.on ?? base.outro.on), title: String(s.outro?.title ?? base.outro.title).slice(0, 60), subtitle: String(s.outro?.subtitle ?? base.outro.subtitle).slice(0, 60) },
    music: s.music === undefined ? base.music ?? null : s.music === null ? null : base.music?.path && s.music.name === base.music.name ? { ...base.music, url: "" } : s.music,
    face: base.face ?? [],
    track: typeof s.track === "boolean" ? s.track && (base.face ?? []).length > 0 : base.track ?? false,
    grade: ok(GRADES, s.grade) ?? base.grade ?? "none",
    autoBright: base.autoBright ?? 1,
    videoVolume: typeof s.videoVolume === "number" ? clamp(s.videoVolume, 0, 1) : base.videoVolume ?? 1,
    vo: s.vo === null ? null : base.vo ? { ...base.vo, url: "", on: s.vo ? !!s.vo.on : base.vo.on } : null,
    transition: ok(TRANSITIONS, s.transition) ?? base.transition ?? "none",
    logo: (() => {
      // the customer may add their own logo in the studio (an upload of theirs), move and resize it
      const path = s.logo?.path && userId && s.logo.path.startsWith(`${userId}/`) ? s.logo.path : base.logo?.path;
      if (!path) return null;
      const pos = ["tl", "tr", "bl", "br"].includes(String(s.logo?.pos)) ? s.logo!.pos : base.logo?.pos ?? "tr";
      const fb = s.logo && "box" in s.logo ? box(s.logo.box) : base.logo?.box ?? null;
      return { path, url: "", on: s.logo?.on ?? base.logo?.on ?? true, pos, box: fb };
    })(),
    emojis: (Array.isArray(s.emojis) ? s.emojis : base.emojis ?? []).slice(0, 12).map((x) => ({ e: String(x.e ?? "").slice(0, 4), at: clamp(Number(x.at) || 0, 0, Math.max(0, len - 0.3)), dur: clamp(Number(x.dur) || 1.5, 0.6, 4) })).filter((x) => x.e),
    sfx: typeof s.sfx === "boolean" ? s.sfx : base.sfx ?? false,
    progress: typeof s.progress === "boolean" ? s.progress : base.progress ?? false,
    broll: (Array.isArray(s.broll) ? s.broll : base.broll ?? [])
      .filter((b) => typeof b.path === "string" && (b.path.startsWith(`${userId}/`) || (base.broll ?? []).some((x) => x.path === b.path)))
      .slice(0, 12).map((b) => ({ path: b.path, url: "", at: clamp(Number(b.at) || 0, 0, Math.max(0, len - 1)), dur: clamp(Number(b.dur) || 2.5, 1, 6) })),
    subs2: s.subs2 === null ? null : s.subs2 ?? base.subs2
      ? { lang: String((s.subs2 ?? base.subs2)!.lang).slice(0, 5), on: !!(s.subs2 ?? base.subs2)!.on, lines: ((s.subs2 ?? base.subs2)!.lines ?? []).slice(0, 400).map((l) => ({ s: Number(l.s) || 0, e: Number(l.e) || 0, t: String(l.t ?? "").slice(0, 200) })) }
      : null,
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
  const refund = (why: string) => admin.rpc("grant_credits", { p_user: user.id, p_amount: cost, p_reason: "refund", p_ref: `montage-${why}:${job.id}:${Date.now()}` }).then(() => null, () => null);

  if (action === "revise") {
    const instruction = String(body.instruction ?? "").trim().slice(0, 600);
    if (!instruction || !body.spec) return NextResponse.json({ error: "اكتب التعديل المطلوب." }, { status: 400 });
    const denied = await charge();
    if (denied) return denied;
    try {
      const current = sanitize(base, body.spec, user.id);
      const said = captionLines(current).map((l) => `[${l[0].s.toFixed(1)}] ${l.map((w) => w.t).join(" ")}`).join("\n").slice(0, 6000);
      const c = await config("video-editing");
      const via = c.provider === "google" ? { provider: "gemini", model: "gemini-2.5-pro" } : { provider: "claude", model: "claude-sonnet-5-5" };
      const raw = await aiJson<Partial<MontageSpec>>(
        `أنت مونتير ريلز خليجي محترف. تعدّل خطة مونتاج JSON حسب طلب العميل. الأوقات بالثواني على الفيديو النهائي (بدون بطاقة البداية). أعد JSON بنفس المفاتيح: font, colors{text,accent,bg}, captions{on,style,pos}, titles[{text,at,dur,pos,style: kinetic|editorial|pill|lower|marker (قلم تظليل على الكلمة hl)|typewriter (آلة كاتبة), hl (كلمة تتلوّن), sub (سطر صغير)}], zooms[{at,dur,scale}], intro{on,title,subtitle}, outro{on,title,subtitle}, transition (${TRANSITIONS.map((x) => `${x[0]} ${x[1]}`).join(" | ")}), drift (true/false حركة تكبير بطيئة سينمائية), vignette (true/false حواف داكنة), emojis[{e,at,dur}], sfx (true/false مؤثرات صوتية), progress (true/false شريط تقدّم), logo{on,pos: tl|tr|bl|br}, grade (ستايل الألوان: ${GRADES.map((x) => `${x[0]} ${x[1]}`).join(" | ")}), videoVolume (0..1 صوت الفيديو الأصلي، 0 صامت), layout (شكل الفيديو: ${LAYOUTS.map((x) => `${x[0]} ${x[1]}`).join(" | ")}), quality (1080 | 4k), panel (light فاتح | dark داكن، لون لوحة الرسوم), board (خلفية اللوحة: ${BOARD_STYLES.map((x) => `${x[0]} ${x[1]}`).join(" | ")}), graphics[مشاهد متحركة] كل مشهد {kind, at, dur, ...}: headline{text,hl,sub} عنوان كبير كلمة كلمة | timer{text,hl,sub} ساعة تدور (لما يذكر وقت أو سرعة) | counter{value,suffix,text} رقم يعدّ (لما يذكر رقم أو نسبة) | steps{text,items[{label,icon}]} خطوات مرقمة | checklist{text,items[{label}]} قائمة صح | compare{text,bad,good} خطأ مقابل صح | icon{icon أو emoji,text,sub} أيقونة كبيرة مع جملة | flow{items[{icon,label}] 2-3,text} أيقونات بينها أسهم (مثلاً فكرة ← أداة ← نتيجة) | bars{text,suffix,items[{label,value}] 2-5} رسم أعمدة | donut{value 0-100,text} دائرة نسبة | line{text,values[أرقام]} خط صاعد أو نازل | quote{text,sub (القائل)} اقتباس | arrow{text} سهم يأشّر تحت (مثل: الرابط تحت، تابعني). وللتعليم: definition{text المصطلح,sub المعنى,hl كلمة صغيرة فوق مثل "تعريف"} | quiz{text السؤال,items[{label}] 2-4 اختيارات,value رقم الجواب الصح من 1} | truefalse{text العبارة,value 1 صح أو 0 خطأ,sub التوضيح} | timeline{text,items[{label,icon}] 3-5 بالترتيب} | cycle{text,items[{label,icon}] 3-5 مراحل تتكرر} | mindmap{text الفكرة الرئيسية,items[{label,icon}] 3-6 فروع} | proscons{text,items[{label,value 1 ميزة أو 0 عيب}]} | equation{text معادلة بمسافات بين الرموز مثل "2 + 3 = 5",sub} | fraction{values[البسط,المقام],text} | vocab{text الكلمة,hl النطق,sub المعنى,good جملة مثال} | pyramid{text,items[{label}] من القاعدة للقمة 3-5} | table{text العنوان,items[{label: "البند: القيمة"}] 2-6} | fillblank{text جملة فيها ___ مكان الفراغ,good الجواب,sub}. headline و quote و arrow تقبل fx: marker (تظليل) | circle (دائرة مرسومة حول الكلمة hl) | underline (خط تحت) | typewriter (تنكتب حرف حرف). الأيقونات المتاحة: ${ICONS.join(", ")}. المشاهد تطلع بنفس لحظة الكلام عنها (at = وقت بداية الجملة) ومدتها مثل مدة الجملة (2-5 ثواني)، ولا تتداخل مع بعض ولا مع العناوين. إذا طلب العميل "حط فوق كذا" أو شكل معيّن عند كلمة معيّنة، أضف مشهد بالنوع المناسب عند وقت هالكلمة من الكلام بالتوقيت. إذا طلب شاشة مقسومة أو "رسوم فوق وأنا تحت" غيّر layout إلى split، و"خلني بدائرة" circle، و"بالزاوية" corner، و"لما يطلع رسم صغّرني" dynamic. العناوين قصيرة جداً ومن مضمون الكلام. الخطوط المتاحة: Cairo, Tajawal, Almarai, Changa, Amiri. أنماط الترجمة: ${CAPTION_STYLES.map((x) => `${x[0]} ${x[1]}`).join(" | ")}. مكان الترجمة captions.pos: bottom (تحت), middle (الوسط), top (فوق). إذا طلب العميل تغيير مكان الترجمة غيّر captions.pos ولا تضف عناوين بدلها. إذا كانت الترجمة بالوسط فخلّ العناوين المتحركة فوق (pos: top). أضف "domain" (id المجال). إذا طلب العميل شي عام مثل «خلّه احترافي» أو «سوّه مثل فيديوهات المطاعم» استخدم دليل المجال.\n\n${PLAYBOOK_RULES}\n${playbookText()}`,
        `مدة الفيديو: ${videoSeconds(current).toFixed(1)} ثانية.\nالكلام بالتوقيت:\n${said}\n\nالخطة الحالية:\n${JSON.stringify({ font: current.font, colors: current.colors, captions: current.captions, drift: current.drift, vignette: current.vignette, titles: current.titles, zooms: current.zooms, intro: current.intro, outro: current.outro, transition: current.transition, emojis: current.emojis, sfx: current.sfx, progress: current.progress, grade: current.grade, videoVolume: current.videoVolume, domain: current.domain ?? "", layout: current.layout ?? "full", quality: current.quality ?? "1080", panel: current.panel ?? "light", board: current.board ?? "soft", graphics: current.graphics ?? [], logo: current.logo ? { on: current.logo.on, pos: current.logo.pos } : null })}\n\nطلب العميل: ${instruction}\nطبّق الطلب فقط وحافظ على الباقي.`,
        6000, via);
      const spec = sanitize(current, { ...raw, broll: current.broll, subs2: current.subs2 }, user.id);
      await admin.from("jobs").update({ input: { ...job.input, spec: { ...spec, src: "" } } }).eq("id", job.id);
      return NextResponse.json({ spec: { ...spec, src: "", words: [] } });
    } catch (e) {
      console.error("montage revise", e);
      await refund("revise");
      return NextResponse.json({ error: "ما ضبط التعديل، ورجّعنا لك الريش. جرّب تكتبه بطريقة ثانية." }, { status: 502 });
    }
  }

  if (action === "translate") {
    const lang = String((body as { lang?: string }).lang ?? "en").slice(0, 5);
    const names: Record<string, string> = { en: "English", fr: "French", ur: "Urdu", hi: "Hindi", tl: "Filipino (Tagalog)" };
    if (!names[lang] || !body.spec) return NextResponse.json({ error: "اختر اللغة." }, { status: 400 });
    const denied = await charge();
    if (denied) return denied;
    try {
      const current = sanitize(base, body.spec, user.id);
      const lines = captionLines(current);
      const src = lines.map((l, i) => `${i + 1}. ${l.map((w) => w.t).join(" ")}`).join("\n");
      const out = await aiJson<string[]>(
        `You translate Arabic (often Gulf dialect) video subtitles into natural, short ${names[lang]} subtitles. Keep meaning, not word order. One translation per numbered line, same count and order. Return a JSON array of strings only.`,
        src, 8000, { provider: "claude", model: "claude-haiku-5-5" });
      const subs2 = { lang, on: true, lines: lines.map((l, i) => ({ s: l[0].s, e: l[l.length - 1].e, t: String(out[i] ?? "").slice(0, 200) })).filter((x) => x.t) };
      await admin.from("jobs").update({ input: { ...job.input, spec: { ...base, subs2 } } }).eq("id", job.id);
      return NextResponse.json({ subs2 });
    } catch (e) {
      console.error("montage translate", e);
      await refund("translate");
      return NextResponse.json({ error: "ما ضبطت الترجمة، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
    }
  }

  if (action === "voice") {
    const text = String(body.text ?? "").trim().slice(0, 1500);
    if (!text || !body.spec) return NextResponse.json({ error: "اكتب نص التعليق." }, { status: 400 });
    const denied = await charge();
    if (denied) return denied;
    try {
      // 1) ready for speech: clear "white Gulf" spelling and smooth pauses
      const say = await speechReady(text);
      // 2) record it with word timings
      const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
      const voices = ((vc?.value as { items?: { id: string; model?: string; settings?: VoiceSettings }[] })?.items ?? []);
      const voiceId = voices.some((v) => v.id === body.voice) ? String(body.voice) : voices[0]?.id ?? "pNInz6obpgDQGcFmaJgB";
      const vInfo = voices.find((x) => x.id === voiceId);
      const v = await ttsTimed(say, voiceId, vInfo?.model || undefined, vInfo?.settings);
      if (!v.words.length) throw new Error("no words");
      const path = await saveResult(user.id, job.id, v.audio, "audio/mpeg", "mp3");
      const [url] = await signedResultUrls([path], 60 * 60 * 24);
      // 3) footage length follows the new voice: trim, or repeat shots when it got longer
      const current = sanitize(base, body.spec, user.id);
      const src = current.segments.length ? current.segments : base.segments;
      const segs: { s: number; e: number }[] = [];
      let have = 0, i = 0;
      while (have < v.duration - 0.05 && i < 200) {
        const g = src[i % src.length];
        const len = Math.min(g.e - g.s, v.duration - have);
        if (len > 0.2) { segs.push({ s: g.s, e: +(g.s + len).toFixed(2) }); have += len; }
        i++;
      }
      const spec: MontageSpec = { ...current, segments: segs.length ? segs : src, vo: { path, url: "", on: true, words: v.words, text: say, voice: voiceId }, videoVolume: Math.min(current.videoVolume ?? 1, 0.15) };
      await admin.from("jobs").update({ input: { ...job.input, spec: { ...spec, src: "" } } }).eq("id", job.id);
      return NextResponse.json({ spec: { ...spec, src: "", words: [], face: [] }, url, text: say });
    } catch (e) {
      console.error("montage voice", e);
      await refund("voice");
      const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
      const why = me?.role === "admin" ? ` [${String(e instanceof Error ? e.message : e).slice(0, 220)}]` : "";
      return NextResponse.json({ error: `ما ضبط تسجيل الصوت، ورجّعنا لك الريش. حاول مرة ثانية.${why}` }, { status: 502 });
    }
  }

  if (action === "music") {
    const denied = await charge();
    if (denied) return denied;
    try {
      const prompt = String(body.prompt ?? "").slice(0, 300);
      const hum = /hum|همهم|همهمة/i.test(prompt);
      const audio = await music(hum ? `Soft wordless vocal humming only, no lyrics, no instruments, no drums, gentle background under speech. ${prompt}` : `Soft instrumental background music to sit under speech in a social media video, no vocals, low energy peaks. ${prompt}`, clamp(Math.round(Number(body.seconds) || 30), 10, 120));
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
    const spec = sanitize(base, body.spec, user.id);
    const own = (u?: string) => !!u && /\/storage\/v1\/object\/sign\/results\//.test(u) && u.includes(`/${user.id}/`);
    const lib = await admin.from("site_content").select("value").eq("key", "motion_music").maybeSingle();
    const tracks = ((lib.data?.value as { items?: { url: string }[] })?.items ?? []).map((t) => t.url);
    spec.music = body.spec.music && (own(body.spec.music.url) || tracks.includes(body.spec.music.url)) ? body.spec.music : null;
    await admin.from("jobs").update({ status: "queued", progress: 0, input: { ...job.input, spec: { ...spec, src: "" }, render: true }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
}
