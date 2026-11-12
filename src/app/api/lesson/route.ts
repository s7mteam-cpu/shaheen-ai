import { NextResponse } from "next/server";
import { guardContent } from "@/lib/server/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson } from "@/lib/providers/text";
import { music, speakable, ttsTimed, type VoiceSettings } from "@/lib/providers/elevenlabs";
import { saveResult } from "@/lib/providers/storage";
import { brandHint } from "@/lib/tools/run";
import { illustrateScenes } from "@/lib/server/illustrate";
import { ILLUS_STYLES } from "@/remotion/styles";
import { BOARD_STYLES, CAPTION_STYLES, DARK_BOARDS, ICONS, cleanGraphics, type BoardStyle, type MontageSpec } from "@/remotion/montage";
import { PLAYBOOK, playbookText } from "@/remotion/playbook";
import { enforcePack, packBrief, packById } from "@/remotion/packs";
import { industryById } from "@/design/industries";
import { guessIndustry } from "@/lib/server/guessIndustry";
import { snapshot, trendsFor } from "@/lib/server/trends";
import type { Aspect } from "@/remotion/spec";

export const maxDuration = 300;

const LENGTHS = [30, 60, 90, 120];
const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9"];
const AUDIENCE: Record<string, string> = { kids: "أطفال (٥-١٠ سنوات): كلمات بسيطة جداً وجمل قصيرة ومرحة", students: "طلاب مدارس: واضح ومرتّب مع أمثلة", adults: "كبار وعامة الناس: عملي ومباشر", pros: "متخصصين: دقيق ومركّز" };
const DIALECT: Record<string, string> = { kuwaiti: "لهجة كويتية بيضاء واضحة", gulf: "لهجة خليجية بيضاء", msa: "عربية فصحى مبسطة", en: "English (simple, clear)" };
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);

const SYSTEM = (drawHint: string, motion = false, guide = "", voice = true) => `${motion ? `أنت مخرج موشن جرافيك خليجي محترف للإعلانات والسوشال ميديا. تحوّل فكرة العميل إلى فيديو قصير مقسّم لمشاهد متحركة، كل مشهد له نص قصير على الشاشة${voice ? " وجملة تنقال بالصوت" : ""}.` : "أنت معلّم ومخرج فيديوهات تعليمية متحركة محترف (مثل أفضل قنوات الشرح بالرسوم المتحركة). تحوّل الدرس أو الفكرة إلى سكربت قصير مقسّم لجمل، ولكل جملة مشهد متحرك يشرحها."}
أعد JSON فقط بالشكل:
{
 "title": "عنوان الدرس (3-6 كلمات)",
 "domain": "id المجال من الدليل",
 "colors": {"accent": "#hex", "bg": "#hex غامق للوحة الداكنة"},
 "font": "Cairo|Tajawal|Almarai|Changa",
 "illus": "ستايل الرسومات إذا فيه مشاهد scene",
 "board": "soft|paper|grid|dots|notebook|chalk|blueprint|night|pastel|sunrise (خلفية اللوحة المناسبة للموضوع: chalk للمدرسة، blueprint للهندسة والعلوم، notebook للدروس، pastel للأطفال، grid للرياضيات، night للتقنية)",
 "music_prompt": "وصف إنجليزي قصير لموسيقى خلفية هادئة مناسبة، أو \\"\\" للمحتوى الديني",
 "lines": [ { "say": "جملة تنقال بالصوت (6-16 كلمة)${motion && !voice ? " — أو اتركها فاضية إذا ما فيه صوت" : ""}", "dur": ثواني المشهد (2-5)${motion && !voice ? " مهم" : ""}, "scene": { "kind": "...", ...حقول المشهد } } ]
}
أنواع المشاهد (scene.kind) وحقولها: headline{text,hl,sub,fx} | timer{text,hl,sub} | counter{value,suffix,text} | steps{text,items[{label,icon}] 2-4} | checklist{text,items[{label}] 2-4} | compare{text,bad,good} | icon{icon,text,sub} | flow{items[{icon,label}] 2-3,text} | bars{text,suffix,items[{label,value}] 2-5} | donut{value 0-100,text} | line{text,values[]} | quote{text,sub} | arrow{text} | scene{prompt وصف إنجليزي للرسمة,text,hl,sub} مشهد مرسوم بالذكاء الاصطناعي (للقصص والأمثلة والأماكن والشخصيات) | cube{text,items[{label,icon}] 2-4 وجوه} مكعب 3D يدور | globe{text} كرة أرضية تدور | text3d{text 1-3 كلمات,sub} نص ثلاثي الأبعاد | plot{text مثل "y = sin(x)",hl sin|cos|x2|x3|linear|exp|abs|sqrt,sub} رسم دالة | geometry{shape triangle|square|circle|hexagon,text,items[{label}] أطوال الأضلاع,sub القانون} | burst{text,icon أو emoji} ختم «تم» مع انفجار | confetti{text} احتفال | dotgrid{text,value} شبكة نقاط تتموّج | sketchbars{text,items[{label,value}]} رسم بياني مرسوم باليد | definition{text المصطلح,sub المعنى,hl كلمة صغيرة فوق مثل "تعريف"} | quiz{text السؤال,items[{label}] 2-4 اختيارات,value رقم الجواب الصح من 1} | truefalse{text العبارة,value 1 صح أو 0 خطأ,sub التوضيح} | timeline{text,items[{label,icon}] 3-5 بالترتيب} | cycle{text,items[{label,icon}] 3-5 مراحل تتكرر} | mindmap{text الفكرة الرئيسية,items[{label,icon}] 3-6 فروع} | proscons{text,items[{label,value 1 ميزة أو 0 عيب}]} | equation{text معادلة بمسافات بين الرموز مثل "2 + 3 = 5",sub} | fraction{values[البسط,المقام],text} | vocab{text الكلمة,hl النطق,sub المعنى,good جملة مثال} | pyramid{text,items[{label}] من القاعدة للقمة 3-5} | table{text العنوان,items[{label: "البند: القيمة"}] 2-6} | fillblank{text جملة فيها ___ مكان الفراغ,good الجواب,sub} | scene{prompt وصف إنجليزي للرسمة,text,hl,sub} مشهد مرسوم بالذكاء الاصطناعي (للقصص والأمثلة والأماكن والشخصيات) | cube{text,items[{label,icon}] 2-4 وجوه} مكعب 3D يدور | globe{text} كرة أرضية تدور | text3d{text 1-3 كلمات,sub} نص ثلاثي الأبعاد | plot{text مثل "y = sin(x)",hl sin|cos|x2|x3|linear|exp|abs|sqrt,sub} رسم دالة | geometry{shape triangle|square|circle|hexagon,text,items[{label}] أطوال الأضلاع,sub القانون} | burst{text,icon أو emoji} ختم «تم» مع انفجار | confetti{text} احتفال | dotgrid{text,value} شبكة نقاط تتموّج | sketchbars{text,items[{label,value}]} رسم بياني مرسوم باليد.
مشاهد تجارية وخاصة بالمجالات: price{text,values[القديم,الجديد],suffix العملة,sub} | offer{value نسبة,hl,text,sub} | menu{text,items[{label,value السعر}],suffix} | rating{value 1-5,suffix,text} | testimonial{text,sub الاسم,value} | contact{text,items[{label: "واتساب: …",icon phone|pin|chat}]} | hours{text,items[{label}]} | specs{text,items[{label,value,icon}]} | appointment{text,value 0-4,sub} | beforeafter{text,bad,good} | countdown{text,value ثواني,sub} | delivery{text,sub} | dish{emoji,text,sub} طبق بالبخار | shine{emoji,text,sub} لمعة على منتج | mist{text,sub} عطر ورذاذ | ecg{value,suffix,text} نبض | flight{items[{label من},{label إلى}],text} | scales{items[{label},{label}],text,value} | shutter{text} | giftbox{text,sub} | house{text,sub} | ring{value,text,icon} | map{text اسم المحل أو المنطقة,sub العنوان أو "حياكم"} خريطة ودبوس الموقع | route{items[{label من},{label إلى}],text,sub المدة مثل "15 دقيقة"} طريق يمشي على الخريطة.
fx (تأثير على كلمة hl): marker | circle | underline | typewriter.
الأيقونات المتاحة فقط: ${ICONS.join(", ")}.
قواعد الشرح:
- أول جملة خطّاف يشد (سؤال أو معلومة مفاجئة) مع مشهد headline أو icon.
- كل فكرة بجملة، والمشهد يوضّحها بصرياً: المصطلح definition أو vocab، الخطوات steps، الأخطاء compare أو truefalse، الأرقام counter أو bars أو table، النسب donut أو fraction، الحساب equation، التاريخ timeline، العمليات المتكررة cycle، تفرّع الموضوع mindmap، الترتيب حسب الأهمية pyramid، المزايا والعيوب proscons، الأمثلة icon، والتأكد من الفهم quiz أو fillblank.
- ${drawHint}
- كن مبدع وخلّ كل فيديو مختلف: نوّع بين أكثر من 6 أنواع مشاهد بالفيديو الواحد، ولا تمشي على نفس الترتيب كل مرة.
- نوّع المشاهد ولا تكرر نفس النوع مرتين ورا بعض. نصوص المشاهد قصيرة جداً (كلمة إلى 5 كلمات) لأن الصوت يشرح.
- آخر جملة خلاصة أو سؤال للمشاهد أو دعوة (arrow أو checklist للخلاصة).
- معلومات صحيحة ودقيقة فقط، وإذا ما تعرف رقم دقيق لا تخترعه.
- الجمل "say" مكتوبة جاهزة للنطق باللهجة المطلوبة: بدون رموز أو أقواس أو إيموجي، والأرقام تنكتب كلمات إذا صعبة.
${guide ? `حزمة المجال (التزم فيها):\n${guide}` : `دليل المجالات (اختر الأقرب لنبرة وألوان الدرس):\n${playbookText(PLAYBOOK.filter((d) => ["education", "kids", "coach", "tech", "finance", "clinic", "nutrition", "religion", "cooking", "news", "law", "story"].includes(d.id)))}`}${motion ? `\nللإعلانات: ابدأ بخطّاف قوي، واستخدم المشاهد التجارية (price, offer, menu, rating, testimonial, contact, specs, appointment, beforeafter, countdown, delivery, hours) حسب الحزمة، واختم بدعوة واضحة (contact أو arrow). لا تخترع أرقام تواصل أو أسعار ما ذكرها العميل — إذا ما ذكرها لا تستخدم price أو contact بأرقام.` : ""}`;

type Line = { say?: string; dur?: number; scene?: Record<string, unknown> };
type Plan = { illus?: string; board?: string; title?: string; domain?: string; colors?: { accent?: string; bg?: string }; font?: string; music_prompt?: string; lines?: Line[] };

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const motion = b.mode === "motion";
  const brand = String(b.brand ?? "").slice(0, 60);
  const toolId = motion ? "motion-video" : "lesson-video";
  const topic = String(b.topic ?? "").trim().slice(0, 4000);
  if (topic.length < 5) return NextResponse.json({ error: motion ? "اكتب فكرة الفيديو." : "اكتب الدرس أو الفكرة." }, { status: 400 });
  { const bad = await guardContent(user.id, b, motion ? "motion-video" : "lesson-video"); if (bad) return bad; }
  const seconds = motion ? ([15, 30, 60].includes(Number(b.seconds)) ? Number(b.seconds) : 30) : LENGTHS.includes(Number(b.seconds)) ? Number(b.seconds) : 60;
  // the field is optional: if the customer didn't pick one, read it from their text
  const ind = industryById(String(b.industry ?? "")) ?? (motion ? industryById(await guessIndustry(`${brand ? `${String(b.brand)}: ` : ""}${topic}`)) : undefined);
  const pack = packById(ind?.id);
  const guide = ind && pack ? packBrief(pack, ind.label) : "";
  const voiceOn = motion ? b.voiceover === true : true;

  const aspect = ASPECTS.includes(b.aspect as Aspect) ? (b.aspect as Aspect) : "9:16";
  const audience = AUDIENCE[String(b.audience)] ? String(b.audience) : "students";
  const dialect = DIALECT[String(b.dialect)] ? String(b.dialect) : "kuwaiti";
  const panel = b.panel === "dark" ? "dark" : "light";
  const withMusic = b.music !== false;
  const drawings = b.drawings !== false;
  const illus = ILLUS_STYLES.some((x) => x[0] === b.illus) ? String(b.illus) : undefined;
  const drawHint = drawings
    ? `استخدم مشهد scene (رسمة بالذكاء الاصطناعي) من 2 إلى 5 مرات بالفيديو للقصص والأمثلة والأماكن والشخصيات، و prompt يكون وصف إنجليزي واضح للرسمة بدون أي كتابة داخلها.${illus ? "" : " واختر \"illus\" ستايل الرسومات المناسب من: " + ILLUS_STYLES.map((x) => x[0]).join(", ") + "."}`
    : "لا تستخدم مشهد scene.";
  const admin = createAdminClient();

  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", toolId).single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const cost = Math.max(1, Math.round(seconds / (motion ? 15 : 30))) * tool.credit_cost;

  const { data: job, error } = await admin.from("jobs")
    .insert({ user_id: user.id, tool_id: toolId, title: topic.slice(0, 80), status: "running", progress: 5, input: { topic, seconds, aspect, audience, dialect, industry: ind?.id ?? null } })
    .select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) {
    await admin.from("jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
  }

  try {
    // 1) script + scenes
    const words = Math.round(seconds * 2.2);
    const ask = `${motion ? "فكرة الفيديو" : "الدرس / الفكرة"}:\n${topic}\n\n${brand ? `اسم النشاط: ${brand}\n` : ""}${motion ? "" : `الجمهور: ${AUDIENCE[audience]}\n`}اللغة: ${DIALECT[dialect]}\nالمدة: ${seconds} ثانية تقريباً (${voiceOn ? `حوالي ${words} كلمة بالمجموع، ${Math.round(words / 11)} جملة تقريباً` : `${Math.max(3, Math.round(seconds / 3.5))} مشاهد تقريباً، بدون صوت`}).\n${b.notes ? `ملاحظات العميل: ${String(b.notes).slice(0, 500)}\n` : ""}${await brandHint(user.id)}\n${await trendsFor(ind?.id, motion ? "motion" : "lesson")}`;
    let plan: Plan;
    try { plan = await aiJson<Plan>(SYSTEM(drawHint, motion, guide, voiceOn), ask, 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    catch { plan = await aiJson<Plan>(SYSTEM(drawHint, motion, guide, voiceOn), ask + "\nمهم: أعد JSON صالح ومكتمل فقط.", 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    const lines = (plan.lines ?? []).map((l) => ({ say: String(l.say ?? "").replace(/\s+/g, " ").trim(), dur: Number(l.dur) || 0, scene: l.scene }))
      .filter((l) => (voiceOn ? l.say : l.scene)).slice(0, 40);
    if (!lines.length) throw new Error("empty script");
    await admin.from("jobs").update({ progress: 35 }).eq("id", job.id);

    let timed: (typeof lines[number] & { s: number; e: number })[];
    let total: number;
    let vo: MontageSpec["vo"] = null;
    if (voiceOn && lines.some((l) => l.say)) {
      // 2) voice with word timings
      const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
      const voices = ((vc?.value as { items?: { id: string; model?: string; settings?: VoiceSettings }[] })?.items ?? []);
      const voiceId = voices.some((v) => v.id === b.voice) ? String(b.voice) : voices[0]?.id ?? "pNInz6obpgDQGcFmaJgB";
      const vInfo = voices.find((x) => x.id === voiceId);
      const spoken = lines.filter((l) => l.say);
      const text = spoken.map((l) => (/[.!؟?]$/.test(l.say) ? l.say : `${l.say}.`)).join(" ");
      const v = await ttsTimed(text, voiceId, vInfo?.model || undefined, vInfo?.settings);
      if (!v.words.length) throw new Error("no words");
      const voPath = await saveResult(user.id, job.id, v.audio, "audio/mpeg", "mp3");
      vo = { path: voPath, url: "", on: true, words: v.words, text, voice: voiceId };
      // 3) each sentence's time = its words in the voice timeline
      let wi = 0;
      timed = spoken.map((l) => {
        const n = speakable(l.say).split(/\s+/).filter(Boolean).length;
        const first = v.words[Math.min(wi, v.words.length - 1)];
        const last = v.words[Math.min(wi + n - 1, v.words.length - 1)];
        wi += n;
        return { ...l, s: first.s, e: last.e };
      });
      total = +(v.duration + 0.6).toFixed(2);
    } else {
      // no voice: scenes back to back, stretched to the chosen length
      const want = lines.map((l) => Math.max(1.8, Math.min(6, l.dur || 3)));
      const k = seconds / want.reduce((a, x) => a + x, 0);
      let t = 0;
      timed = lines.map((l, i) => { const d = want[i] * k; const r = { ...l, s: t, e: t + d }; t += d; return r; });
      total = +t.toFixed(2);
    }
    await admin.from("jobs").update({ progress: 65 }).eq("id", job.id);
    const style = illus ?? (ILLUS_STYLES.some((x) => x[0] === plan.illus) ? plan.illus : pack?.illus[0] ?? "gulf-cartoon");
    const kept = enforcePack(cleanGraphics(timed.filter((l) => l.scene).map((l, i, all) => ({ ...l.scene, at: Math.max(0, l.s - 0.1), dur: Math.max(1.6, ((all[i + 1]?.s ?? total) - l.s) - 0.05) })), total), pack);
    let graphics = kept.graphics;

    // 3b) AI-drawn scenes, all at once
    if (drawings) graphics = await illustrateScenes(user.id, job.id, graphics, style, aspect, 6);
    else graphics = graphics.filter((g) => g.kind !== "scene");
    await admin.from("jobs").update({ progress: 80 }).eq("id", job.id);

    // 4) background music (optional, never for religious content)
    const domain = ind?.id ?? (PLAYBOOK.some((d) => d.id === plan.domain) ? plan.domain : motion ? "ecommerce" : "education");
    let musicTrack: MontageSpec["music"] = null;
    if (withMusic && domain !== "religion" && plan.music_prompt !== "") {
      try {
        const base = motion ? (voiceOn ? "Instrumental background music for a short social media ad with a voice-over, no vocals." : "Catchy instrumental music for a short animated social media ad, no vocals, clear rhythm.") : "Soft instrumental background music to sit under a teacher's voice in an educational animation, no vocals, steady and light.";
        const audio = await music(`${base} ${plan.music_prompt || pack?.music || PLAYBOOK.find((d) => d.id === domain)?.music || ""}`, Math.min(120, Math.ceil(total) + 3));
        const path = await saveResult(user.id, job.id, audio, "audio/mpeg", "mp3");
        musicTrack = { url: "", name: motion ? "موسيقى الفيديو" : "موسيقى الدرس", path };
      } catch (e) { console.error("lesson music", e); }
    }

    const caps = CAPTION_STYLES.map((c) => c[0]);
    // every lesson looks a bit different: the customer's choice, else the AI's, else a random one that suits the panel
    const boards = BOARD_STYLES.map((x) => x[0]);
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const forced = motion && (b.panel === "light" || b.panel === "dark");
    const fits = (x: BoardStyle) => !forced || DARK_BOARDS.includes(x) === (panel === "dark");
    const board: BoardStyle = boards.includes(b.board as BoardStyle) ? (b.board as BoardStyle)
      : boards.includes(plan.board as BoardStyle) && fits(plan.board as BoardStyle) ? (plan.board as BoardStyle)
      : pack && pack.boards.some(fits) ? pick(pack.boards.filter(fits))
      : panel === "dark" ? pick(DARK_BOARDS) : pick(boards.filter((x) => !DARK_BOARDS.includes(x)));
    // «هويتي»: the customer's colours, font, logo and contact go into every new motion / lesson video
    const { data: kit } = await admin.from("brand_kits").select("business_name,colors,font,handle,instagram,logo_url").eq("user_id", user.id).maybeSingle();
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
    const kc = ((kit?.colors ?? []) as string[]).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    const kitBg = kc.filter((c) => lum(c) < 0.35).sort((a, b) => lum(a) - lum(b))[0];
    const kitAccent = kc.filter((c) => lum(c) >= 0.25 && lum(c) <= 0.85 && c !== kitBg)[0];
    const kitFont = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(String(kit?.font)) ? String(kit!.font) : null;
    const contact = String(kit?.handle || kit?.instagram || "").slice(0, 60);
    const spec: MontageSpec = {
      src: "", srcPath: "", srcW: 1080, srcH: 1920, aspect,
      font: kitFont ?? (["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(String(plan.font)) ? String(plan.font) : "Cairo"),
      colors: { text: "#FFFFFF", accent: kitAccent ?? hex(plan.colors?.accent, "#E8B44C"), bg: kitBg ?? hex(plan.colors?.bg, "#0B2A4A") },
      ...(kit?.logo_url ? { logo: { path: kit.logo_url, url: "", on: true, pos: "tl" as const } } : {}),
      captions: { on: !!vo, style: caps.includes(b.captions as never) ? (b.captions as MontageSpec["captions"]["style"]) : pick(["karaoke", "highlight", "karaoke"] as const), pos: "bottom" },
      segments: [{ s: 0, e: total }], words: [], titles: [], zooms: [],
      intro: { on: false, title: String(plan.title ?? brand).slice(0, 60), subtitle: "" },
      // motion (ads): end card with the business name + contact from «هويتي»
      outro: motion && kit?.business_name ? { on: true, title: String(kit.business_name).slice(0, 60), subtitle: contact } : { on: false, title: "", subtitle: "" },
      illus: style, borrowed: kept.borrowed, music: musicTrack, layout: "board", panel: DARK_BOARDS.includes(board) ? "dark" : panel, board, graphics, domain,
      vo,
      videoVolume: 0, sfx: true, progress: !motion, quality: "1080",
    };
    await admin.from("jobs").update({ status: "draft", progress: 100, title: String(plan.title || topic).slice(0, 80), input: { topic, seconds, aspect, audience, dialect, industry: ind?.id ?? null, first: snapshot(spec as unknown as Record<string, unknown>), spec } }).eq("id", job.id);
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    console.error("lesson", e);
    await admin.from("jobs").update({ status: "failed", error: `lesson: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
    await admin.rpc("refund_job", { p_job: job.id });
    return NextResponse.json({ error: motion ? "ما قدرنا نسوي الفيديو الحين، ورجّعنا لك الريش. حاول مرة ثانية." : "ما قدرنا نسوي الدرس الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
  }
}
