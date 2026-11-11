// Shaheen video worker (Railway). Renders with Remotion, listens with ElevenLabs, plans with Claude.
// 1) "motion-video" (queued + spec)          → render the motion-graphics design → MP4.
// 2) "video-editing" (queued, no spec yet)   → smart montage analysis: transcript + AI edit plan → "draft" (customer edits it live).
// 3) "video-editing" (queued + render: true) → render the edited montage → MP4.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY (optional: smarter plans), RENDER_CONCURRENCY
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { createRequire } from "node:module";
const PLAYBOOK = createRequire(import.meta.url)("../src/remotion/playbook.json");
const PLAYBOOK_TEXT = PLAYBOOK.map((d) => `- ${d.id} | ${d.label} (${d.keywords.slice(0, 7).join("، ")}): layout ${d.layout}، grade ${d.grade}، ترجمة ${d.captions}، انتقال ${d.transition}، عناوين ${d.titles.join("/")}، مشاهد ${d.graphics.join("/")}، أيقونات ${d.icons.join("/")}، موسيقى: ${d.music || "بدون موسيقى"}. الأسلوب: ${d.tone}. أفكار: ${d.ideas.join("؛ ")}`).join("\n");

const run = promisify(execFile);
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MAX_SECONDS = 600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const setProgress = (id, p) => db.from("jobs").update({ progress: Math.max(0, Math.min(100, Math.round(p))), updated_at: now() }).eq("id", id).then(() => {}, () => {});

async function ff(args) { return run("ffmpeg", ["-hide_banner", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 }); }
async function probe(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_tags=rotate:format=duration", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0] ?? {};
  const rot = Math.abs(Number(s.tags?.rotate ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [s.height, s.width] : [s.width, s.height];
  return { duration: Number(j.format?.duration ?? 0), width: Number(w) || 1080, height: Number(h) || 1920 };
}

async function fail(job, e) {
  console.error("failed", job.id, e);
  await db.from("jobs").update({ status: "failed", error: String(e?.message ?? e).slice(0, 500), updated_at: now() }).eq("id", job.id);
  await db.rpc("refund_job", { p_job: job.id });
}

// ---------- Listening: word-level Arabic transcript ----------
async function transcribe(video, dir) {
  const audio = join(dir, "audio.mp3");
  await ff(["-i", video, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([await readFile(audio)]), "audio.mp3");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" }, body: form });
  if (!res.ok) throw new Error(`scribe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()).words ?? []).filter((w) => w.type === "word").map((w) => ({ t: w.text, s: +w.start.toFixed(2), e: +w.end.toFixed(2) }));
}

function sentences(words) {
  const out = []; let cur = [];
  for (const w of words) {
    if (cur.length && (w.s - cur[cur.length - 1].e > 0.7)) { out.push(cur); cur = []; }
    cur.push(w);
    if (/[.!؟?]$/.test(w.t) || cur.length >= 18) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.map((c) => ({ s: c[0].s, e: c[c.length - 1].e, text: c.map((w) => w.t).join(" ") }));
}

// ---------- Seeing: frames, faces, light ----------
async function frames(video, dir, duration) {
  const every = Math.max(2, duration / 24);
  await ff(["-i", video, "-vf", `fps=1/${every.toFixed(2)},scale=384:-2`, "-q:v", "6", join(dir, "f%03d.jpg")]);
  const out = [];
  for (let i = 1; i <= 26; i++) {
    try { out.push({ t: +((i - 1) * every + every / 2).toFixed(1), data: (await readFile(join(dir, `f${String(i).padStart(3, "0")}.jpg`))).toString("base64") }); } catch { break; }
  }
  return out;
}
async function faceTrack(video) {
  try {
    const { stdout } = await run("python3", [join(dirname(fileURLToPath(import.meta.url)), "face.py"), video, "0.5"], { maxBuffer: 16 * 1024 * 1024, timeout: 240_000 });
    return JSON.parse(stdout);
  } catch (e) { console.error("face track skipped", e?.message ?? e); return []; }
}
async function brightness(video) {
  try {
    const { stderr } = await ff(["-i", video, "-vf", "fps=1,scale=160:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"]);
    const v = [...stderr.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 110;
  } catch { return 110; }
}
async function makeMusic(prompt, seconds) {
  const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
    method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ prompt: /hum|همهم|a cappella|vocal/i.test(prompt) ? `Wordless soft vocal humming only, no lyrics, no instruments, no drums. ${prompt}` : `Instrumental only, no vocals. ${prompt}`, music_length_ms: Math.round(Math.min(120, Math.max(10, seconds)) * 1000) }),
  });
  if (!res.ok) throw new Error(`music ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------- Voice-over: Gulf voice with word timings ----------
const speakable = (t) => t.replace(/\r/g, "").replace(/[…]+|\.{3,}/g, "، ").replace(/\s*\n+\s*/g, (m) => (m.includes("\n\n") ? ". " : "، ")).replace(/([.،!؟?])\s*[،,]\s*/g, "$1 ").replace(/\s{2,}/g, " ").trim();
// Keep in sync with SPEECH_PROMPT in src/lib/providers/text.ts
const SPEECH_PROMPT = `أنت محرر نصوص للتعليق الصوتي بالذكاء الاصطناعي. جهّز النص عشان الصوت ينطقه بسلاسة، وحافظ على لهجة الكاتب:
- إذا النص فصحى: خلّه فصحى، وصحّح الإملاء والترقيم فقط.
- إذا النص لهجة (كويتية أو خليجية أو غيرها): خلّه بنفس اللهجة والكلمات، لكن اكتبه بإملاء "أبيض" واضح قريب من الفصحى: كاف المخاطبة "ك" وليس "ج" أو "چ" (ذوقك، عبايتك)، والكلمات الصعبة الكتابة بأقرب شكل مقروء (ويانا ← ويّانا).
- نفس المعنى والطول تقريباً، بدون إضافة أو حذف معلومات.
- فقرة واحدة بجمل قصيرة، فواصل ونقاط فقط، بدون نقاط ثلاث أو أسطر جديدة أو رموز أو إيموجي.
- الأرقام بالحروف. شكّل فقط الكلمات اللي ممكن تنقرأ غلط (مثل: تميّزك).
أعد النص فقط بدون أي شرح.`;

async function speechReady(text) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !text.trim()) return text;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 1500, system: SPEECH_PROMPT, messages: [{ role: "user", content: text }] }),
    });
    if (!res.ok) throw new Error(`claude ${res.status}`);
    const out = ((await res.json()).content?.[0]?.text ?? "").trim();
    return out || text;
  } catch (e) { console.error("speechReady", e.message); return text; }
}

async function voiceOver(text, voiceId, model = "eleven_v4", s = null) {
  const n = (v, d) => (typeof v === "number" && v >= 0 && v <= 2 ? v : d);
  const vs = s ? { stability: n(s.stability, 0.5), similarity_boost: n(s.similarity, 0.75), style: n(s.style, 0), speed: n(s.speed, 1), use_speaker_boost: s.speaker_boost ?? true } : null;
  const call = (model) => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ text: speakable(text), model_id: model, ...(/^eleven_(v3|v4|flash_v2_5|turbo_v2_5)/.test(model) ? { language_code: "ar" } : {}), ...(vs ? { voice_settings: vs } : {}) }),
  });
  // Eleven v4 + Arabic (like the ElevenLabs site); fallback Multilingual v2
  let res = await call(model);
  if (!res.ok) res = await call(model === "eleven_multilingual_v2" ? "eleven_v4" : "eleven_multilingual_v2");
  if (!res.ok) throw new Error(`tts ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const d = await res.json();
  const a = d.alignment ?? d.normalized_alignment;
  const words = []; let cur = "", s0 = null, e0 = 0;
  for (let i = 0; i < (a?.characters?.length ?? 0); i++) {
    const ch = a.characters[i];
    if (/\s/.test(ch)) { if (cur) words.push({ t: cur, s: +s0.toFixed(2), e: +e0.toFixed(2) }); cur = ""; s0 = null; continue; }
    if (s0 === null) s0 = a.character_start_times_seconds[i];
    cur += ch; e0 = a.character_end_times_seconds[i];
  }
  if (cur) words.push({ t: cur, s: +s0.toFixed(2), e: +e0.toFixed(2) });
  return { audio: Buffer.from(d.audio_base64, "base64"), words, duration: words.length ? words[words.length - 1].e + 0.3 : 0 };
}

async function writeScript(shots, notes, seconds, brand) {
  if (!process.env.ANTHROPIC_API_KEY) return "";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.MONTAGE_MODEL || "claude-sonnet-5-5", max_tokens: 1200,
      system: "أنت كاتب إعلانات خليجي. تكتب تعليق صوتي قصير بلهجة خليجية طبيعية لفيديو سوشال ميديا، بجمل قصيرة واضحة تنقرأ بسلاسة (فقرة واحدة، فواصل ونقاط فقط، بدون نقاط ثلاث أو أسطر جديدة، وبإملاء خليجي مبسّط: كاف المخاطب ك وليس ج)، يوصف اللي يبين باللقطات بدون مبالغة أو معلومات مخترعة (لا أسعار ولا عروض إلا إذا ذكرها العميل)، ويبدأ بجملة تشد وينتهي بدعوة. أعد النص فقط بدون أي شرح.",
      messages: [{ role: "user", content: [
        ...shots.flatMap((f) => [{ type: "text", text: `[لقطة عند ${f.t}s]` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } }]),
        { type: "text", text: `المدة تقريباً ${seconds} ثانية (حوالي ${Math.round(seconds * 2.2)} كلمة).${brand ? ` اسم النشاط: ${brand}.` : ""}\nوصف العميل: ${notes || "إعلان جذاب"}` },
      ] }] }),
  });
  if (!res.ok) throw new Error(`claude script ${res.status}`);
  return (await res.json()).content.map((c) => c.text ?? "").join("").trim().slice(0, 1500);
}

// ---------- Directing: AI edit plan ----------
const LAYOUTS_OK = ["full", "split", "dynamic", "circle", "corner", "card"];
const GKINDS = ["headline", "timer", "counter", "steps", "compare", "icon", "flow", "checklist", "bars", "donut", "line", "quote", "arrow", "definition", "quiz", "truefalse", "timeline", "cycle", "mindmap", "proscons", "equation", "fraction", "vocab", "pyramid", "table", "fillblank", "cube", "globe", "text3d", "plot", "geometry", "burst", "confetti", "dotgrid", "sketchbars", "price", "offer", "menu", "rating", "testimonial", "contact", "specs", "appointment", "beforeafter", "countdown", "delivery", "hours"];
const GICONS = "check,x,leaf,bread,bowl,heart,star,bolt,clock,phone,chat,gift,cart,tag,chart,shield,sparkle,pin,users,drop,book,bulb,video,camera,mic,money,rocket,target,brain,scissors,play,question,trophy,calendar,laptop,grad,eye,lock".split(",");
/** Same rules as cleanGraphics() in src/remotion/montage.ts. */
function cleanGraphic(x, at) {
  if (!x || typeof x !== "object") return null;
  const kind = GKINDS.includes(x.kind) ? x.kind : "headline";
  const str = (v, n) => (v === undefined || v === null || v === "" ? undefined : String(v).slice(0, n));
  const icon = (v) => (GICONS.includes(String(v)) ? String(v) : undefined);
  const g = { kind, at, dur: +Math.max(1, Math.min(8, Number(x.dur) || 3)).toFixed(2), text: str(x.text, 70), hl: str(x.hl, 30), sub: str(x.sub, 40),
    value: x.value !== undefined && x.value !== null && x.value !== "" && Number.isFinite(Number(x.value)) ? Math.max(0, Number(x.value)) : undefined,
    suffix: str(x.suffix, 12), icon: icon(x.icon), emoji: str(x.emoji, 4), bad: str(x.bad, 50), good: str(x.good, 50),
    items: Array.isArray(x.items) ? x.items.slice(0, kind === "flow" ? 3 : ["mindmap", "table", "proscons", "menu", "specs", "hours"].includes(kind) ? 6 : ["bars", "timeline", "cycle", "pyramid"].includes(kind) ? 5 : 4).map((i) => (typeof i === "string" ? { label: i.slice(0, 40) } : { label: String(i?.label ?? "").slice(0, 40), ...(icon(i?.icon) ? { icon: icon(i.icon) } : {}), ...(Number.isFinite(Number(i?.value)) && i?.value !== null && i?.value !== "" ? { value: Number(i.value) } : {}) })).filter((i) => i.label || i.icon) : undefined,
    values: Array.isArray(x.values) ? x.values.slice(0, 12).map(Number).filter(Number.isFinite) : undefined,
    fx: ["marker", "circle", "underline", "typewriter"].includes(x.fx) ? x.fx : undefined,
    shape: ["triangle", "square", "circle", "hexagon"].includes(x.shape) ? x.shape : undefined };
  for (const k of Object.keys(g)) if (g[k] === undefined) delete g[k];
  return g.text || g.items?.length || g.values?.length || g.bad || g.good || g.icon || g.emoji || g.value !== undefined ? g : null;
}
const PLAN_SYSTEM = () => `أنت مونتير محترف لريلز السوشال ميديا الخليجية. عندك نص فيديو مع توقيت كل جملة بالثواني (من الفيديو الأصلي).
مهمتك: خطة مونتاج JSON فقط، بالشكل:
{
 "hook": {"s":0,"e":0} أو null   // أقوى جملة قصيرة (2-6 ثواني) تنعرض بالبداية لتشد المشاهد
 "keep": [{"s":0,"e":0}]          // المقاطع اللي تنحفظ بالترتيب الزمني، احذف الأخطاء والتكرار والتأتأة والكلام الضعيف
 "titles": [{"text":"","at":0,"dur":2.5,"pos":"top","style":"kinetic","hl":"","sub":""}]   // نصوص على الفيديو، "at" بتوقيت الفيديو الأصلي. text قصير (2-6 كلمات). style: kinetic (كلمات تنط وحدة ورا وحدة، للهوك والجمل القوية) أو marker (قلم تظليل على كلمة hl) أو typewriter (تنكتب حرف حرف) أو editorial (عنوان أنيق مع سطر صغير sub فوقه وخط ملوّن، للمعلومات) أو lower (شريط جانبي للأسماء والأسعار والأماكن) أو pill (شارة). hl: كلمة أو كلمتين من text تتلوّن باللون المميز. sub: سطر صغير اختياري
 "zooms": [{"at":0,"dur":2,"scale":1.15}]               // تكبير عند الجمل المهمة، scale بين 1.08 و1.25
 "intro": {"on":true,"title":"","subtitle":""},          // بطاقة افتتاحية قصيرة
 "outro": {"on":true,"title":"","subtitle":""},          // بطاقة ختامية (دعوة للمتابعة/التواصل)
 "colors": {"text":"#FFFFFF","accent":"#hex","bg":"#hex"},
 "font": "Cairo|Tajawal|Almarai|Changa|Amiri",
 "caption_style": "karaoke|pop|highlight|box|neon|outline|minimal",  // pop: كلمتين كبار تنط (ستايل ريلز المشاهير) | highlight: الكلمة الحالية بخلفية ملوّنة | neon: مضيء | outline: إطار أسود عريض
 "caption_pos": "bottom|middle|top",  // مكان الترجمة، الافتراضي bottom
 "transition": "none|whip|slide|zoom|spin|glitch|shake|blur|flash|dip",  // انتقال عند كل قطع: whip سحبة سريعة، slide انزلاق، spin دوران، glitch تشويش رقمي (تقني وشبابي)، shake هزّة (حماس)، blur تمويه ناعم، flash وميض، dip تعتيم أسود (هادي وفخم)
 "drift": true,                        // حركة تكبير بطيئة سينمائية على كل لقطة (ممتازة للقطات الصامتة والمنتجات)
 "vignette": false,                    // حواف داكنة خفيفة (للستايل السينمائي والفاخر)
 "broll": [{"i":1,"at":0,"dur":2.5}],  // إذا فيه صور إضافية: رقم الصورة ووقت ظهورها (بتوقيت الفيديو الأصلي) عند الكلام المرتبط فيها، لا تغطي الهوك
 "grade": "none|natural|vivid|pop|reels|warm|sunset|cool|luxury|cinematic|bw",  // ستايل الألوان المناسب (الأكل: vivid أو warm أو pop، الفخم: luxury، التقني: cool، الريلز الحماسي: reels)
 "original_audio": "keep|low|mute",   // صوت الفيديو الأصلي: keep إذا فيه كلام مهم، low إذا أصوات المكان حلوة، mute إذا ضجيج
 "music_prompt": "",                  // إذا ما فيه كلام أو فيه تعليق صوتي: وصف إنجليزي قصير لموسيقى خلفية مناسبة (إذا طلب العميل همهمة اكتب: soft female vocal humming)، وإلا ""
 "layout": "full|split|dynamic|circle|corner|card",  // split شاشة مقسومة (رسوم فوق والمتكلم تحت، ممتاز للشرح والتعليم) | dynamic المتكلم ملء الشاشة ويصغر لدائرة لما يطلع مشهد | circle المتكلم بدائرة والرسوم حوله | corner المتكلم بمربع صغير بالزاوية | card المتكلم ببطاقة. إذا العميل اختار شكل معيّن التزم فيه
 "graphics": [{"kind":"timer","at":0,"dur":3,"text":"","hl":"","sub":""}],  // مشاهد رسوم متحركة تشرح الكلام، "at" بتوقيت الفيديو الأصلي عند بداية الجملة، dur مثل مدة الجملة (2-5 ثواني). الأنواع: headline{text,hl,sub} عنوان كبير يطلع كلمة كلمة | timer{text,hl,sub} ساعة تدور (لما يذكر وقت أو سرعة) | counter{value,suffix,text} رقم يعدّ (أرقام ونسب) | steps{text,items[{label,icon}]} خطوات مرقّمة | checklist{text,items[{label}]} قائمة صح | compare{text,bad,good} الغلط مقابل الصح | icon{icon أو emoji,text,sub} أيقونة كبيرة مع جملة | flow{items[{icon,label}] من 2 إلى 3,text} أيقونات بينها أسهم (فكرة ← أداة ← نتيجة) | bars{text,suffix,items[{label,value}]} أعمدة | donut{value 0-100,text} دائرة نسبة | line{text,values[]} خط بياني | quote{text,sub} اقتباس | arrow{text} سهم يأشّر تحت. headline/quote/arrow تقبل fx: marker|circle|underline|typewriter (تأثير على كلمة hl). ومشاهد إضافية: cube{text,items[{label,icon}]} مكعب 3D يدور | globe{text} كرة أرضية | text3d{text,sub} نص 3D | plot{text,hl sin|cos|x2|linear|exp} رسم دالة | geometry{shape triangle|square|circle|hexagon,text,items[{label}],sub} | burst{text,icon} ختم «تم» مع انفجار (للإنجازات والنتائج) | confetti{text} احتفال (للعروض والمناسبات) | dotgrid{text,value} شبكة نقاط | sketchbars{text,items[{label,value}]} رسم بياني مرسوم باليد. وتجارية: price{text,values[السعر القديم,الجديد],suffix العملة,sub} | offer{value نسبة الخصم,hl,text,sub} | menu{text,items[{label,value السعر}],suffix} | rating{value نجوم 1-5,suffix مثل "4.9",text} | testimonial{text رأي العميل,sub اسمه,value نجوم} | contact{text,items[{label: "واتساب: 9xxxxxxx",icon phone|pin|chat}]} | hours{text,items[{label: "السبت-الخميس: 9ص-10م"}]} | specs{text,items[{label,value,icon}]} | appointment{text,value رقم اليوم 0-4,sub} | beforeafter{text,bad,good} | countdown{text,value ثواني,sub} | delivery{text,sub}. وللمحتوى التعليمي: definition{text المصطلح,sub المعنى,hl كلمة صغيرة فوق مثل "تعريف"} | quiz{text السؤال,items[{label}] 2-4 اختيارات,value رقم الجواب الصح من 1} | truefalse{text العبارة,value 1 صح أو 0 خطأ,sub التوضيح} | timeline{text,items[{label,icon}] 3-5 بالترتيب} | cycle{text,items[{label,icon}] 3-5 مراحل تتكرر} | mindmap{text الفكرة الرئيسية,items[{label,icon}] 3-6 فروع} | proscons{text,items[{label,value 1 ميزة أو 0 عيب}]} | equation{text معادلة بمسافات بين الرموز مثل "2 + 3 = 5",sub} | fraction{values[البسط,المقام],text} | vocab{text الكلمة,hl النطق,sub المعنى,good جملة مثال} | pyramid{text,items[{label}] من القاعدة للقمة 3-5} | table{text العنوان,items[{label: "البند: القيمة"}] 2-6} | fillblank{text جملة فيها ___ مكان الفراغ,good الجواب,sub}. الأيقونات: check,x,leaf,bread,bowl,heart,star,bolt,clock,phone,chat,gift,cart,tag,chart,shield,sparkle,pin,users,drop,book,bulb,video,camera,mic,money,rocket,target,brain,scissors,play,question,trophy,calendar,laptop,grad,eye,lock. بالشاشة المقسومة أو circle أو corner أو card أو dynamic: حط مشهد لأغلب الأفكار المهمة (مشهد كل 4-8 ثواني تقريباً)، والباقي تنعرض فيه كلمات المتكلم تلقائياً. بملء الشاشة: مشاهد قليلة (2-4) للأرقام والخطوات بس. النصوص من الكلام نفسه، قصيرة ومركّزة
 "emojis": [{"e":"🔥","at":0,"dur":1.5}]  // إيموجي قليلة (3-6) عند لحظات مناسبة، "at" بتوقيت الفيديو الأصلي. للمحتوى الديني أو الجاد استخدم إيموجي محترمة قليلة (🤲 💡 ✅) أو لا شيء
}
إذا وصلتك صور من الفيديو (مع توقيتها): استخدمها لتفهم المحتوى، واختر أحلى اللقطات وأوضحها، واكتب عناوين تصف اللي يبين بالصورة (مثلاً اسم الطبق أو المنتج) بدون مبالغة.
أسلوبك أسلوب مونتير ريلز محترف 2026:
- أول 1.5 ثانية لازم تشد: أقوى لقطة أو جملة + نص kinetic كبير.
- الإيقاع: لقطات الكلام تمشي مع الجمل، واللقطات الصامتة 1.5-3 ثواني كل وحدة. لا تكرر نفس اللقطة.
- النصوص تكون مقروءة ومو زحمة: نص واحد بالشاشة بنفس الوقت، وكل نص يبقى 2-3.5 ثانية.
- نوّع أساليب النصوص بذكاء (kinetic للهوك، editorial للمعلومات، lower للسعر أو المكان أو الاسم).
إذا ما فيه كلام ولا تعليق صوتي (مقاطع خام لمنتج أو مطعم أو محل أو مشروع): أنت اللي تحكي القصة بالنصوص. اختر من كل لقطة أجمل 2-3 ثواني، وحط نص على كل لقطة تقريباً بالوسط (pos: center) يشرح أو يسوّق بناءً على وصف العميل واللي يبين بالصور، بتسلسل: خطّاف ← مزايا أو معلومات ← دعوة بالنهاية (مع الحساب إذا موجود). drift: true، وموسيقى مناسبة.
القواعد: التزم بالمدة المطلوبة تقريباً. لا تقص جملة من نصها. العناوين من كلام الفيديو نفسه أو تلخيص دقيق له، بدون اختراع معلومات.
نفّذ وصف العميل بدقة إذا ذكره. حسابات أو أرقام تواصل فقط إذا ذكرها العميل.
أضف بالـ JSON: "domain": "id المجال من الدليل".

دليل المجالات (نقطة بداية مو قيد):
1) حدّد مجال الفيديو من الكلام ووصف العميل واسم النشاط، واختر الأقرب من القائمة (أو ادمج مجالين).
2) طبّق ستايل المجال (الشكل، الألوان، الترجمة، الانتقال، أنواع المشاهد، الموسيقى، النبرة) إلا إذا العميل طلب غير كذا — طلب العميل دايماً أهم.
3) كن مبدع مثل مونتير محترف: نوّع أنواع المشاهد والتأثيرات (marker, circle, underline, typewriter)، لا تكرر نفس نوع المشهد مرتين ورا بعض، واربط كل مشهد بمعنى الجملة (رقم ← counter، خطوات ← steps، مقارنة ← compare، وقت ← timer، نسبة ← donut، نمو ← line، أدوات ← flow، حكمة ← quote، دعوة ← arrow).
4) للمحتوى الديني: احترام كامل، بدون موسيقى وبدون إيموجي مرحة.
${PLAYBOOK_TEXT}`;

async function claudePlan(user, shots = []) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.MONTAGE_MODEL || "claude-sonnet-5-5", max_tokens: 6000, system: PLAN_SYSTEM() + "\nأجب بـ JSON صالح فقط.",
      messages: [{ role: "user", content: [
        ...shots.flatMap((f) => [{ type: "text", text: `[صورة من الفيديو عند ${f.t}s]` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } }]),
        { type: "text", text: user },
      ] }] }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = (await res.json()).content.map((c) => c.text ?? "").join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

const hex = (v, d) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Split ranges where nobody speaks for a while (silence cut), keep a little air around words. */
function speechIslands(seg, words) {
  const inside = words.filter((w) => w.s >= seg.s - 0.05 && w.e <= seg.e + 0.1);
  if (!inside.length) return [];
  const out = []; let start = inside[0].s, last = inside[0].e;
  for (const w of inside.slice(1)) {
    if (w.s - last > 0.6) { out.push({ s: Math.max(seg.s, start - 0.12), e: Math.min(seg.e, last + 0.18) }); start = w.s; }
    last = w.e;
  }
  out.push({ s: Math.max(seg.s, start - 0.12), e: Math.min(seg.e, last + 0.18) });
  return out;
}

/** Source time → output time over the given segments (first match), or null if cut. */
function toOutput(segments, t) {
  let off = 0;
  for (const g of segments) { if (t >= g.s && t <= g.e) return off + (t - g.s); off += g.e - g.s; }
  return null;
}

async function analyzeMontage(job) {
  const dir = await mkdtemp(join(tmpdir(), "montage-"));
  try {
    const paths = (job.input.video ?? []).slice(0, 10);
    if (!paths.length) throw new Error("no video");
    const dims = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };
    const local = [];
    for (const [i, p] of paths.entries()) {
      const { data: file, error } = await db.storage.from("uploads").download(p);
      if (error) throw new Error(`download: ${error.message}`);
      const f = join(dir, `clip${i}.mp4`);
      await writeFile(f, Buffer.from(await file.arrayBuffer()));
      local.push(f);
    }
    // Several clips → one source: same size, 30fps, stereo audio (silent if a clip has none), then join.
    let path = paths[0];
    const clipRanges = [];
    let video = local[0];
    if (local.length > 1) {
      const first = await probe(local[0]);
      const [W, H] = dims[job.input.aspect] ?? (first.width > first.height ? [1920, 1080] : [1080, 1920]);
      const parts = []; let clipStart = 0;
      for (const [i, f] of local.entries()) {
        const o = join(dir, `n${i}.mp4`);
        await ff(["-i", f, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-filter_complex",
          `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,setsar=1[v]`,
          "-map", "[v]", "-map", "0:a?", "-map", "1:a", "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-ar", "44100", "-ac", "2", o]);
        // keep only the first audio stream (the clip's own when it has one)
        const o2 = join(dir, `m${i}.mp4`);
        await ff(["-i", o, "-map", "0:v", "-map", "0:a:0", "-c", "copy", o2]);
        parts.push(o2);
        const d = (await probe(o2)).duration;
        clipRanges.push({ s: +clipStart.toFixed(2), e: +(clipStart + d - 0.12).toFixed(2) }); clipStart += d;
        await setProgress(job.id, 3 + Math.round((i + 1) / local.length * 7));
      }
      await writeFile(join(dir, "list.txt"), parts.map((x) => `file '${x}'`).join("\n"));
      video = join(dir, "joined.mp4");
      await ff(["-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-c", "copy", "-movflags", "+faststart", video]);
      path = `${job.user_id}/${job.id}-joined.mp4`;
      const up = await db.storage.from("uploads").upload(path, await readFile(video), { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(`upload joined: ${up.error.message}`);
    }
    await setProgress(job.id, 10);

    const meta = await probe(video);
    if (meta.duration > MAX_SECONDS) throw new Error("VIDEO_TOO_LONG");
    const paidMinutes = Math.max(1, Math.ceil(Number(job.input.duration_seconds ?? 60) / 60));
    if (Math.ceil(meta.duration / 60) > paidMinutes + 1) throw new Error("DURATION_MISMATCH");

    if (!clipRanges.length) clipRanges.push({ s: 0, e: +meta.duration.toFixed(2) });
    const [words, shots, face, light] = await Promise.all([
      transcribe(video, dir).catch((e) => { console.error("transcribe", e?.message); return []; }),
      frames(video, dir, meta.duration).catch(() => []),
      faceTrack(video),
      brightness(video),
    ]);
    const speech = words.length >= 6;
    await setProgress(job.id, 45);

    const full = job.input.target === "full" || !(Number(job.input.target) > 0);
    const target = full ? meta.duration : Number(job.input.target);
    const { data: kitRow } = await db.from("brand_kits").select("*").eq("user_id", job.user_id).maybeSingle();
    const useBrand = job.input.use_brand !== false;
    const kit = useBrand ? kitRow : null;
    // Brand colours by role: darkest → card background, most colourful → accent.
    const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    const sat = (h) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255; };
    const kitColors = (kit?.colors ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c ?? ""));
    const brandColors = kitColors.length
      ? [[...kitColors].sort((a, b) => sat(b) - sat(a) || lum(b) - lum(a))[0], [...kitColors].sort((a, b) => lum(a) - lum(b))[0]].filter((c, i, arr) => arr.indexOf(c) === i)
      : [];
    const brollPaths = (job.input.broll ?? []).slice(0, 8);
    const lines = sentences(words).map((x) => `[${x.s.toFixed(1)}-${x.e.toFixed(1)}] ${x.text}`).join("\n");

    // Voice-over: written by the customer or by Shaheen from the shots, recorded in the chosen Gulf voice.
    let vo = null;
    const wantVo = String(job.input.voiceover ?? "").trim() || job.input.auto_vo;
    if (wantVo) {
      try {
        let text = String(job.input.voiceover ?? "").trim();
        if (text) text = await speechReady(text);
        if (!text) text = await writeScript(shots, job.input.notes, full ? Math.min(60, meta.duration) : target, kit?.business_name);
        if (text) {
          const { data: vc } = await db.from("site_content").select("value").eq("key", "voices").maybeSingle();
          const voices = vc?.value?.items ?? [];
          const voiceId = voices.some((v) => v.id === job.input.vo_voice) ? job.input.vo_voice : voices[0]?.id ?? "pNInz6obpgDQGcFmaJgB";
          const vInfo = voices.find((x) => x.id === voiceId);
          const v = await voiceOver(text, voiceId, vInfo?.model || undefined, vInfo?.settings ?? null);
          const vpath = `${job.user_id}/${job.id}/voiceover-${Date.now()}.mp3`;
          const up = await db.storage.from("results").upload(vpath, v.audio, { contentType: "audio/mpeg" });
          if (up.error) throw new Error(up.error.message);
          vo = { path: vpath, url: "", on: true, words: v.words, duration: v.duration, text };
        }
      } catch (e) { console.error("voice-over skipped", e?.message ?? e); }
    }
    await setProgress(job.id, 60);
    const voLines = vo ? sentences(vo.words).map((x) => `[${x.s.toFixed(1)}-${x.e.toFixed(1)}] ${x.text}`).join("\n") : "";

    const cards = job.input.cards === true;
    let plan = null;
    try {
      plan = await claudePlan(
        `طول الفيديو: ${meta.duration.toFixed(1)} ثانية. المدة المطلوبة: ${full ? "بدون تقصير" : `${target} ثانية تقريباً`}.\n` +
        `وصف العميل: ${job.input.notes || "مونتاج احترافي جذاب للريلز"}\n` +
        (local.length > 1 ? `الفيديو مركّب من ${local.length} لقطات ورا بعض.\n` : "") +
        (brollPaths.length ? `صور إضافية متاحة للعرض فوق الكلام: ${brollPaths.length} (مرقمة من 1). وزّعها على لحظات مناسبة.\n` : "") +
        `اسم النشاط: ${kit?.business_name || "غير محدد"}${brandColors.length ? `، ألوان الهوية: ${brandColors.join(", ")}` : ""}${kit?.handle ? `، الحساب/التواصل: ${kit.handle}` : ""}\n` +
        `اللقطات بالفيديو (بالثواني): ${clipRanges.map((c, i) => `لقطة ${i + 1}: ${c.s}-${c.e}`).join("، ")}\n` +
        (job.input.pack_brief ? `${job.input.pack_brief}\n` : "") +
        (LAYOUTS_OK.includes(job.input.layout) ? `شكل الفيديو اللي اختاره العميل: layout = ${job.input.layout}${job.input.layout !== "full" ? " — حط مشاهد graphics كثيرة تشرح الكلام" : ""}.\n` : "") +
        (cards ? "" : "مهم: العميل ما يبي بطاقات بخلفية من عندك: intro.on و outro.on = false. الدعوة بالنهاية تكون نص فوق آخر لقطة.\n") +
        `${speech ? "" : "تنبيه: ما فيه كلام واضح بالفيديو، اعتمد على الصور.\n"}` +
        (vo ? `\nمهم: فيه تعليق صوتي مدته ${vo.duration.toFixed(1)} ثانية بيغطي الفيديو كامل (التوقيت هنا بتوقيت الفيديو النهائي):\n${voLines}\n` +
          `اختر "keep" بالترتيب اللي يطابق كل جملة باللقطة المناسبة لها، ومجموع مددها ≈ ${vo.duration.toFixed(1)} ثانية. ` +
          `في هذي الحالة "at" للعناوين والإيموجي والتكبير والصور الإضافية تكون بتوقيت التعليق الصوتي (الفيديو النهائي)، و"hook": null.\n` : "") +
        `\nكلام الفيديو الأصلي:\n${lines || "(لا يوجد كلام واضح)"}`, shots);
    } catch (e) { console.error("plan fallback", job.id, e); }
    await setProgress(job.id, 75);

    // Kept ranges (chronological) → silence cut → optional hook in front → requested length.
    const fix = (g) => ({ s: clamp(Number(g?.s) || 0, 0, meta.duration), e: clamp(Number(g?.e) || 0, 0, meta.duration) });
    const basicKeep = speech || clipRanges.length < 2 ? [{ s: 0, e: meta.duration }] : clipRanges.map((c) => ({ s: c.s + Math.min(0.5, (c.e - c.s) / 4), e: Math.min(c.e, c.s + 3.5) }));
    let keep = (Array.isArray(plan?.keep) && plan.keep.length ? plan.keep.map(fix) : basicKeep).filter((g) => g.e - g.s >= 0.3);
    // with a voice-over the AI orders shots to match the narration; otherwise keep story order
    if (!vo) keep.sort((a, b) => a.s - b.s);
    if (!vo && job.input.cut_silence !== false && speech) keep = keep.flatMap((g) => speechIslands(g, words));
    if (!keep.length) keep = [{ s: 0, e: meta.duration }];
    const h = plan?.hook && !vo ? fix(plan.hook) : null;
    const hook = h && h.e - h.s >= 1 && h.e - h.s <= 8 ? h : null;
    let segments = hook ? [hook, ...keep] : keep;
    if (vo) {
      // the footage must last as long as the narration: trim, or add more shots (cycling the clips) when short
      let have = segments.reduce((a, g) => a + g.e - g.s, 0);
      let k = 0;
      while (have < vo.duration && k < 40) {
        const c = clipRanges[k % clipRanges.length];
        const from = c.s + ((Math.floor(k / clipRanges.length) * 2.5) % Math.max(0.1, c.e - c.s - 1));
        const len = Math.min(2.5, c.e - from, vo.duration - have);
        if (len > 0.4) { segments.push({ s: from, e: from + len }); have += len; }
        k++;
      }
      let left = vo.duration; const cut = [];
      for (const g of segments) { if (left <= 0.2) break; const len = Math.min(g.e - g.s, left); cut.push({ s: g.s, e: g.s + len }); left -= len; }
      segments = cut;
    } else if (!full) {
      let left = target; const cut = [];
      for (const g of segments) { if (left <= 0.3) break; const len = Math.min(g.e - g.s, left); cut.push({ s: g.s, e: g.s + len }); left -= len; }
      segments = cut;
    }
    // Never read past the end of the footage (that shows as black frames), and drop slivers.
    const endSafe = Math.max(0.5, meta.duration - 0.15);
    segments = segments.map((g) => ({ s: +Math.min(g.s, endSafe - 0.3).toFixed(2), e: +Math.min(g.e, endSafe).toFixed(2) })).filter((g) => g.e - g.s >= 0.25);
    const total = segments.reduce((a, g) => a + g.e - g.s, 0);

    // Titles/zooms come in source time: place them on the body (after the hook), else wherever they appear.
    const body = hook ? segments.slice(1) : segments;
    const hookLen = hook ? segments[0].e - segments[0].s : 0;
    const place = (arr, map) => (Array.isArray(arr) ? arr : []).slice(0, 20).flatMap((x) => {
      if (vo) { const at = Number(x.at); return Number.isFinite(at) && at >= 0 && at < total - 0.5 ? [map(x, +at.toFixed(2))] : []; }
      const inBody = toOutput(body, Number(x.at));
      const at = inBody !== null ? inBody + hookLen : toOutput(segments, Number(x.at));
      return at === null || at > total - 0.5 ? [] : [map(x, +at.toFixed(2))];
    });

    const aspect = ["9:16", "1:1", "16:9"].includes(job.input.aspect) ? job.input.aspect : meta.width > meta.height ? "16:9" : "9:16";
    const spec = {
      src: "", srcPath: path, srcW: meta.width, srcH: meta.height, aspect,
      font: ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(kit?.font) ? kit.font : ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(plan?.font) ? plan.font : "Cairo",
      colors: brandColors.length
        ? { text: "#FFFFFF", accent: brandColors[0], bg: brandColors[1] ?? hex(plan?.colors?.bg, "#0B2A4A") }
        : { text: hex(plan?.colors?.text, "#FFFFFF"), accent: hex(plan?.colors?.accent, "#C9A45C"), bg: hex(plan?.colors?.bg, "#0B2A4A") },
      captions: { on: job.input.captions !== false, style: ["karaoke", "box", "minimal", "pop", "highlight", "neon", "outline"].includes(plan?.caption_style) ? plan.caption_style : "karaoke", pos: ["bottom", "middle", "top"].includes(plan?.caption_pos) ? plan.caption_pos : "bottom" },
      segments, words,
      titles: place(plan?.titles, (x, at) => ({
        text: String(x.text ?? "").slice(0, 60), at, dur: clamp(Number(x.dur) || 2.5, 1.2, 5), pos: x.pos === "center" || (!speech && !vo) ? "center" : "top",
        style: ["kinetic", "editorial", "lower", "pill", "marker", "typewriter"].includes(x.style) ? x.style : "kinetic",
        ...(x.hl ? { hl: String(x.hl).slice(0, 30) } : {}), ...(x.sub ? { sub: String(x.sub).slice(0, 50) } : {}),
      })).filter((x) => x.text).sort((a, b) => a.at - b.at).filter((x, i, all) => i === 0 || x.at >= all[i - 1].at + 1.2),
      drift: typeof plan?.drift === "boolean" ? plan.drift : !speech,
      vignette: !!plan?.vignette || plan?.grade === "cinematic",
      zooms: place(plan?.zooms, (x, at) => ({ at, dur: clamp(Number(x.dur) || 2, 0.8, 5), scale: clamp(Number(x.scale) || 1.15, 1.05, 1.3) })),
      intro: { on: cards && !!plan?.intro?.on, title: String(plan?.intro?.title || kit?.business_name || "").slice(0, 60), subtitle: String(plan?.intro?.subtitle ?? "").slice(0, 60) },
      outro: { on: cards && (!!plan?.outro?.on || (!speech && !!kit)), title: String(plan?.outro?.title || "تابعنا للمزيد").slice(0, 60), subtitle: String(plan?.outro?.subtitle || kit?.handle || "").slice(0, 60) },
      music: null,
      transition: ["none", "flash", "zoom", "whip", "blur", "slide", "spin", "glitch", "shake", "dip"].includes(plan?.transition) ? plan.transition : local.length > 1 ? "whip" : "none",
      logo: kit?.logo_url ? { path: kit.logo_url, url: "", on: true, pos: "tl" } : null,
      face, track: face.length >= 3 && meta.width > meta.height * 1.05 && aspect !== "16:9",
      grade: ["none", "natural", "vivid", "warm", "cinematic", "pop", "reels", "luxury", "cool", "sunset", "bw"].includes(plan?.grade) ? plan.grade : "natural",
      autoBright: light < 60 ? 1.22 : light < 85 ? 1.12 : 1,
      videoVolume: vo ? (speech ? 0.12 : 0.2) : plan?.original_audio === "mute" ? 0 : plan?.original_audio === "low" || !speech ? 0.25 : 1,
      vo: vo ? { path: vo.path, url: "", on: true, words: vo.words, text: vo.text, voice: job.input.vo_voice ?? "" } : null,
      layout: LAYOUTS_OK.includes(job.input.layout) ? job.input.layout : LAYOUTS_OK.includes(plan?.layout) && (speech || plan.layout === "full") ? plan.layout : "full",
      quality: job.input.quality === "4k" ? "4k" : "1080",
      domain: PLAYBOOK.some((d) => d.id === plan?.domain) ? plan.domain : undefined,
      panel: "light",
      graphics: place(plan?.graphics, (x, at) => cleanGraphic(x, at)).filter(Boolean).filter((g) => !Array.isArray(job.input.pack_scenes) || job.input.pack_scenes.includes(g.kind) || g.kind === "headline").sort((a, b) => a.at - b.at).filter((g, i, all) => i === 0 || g.at >= all[i - 1].at + 1),
      emojis: place(plan?.emojis, (x, at) => ({ e: String(x.e ?? "").slice(0, 4), at, dur: clamp(Number(x.dur) || 1.5, 0.8, 3) })).filter((x) => x.e).slice(0, 8),
      sfx: true,
      progress: false,
      broll: [],
      subs2: null,
    };
    // Extra shots: where the AI placed them, otherwise spread evenly after the hook.
    const placedB = place(plan?.broll, (x, at) => ({ i: Math.round(Number(x.i)) - 1, at, dur: clamp(Number(x.dur) || 2.5, 1.2, 4) }))
      .filter((x) => x.i >= 0 && x.i < brollPaths.length);
    const used = new Set(placedB.map((x) => x.i));
    brollPaths.forEach((_, i) => { if (!used.has(i)) placedB.push({ i, at: hookLen + ((i + 1) * (total - hookLen)) / (brollPaths.length + 1), dur: 2.5 }); });
    spec.broll = placedB.filter((x) => x.at < total - 1).map((x) => ({ path: brollPaths[x.i], url: "", at: +x.at.toFixed(2), dur: x.dur })).sort((a, b) => a.at - b.at);
    if (spec.intro.on && !spec.intro.title) spec.intro.on = false;
    // No cards: the closing call-to-action goes on the last shot instead (unless the AI already wrote one there).
    if (!cards && total > 4 && !spec.titles.some((x) => x.at >= total - 3.5)) {
      const cta = String(plan?.outro?.title || "تابعنا للمزيد").slice(0, 40), sub = String(plan?.outro?.subtitle || kit?.handle || "").slice(0, 50);
      spec.titles.push({ text: cta, at: +(total - 3).toFixed(2), dur: 2.8, pos: "center", style: "editorial", ...(sub ? { sub } : {}) });
    }

    if (!speech || plan?.music_prompt) {
      try {
        await setProgress(job.id, 85);
        const audio = await makeMusic(plan?.music_prompt || "upbeat modern promo background music, catchy and warm", total + 5);
        const mpath = `${job.user_id}/${job.id}/music-${Date.now()}.mp3`;
        const up = await db.storage.from("results").upload(mpath, audio, { contentType: "audio/mpeg" });
        if (!up.error) spec.music = { url: "", name: "موسيقى تلقائية", path: mpath };
      } catch (e) { console.error("auto music skipped", e?.message ?? e); }
    }
    await db.from("jobs").update({ status: "draft", progress: 100, input: { ...job.input, spec }, updated_at: now() }).eq("id", job.id);
    console.log("montage planned", job.id, segments.length, "segments", plan ? "(ai)" : "(basic)");
  } catch (e) {
    await fail(job, e);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------- Rendering (motion + montage) ----------
const here = dirname(fileURLToPath(import.meta.url));
const serveUrl = await bundle({ entryPoint: join(here, "remotion", "entry.tsx"), publicDir: join(here, "..", "public") });

// Memory-safe settings: long montages with many clips can exhaust RAM (the compositor gets SIGKILLed).
const LOW_MEM = { concurrency: 1, offthreadVideoCacheSizeInBytes: 256 * 1024 * 1024, offthreadVideoThreads: 1, mediaCacheSizeInBytes: 256 * 1024 * 1024 };
async function render(job, compositionId, props, lowMem = false) {
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  try {
    const composition = await selectComposition({ serveUrl, id: compositionId, inputProps: props });
    const out = join(dir, "out.mp4");
    let last = 0;
    await setProgress(job.id, 3);
    await renderMedia({
      composition, serveUrl, codec: "h264", crf: 20, x264Preset: "veryfast", outputLocation: out, inputProps: props,
      // 4K: same layout drawn at double size (2160×3840 for 9:16)
      ...(props?.quality === "4k" ? { scale: 2, crf: 22 } : {}),
      concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
      offthreadVideoCacheSizeInBytes: 768 * 1024 * 1024,
      ...(lowMem ? LOW_MEM : {}),
      onProgress: ({ progress }) => { const p = 3 + progress * 92; if (p - last >= 4) { last = p; setProgress(job.id, p); } },
      chromiumOptions: { gl: "swangle" },
    });
    await setProgress(job.id, 97);
    const dest = `${job.user_id}/${job.id}/${crypto.randomUUID()}.mp4`;
    const up = await db.storage.from("results").upload(dest, await readFile(out), { contentType: "video/mp4" });
    if (up.error) throw new Error(`upload: ${up.error.message}`);
    await db.from("jobs").update({ status: "done", progress: 100, output: { files: [{ path: dest, type: "video/mp4" }] }, updated_at: now() }).eq("id", job.id);
    console.log("rendered", compositionId, job.id, lowMem ? "(low memory)" : "");
  } catch (e) {
    const msg = String(e?.message ?? e);
    // Out of memory: try once more, slower but lean, before giving up and refunding.
    if (!lowMem && /SIGKILL|out of memory|ENOMEM/i.test(msg)) {
      console.log("render ran out of memory, retrying lean", job.id);
      await rm(dir, { recursive: true, force: true });
      return render(job, compositionId, props, true);
    }
    await fail(job, e);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function renderMontage(job) {
  const spec = job.input.spec;
  // animated lessons (layout "board") have no source footage
  const { data } = spec.srcPath ? await db.storage.from("uploads").createSignedUrl(spec.srcPath, 60 * 60 * 3) : { data: { signedUrl: "" } };
  if (spec.srcPath && !data?.signedUrl) return fail(job, new Error("source video missing"));
  let logo = spec.logo ?? null;
  if (logo?.on && logo.path) {
    const l = await db.storage.from("uploads").createSignedUrl(logo.path, 60 * 60 * 3);
    logo = { ...logo, url: l.data?.signedUrl ?? "" };
  }
  const broll = [];
  for (const b of spec.broll ?? []) {
    const s = await db.storage.from("uploads").createSignedUrl(b.path, 60 * 60 * 3);
    if (s.data?.signedUrl) broll.push({ ...b, url: s.data.signedUrl });
  }
  let music = spec.music ?? null;
  if (music?.path) {
    const s = await db.storage.from("results").createSignedUrl(music.path, 60 * 60 * 3);
    music = { ...music, url: s.data?.signedUrl ?? "" };
  }
  let vo = spec.vo ?? null;
  if (vo?.path) {
    const s = await db.storage.from("results").createSignedUrl(vo.path, 60 * 60 * 3);
    vo = { ...vo, url: s.data?.signedUrl ?? "" };
  }
  const graphics = [];
  for (const g of spec.graphics ?? []) {
    if (!g.img) { graphics.push(g); continue; }
    const s = await db.storage.from("results").createSignedUrl(g.img, 60 * 60 * 3);
    if (s.data?.signedUrl) graphics.push({ ...g, url: s.data.signedUrl });
  }
  return render(job, "Montage", { ...spec, src: data.signedUrl, logo, broll, music, vo, graphics });
}

// ---------- Design studio: one PNG per slide ----------
const DESIGN_TOOLS = ["post", "carousel", "ad-design"];
async function renderDesign(job) {
  const dir = await mkdtemp(join(tmpdir(), "design-"));
  try {
    const spec = structuredClone(job.input.spec);
    const sign = async (img) => {
      if (!img?.path || !String(img.path).startsWith(`${job.user_id}/`)) return null;
      const { data } = await db.storage.from(img.bucket === "results" ? "results" : "uploads").createSignedUrl(img.path, 60 * 60);
      return data?.signedUrl ? { ...img, url: data.signedUrl } : null;
    };
    spec.brand.logo = await sign(spec.brand.logo);
    for (const k of Object.keys(spec.icon3d ?? {})) { const v = await sign(spec.icon3d[k]); if (v) spec.icon3d[k] = v; else delete spec.icon3d[k]; }
    for (const s of spec.slides) {
      s.photo = await sign(s.photo);
      if (s.person) s.person.photo = await sign(s.person.photo);
    }
    await setProgress(job.id, 5);
    const files = [];
    for (const [index, s] of spec.slides.entries()) {
      const props = { spec, index };
      const composition = await selectComposition({ serveUrl, id: "Design", inputProps: props });
      const out = join(dir, `${index}.png`);
      await renderStill({ composition, serveUrl, output: out, inputProps: props, imageFormat: "png", chromiumOptions: { gl: "swangle" } });
      const dest = `${job.user_id}/${job.id}/${crypto.randomUUID()}.png`;
      const up = await db.storage.from("results").upload(dest, await readFile(out), { contentType: "image/png" });
      if (up.error) throw new Error(`upload: ${up.error.message}`);
      const caption = spec.kind === "carousel" ? (index === 0 ? spec.caption : undefined) : s.caption;
      files.push({ path: dest, type: "image/png", ...(caption ? { caption } : {}) });
      await setProgress(job.id, 5 + ((index + 1) / spec.slides.length) * 90);
    }
    await db.from("jobs").update({ status: "done", progress: 100, output: { files }, updated_at: now() }).eq("id", job.id);
    console.log("design rendered", job.id, files.length);
  } catch (e) {
    // Export is free and repeatable: put the design back in the studio instead of refunding.
    console.error("design render", job.id, e?.message ?? e);
    await db.from("jobs").update({ status: "draft", progress: 0, error: String(e?.message ?? e).slice(0, 500), updated_at: now() }).eq("id", job.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log("Shaheen video worker started");

// Jobs left "running" by a crash/restart: retry once, then fail and refund (never stuck forever).
async function recoverStale(minutes) {
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data: videos } = await db.from("jobs").select("id,tool_id,input").in("tool_id", ["video-editing", "motion-video", "lesson-video"]).eq("status", "running").lt("updated_at", cutoff);
  const { data: designs } = await db.from("jobs").select("id,tool_id,input").in("tool_id", DESIGN_TOOLS).eq("input->>render", "true").eq("status", "running").lt("updated_at", cutoff);
  for (const j of [...(videos ?? []), ...(designs ?? [])]) {
    const attempts = Number(j.input?.attempts ?? 0) + 1;
    if (attempts >= 2 && DESIGN_TOOLS.includes(j.tool_id)) {
      await db.from("jobs").update({ status: "draft", progress: 0, error: "WORKER_RESTARTED", input: { ...j.input, attempts: 0 }, updated_at: now() }).eq("id", j.id);
    } else if (attempts >= 2) {
      await db.from("jobs").update({ status: "failed", error: "WORKER_RESTARTED", updated_at: now() }).eq("id", j.id);
      await db.rpc("refund_job", { p_job: j.id });
      console.log("gave up", j.id);
    } else {
      await db.from("jobs").update({ status: "queued", progress: 0, input: { ...j.input, attempts }, updated_at: now() }).eq("id", j.id);
      console.log("re-queued", j.id);
    }
  }
}
await recoverStale(3); // interrupted jobs stop updating; a job another instance is still rendering keeps updated_at fresh
setInterval(() => recoverStale(15).catch(() => {}), 60_000);

for (;;) {
  const { data: jobs } = await db.from("jobs").select("id,user_id,tool_id,input,created_at").in("tool_id", ["video-editing", "motion-video", "lesson-video"]).eq("status", "queued").order("created_at").limit(1);
  const { data: designs } = await db.from("jobs").select("id,user_id,tool_id,input,created_at").in("tool_id", DESIGN_TOOLS).eq("status", "queued").eq("input->>render", "true").order("updated_at").limit(1);
  // Designs are quick stills: they go first so customers don't wait behind long videos.
  const job = designs?.[0] ?? jobs?.[0];
  if (!job) { await sleep(4000); continue; }
  // claim it (only one worker wins)
  const { data: claimed } = await db.from("jobs").update({ status: "running", updated_at: now() }).eq("id", job.id).eq("status", "queued").select("id");
  if (!claimed?.length) continue;
  if (DESIGN_TOOLS.includes(job.tool_id)) await renderDesign(job);
  else if (job.tool_id === "motion-video" && job.input.spec?.segments) await renderMontage(job);
  else if (job.tool_id === "motion-video") {
    const spec = { ...job.input.spec };
    if (spec.logo?.path) {
      const { data } = await db.storage.from("uploads").createSignedUrl(spec.logo.path, 60 * 60 * 3);
      spec.logo = data?.signedUrl ? { ...spec.logo, url: data.signedUrl } : null;
    }
    await render(job, "Motion", spec);
  }
  else if (job.input.render && job.input.spec) await renderMontage(job);
  else if (job.tool_id === "lesson-video") await fail(job, new Error("lesson job without render flag"));
  else await analyzeMontage(job);
}
