import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson } from "@/lib/providers/text";
import { music, speakable, ttsTimed, type VoiceSettings } from "@/lib/providers/elevenlabs";
import { saveResult } from "@/lib/providers/storage";
import { brandHint } from "@/lib/tools/run";
import { BOARD_STYLES, CAPTION_STYLES, DARK_BOARDS, ICONS, cleanGraphics, type BoardStyle, type MontageSpec } from "@/remotion/montage";
import { PLAYBOOK, playbookText } from "@/remotion/playbook";
import type { Aspect } from "@/remotion/spec";

export const maxDuration = 300;

const LENGTHS = [30, 60, 90, 120];
const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9"];
const AUDIENCE: Record<string, string> = { kids: "أطفال (٥-١٠ سنوات): كلمات بسيطة جداً وجمل قصيرة ومرحة", students: "طلاب مدارس: واضح ومرتّب مع أمثلة", adults: "كبار وعامة الناس: عملي ومباشر", pros: "متخصصين: دقيق ومركّز" };
const DIALECT: Record<string, string> = { kuwaiti: "لهجة كويتية بيضاء واضحة", gulf: "لهجة خليجية بيضاء", msa: "عربية فصحى مبسطة", en: "English (simple, clear)" };
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);

const SYSTEM = () => `أنت معلّم ومخرج فيديوهات تعليمية متحركة محترف (مثل أفضل قنوات الشرح بالرسوم المتحركة). تحوّل الدرس أو الفكرة إلى سكربت قصير مقسّم لجمل، ولكل جملة مشهد متحرك يشرحها.
أعد JSON فقط بالشكل:
{
 "title": "عنوان الدرس (3-6 كلمات)",
 "domain": "id المجال من الدليل",
 "colors": {"accent": "#hex", "bg": "#hex غامق للوحة الداكنة"},
 "font": "Cairo|Tajawal|Almarai|Changa",
 "board": "soft|paper|grid|dots|notebook|chalk|blueprint|night|pastel|sunrise (خلفية اللوحة المناسبة للموضوع: chalk للمدرسة، blueprint للهندسة والعلوم، notebook للدروس، pastel للأطفال، grid للرياضيات، night للتقنية)",
 "music_prompt": "وصف إنجليزي قصير لموسيقى خلفية هادئة مناسبة، أو \\"\\" للمحتوى الديني",
 "lines": [ { "say": "جملة تنقال بالصوت (6-16 كلمة)", "scene": { "kind": "...", ...حقول المشهد } } ]
}
أنواع المشاهد (scene.kind) وحقولها: headline{text,hl,sub,fx} | timer{text,hl,sub} | counter{value,suffix,text} | steps{text,items[{label,icon}] 2-4} | checklist{text,items[{label}] 2-4} | compare{text,bad,good} | icon{icon,text,sub} | flow{items[{icon,label}] 2-3,text} | bars{text,suffix,items[{label,value}] 2-5} | donut{value 0-100,text} | line{text,values[]} | quote{text,sub} | arrow{text} | definition{text المصطلح,sub المعنى,hl كلمة صغيرة فوق مثل "تعريف"} | quiz{text السؤال,items[{label}] 2-4 اختيارات,value رقم الجواب الصح من 1} | truefalse{text العبارة,value 1 صح أو 0 خطأ,sub التوضيح} | timeline{text,items[{label,icon}] 3-5 بالترتيب} | cycle{text,items[{label,icon}] 3-5 مراحل تتكرر} | mindmap{text الفكرة الرئيسية,items[{label,icon}] 3-6 فروع} | proscons{text,items[{label,value 1 ميزة أو 0 عيب}]} | equation{text معادلة بمسافات بين الرموز مثل "2 + 3 = 5",sub} | fraction{values[البسط,المقام],text} | vocab{text الكلمة,hl النطق,sub المعنى,good جملة مثال} | pyramid{text,items[{label}] من القاعدة للقمة 3-5} | table{text العنوان,items[{label: "البند: القيمة"}] 2-6} | fillblank{text جملة فيها ___ مكان الفراغ,good الجواب,sub}.
fx (تأثير على كلمة hl): marker | circle | underline | typewriter.
الأيقونات المتاحة فقط: ${ICONS.join(", ")}.
قواعد الشرح:
- أول جملة خطّاف يشد (سؤال أو معلومة مفاجئة) مع مشهد headline أو icon.
- كل فكرة بجملة، والمشهد يوضّحها بصرياً: المصطلح definition أو vocab، الخطوات steps، الأخطاء compare أو truefalse، الأرقام counter أو bars أو table، النسب donut أو fraction، الحساب equation، التاريخ timeline، العمليات المتكررة cycle، تفرّع الموضوع mindmap، الترتيب حسب الأهمية pyramid، المزايا والعيوب proscons، الأمثلة icon، والتأكد من الفهم quiz أو fillblank.
- كن مبدع وخلّ كل فيديو مختلف: نوّع بين أكثر من 6 أنواع مشاهد بالفيديو الواحد، ولا تمشي على نفس الترتيب كل مرة.
- نوّع المشاهد ولا تكرر نفس النوع مرتين ورا بعض. نصوص المشاهد قصيرة جداً (كلمة إلى 5 كلمات) لأن الصوت يشرح.
- آخر جملة خلاصة أو سؤال للمشاهد أو دعوة (arrow أو checklist للخلاصة).
- معلومات صحيحة ودقيقة فقط، وإذا ما تعرف رقم دقيق لا تخترعه.
- الجمل "say" مكتوبة جاهزة للنطق باللهجة المطلوبة: بدون رموز أو أقواس أو إيموجي، والأرقام تنكتب كلمات إذا صعبة.
دليل المجالات (اختر الأقرب لنبرة وألوان الدرس):
${playbookText(PLAYBOOK.filter((d) => ["education", "kids", "coach", "tech", "finance", "clinic", "nutrition", "religion", "cooking", "news", "law", "story"].includes(d.id)))}`;

type Line = { say?: string; scene?: Record<string, unknown> };
type Plan = { board?: string; title?: string; domain?: string; colors?: { accent?: string; bg?: string }; font?: string; music_prompt?: string; lines?: Line[] };

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const topic = String(b.topic ?? "").trim().slice(0, 4000);
  if (topic.length < 5) return NextResponse.json({ error: "اكتب الدرس أو الفكرة." }, { status: 400 });
  const seconds = LENGTHS.includes(Number(b.seconds)) ? Number(b.seconds) : 60;
  const aspect = ASPECTS.includes(b.aspect as Aspect) ? (b.aspect as Aspect) : "9:16";
  const audience = AUDIENCE[String(b.audience)] ? String(b.audience) : "students";
  const dialect = DIALECT[String(b.dialect)] ? String(b.dialect) : "kuwaiti";
  const panel = b.panel === "dark" ? "dark" : "light";
  const withMusic = b.music !== false;
  const admin = createAdminClient();

  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", "lesson-video").single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const cost = Math.max(1, Math.round(seconds / 30)) * tool.credit_cost;

  const { data: job, error } = await admin.from("jobs")
    .insert({ user_id: user.id, tool_id: "lesson-video", title: topic.slice(0, 80), status: "running", progress: 5, input: { topic, seconds, aspect, audience, dialect } })
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
    const ask = `الدرس / الفكرة:\n${topic}\n\nالجمهور: ${AUDIENCE[audience]}\nاللغة: ${DIALECT[dialect]}\nالمدة: ${seconds} ثانية تقريباً (حوالي ${words} كلمة بالمجموع، ${Math.round(words / 11)} جملة تقريباً).\n${b.notes ? `ملاحظات العميل: ${String(b.notes).slice(0, 500)}\n` : ""}${await brandHint(user.id)}`;
    let plan: Plan;
    try { plan = await aiJson<Plan>(SYSTEM(), ask, 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    catch { plan = await aiJson<Plan>(SYSTEM(), ask + "\nمهم: أعد JSON صالح ومكتمل فقط.", 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    const lines = (plan.lines ?? []).map((l) => ({ say: String(l.say ?? "").replace(/\s+/g, " ").trim(), scene: l.scene })).filter((l) => l.say).slice(0, 40);
    if (!lines.length) throw new Error("empty script");
    await admin.from("jobs").update({ progress: 35 }).eq("id", job.id);

    // 2) voice with word timings
    const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
    const voices = ((vc?.value as { items?: { id: string; model?: string; settings?: VoiceSettings }[] })?.items ?? []);
    const voiceId = voices.some((v) => v.id === b.voice) ? String(b.voice) : voices[0]?.id ?? "pNInz6obpgDQGcFmaJgB";
    const vInfo = voices.find((x) => x.id === voiceId);
    const text = lines.map((l) => (/[.!؟?]$/.test(l.say) ? l.say : `${l.say}.`)).join(" ");
    const v = await ttsTimed(text, voiceId, vInfo?.model || undefined, vInfo?.settings);
    if (!v.words.length) throw new Error("no words");
    const voPath = await saveResult(user.id, job.id, v.audio, "audio/mpeg", "mp3");
    await admin.from("jobs").update({ progress: 65 }).eq("id", job.id);

    // 3) each sentence's time = its words in the voice timeline
    let wi = 0;
    const timed = lines.map((l) => {
      const n = speakable(l.say).split(/\s+/).filter(Boolean).length;
      const first = v.words[Math.min(wi, v.words.length - 1)];
      const last = v.words[Math.min(wi + n - 1, v.words.length - 1)];
      wi += n;
      return { ...l, s: first.s, e: last.e };
    });
    const total = +(v.duration + 0.6).toFixed(2);
    const graphics = cleanGraphics(timed.filter((l) => l.scene).map((l, i, all) => ({ ...l.scene, at: Math.max(0, l.s - 0.1), dur: Math.max(1.6, ((all[i + 1]?.s ?? total) - l.s) - 0.05) })), total);

    // 4) background music (optional, never for religious content)
    const domain = PLAYBOOK.some((d) => d.id === plan.domain) ? plan.domain : "education";
    let musicTrack: MontageSpec["music"] = null;
    if (withMusic && domain !== "religion" && plan.music_prompt !== "") {
      try {
        const audio = await music(`Soft instrumental background music to sit under a teacher's voice in an educational animation, no vocals, steady and light. ${plan.music_prompt || PLAYBOOK.find((d) => d.id === domain)?.music || ""}`, Math.min(120, Math.ceil(total) + 3));
        const path = await saveResult(user.id, job.id, audio, "audio/mpeg", "mp3");
        musicTrack = { url: "", name: "موسيقى الدرس", path };
      } catch (e) { console.error("lesson music", e); }
    }

    const caps = CAPTION_STYLES.map((c) => c[0]);
    // every lesson looks a bit different: the customer's choice, else the AI's, else a random one that suits the panel
    const boards = BOARD_STYLES.map((x) => x[0]);
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const board: BoardStyle = boards.includes(b.board as BoardStyle) ? (b.board as BoardStyle)
      : boards.includes(plan.board as BoardStyle) ? (plan.board as BoardStyle)
      : panel === "dark" ? pick(DARK_BOARDS) : pick(boards.filter((x) => !DARK_BOARDS.includes(x)));
    const spec: MontageSpec = {
      src: "", srcPath: "", srcW: 1080, srcH: 1920, aspect,
      font: ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(String(plan.font)) ? String(plan.font) : "Cairo",
      colors: { text: "#FFFFFF", accent: hex(plan.colors?.accent, "#E8B44C"), bg: hex(plan.colors?.bg, "#0B2A4A") },
      captions: { on: true, style: caps.includes(b.captions as never) ? (b.captions as MontageSpec["captions"]["style"]) : pick(["karaoke", "highlight", "karaoke"] as const), pos: "bottom" },
      segments: [{ s: 0, e: total }], words: [], titles: [], zooms: [],
      intro: { on: false, title: String(plan.title ?? "").slice(0, 60), subtitle: "" },
      outro: { on: false, title: "", subtitle: "" },
      music: musicTrack, layout: "board", panel: DARK_BOARDS.includes(board) ? "dark" : panel, board, graphics, domain,
      vo: { path: voPath, url: "", on: true, words: v.words, text, voice: voiceId },
      videoVolume: 0, sfx: true, progress: true, quality: "1080",
    };
    await admin.from("jobs").update({ status: "draft", progress: 100, title: String(plan.title || topic).slice(0, 80), input: { topic, seconds, aspect, audience, dialect, spec } }).eq("id", job.id);
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    console.error("lesson", e);
    await admin.from("jobs").update({ status: "failed", error: `lesson: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
    await admin.rpc("refund_job", { p_job: job.id });
    return NextResponse.json({ error: "ما قدرنا نسوي الدرس الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
  }
}
