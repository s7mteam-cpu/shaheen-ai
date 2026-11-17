import { CHAR_GENDER } from "@/remotion/characters";
import { resolveTerrain } from "@/lib/server/maptiler";
import { voiceGender } from "@/lib/voiceGender";
import { loadLike, likeText } from "@/lib/server/like";
import { loadTemplate, templateText } from "@/lib/server/templates";
import { NextResponse } from "next/server";
import { guardContent } from "@/lib/server/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson } from "@/lib/providers/text";
import { music, speakable, ttsTimed, type VoiceSettings } from "@/lib/providers/elevenlabs";
import { saveResult } from "@/lib/providers/storage";
import { cleanPhotos, importPhotos } from "@/lib/server/photos";
import { fillClips, footageReady, footageError } from "@/lib/server/footage";
import { brandHint } from "@/lib/tools/run";
import { illustrateScenes } from "@/lib/server/illustrate";
import { ILLUS_STYLES } from "@/remotion/styles";
import { BOARD_STYLES, CAPTION_STYLES, DARK_BOARDS, DSTYLES, DSTYLE_BOARD, cleanGraphics, type BoardStyle, type MontageSpec } from "@/remotion/montage";
import { SYSTEM, type Plan } from "@/lib/server/motionPlan";
import { PLAYBOOK } from "@/remotion/playbook";
import { enforcePack, packBrief, packById } from "@/remotion/packs";
import { industryById } from "@/design/industries";
import { guessIndustry } from "@/lib/server/guessIndustry";
import { autoPlan } from "@/lib/server/autoPlan";
import { pickVoice, toneFor, TONE_HINT, withTone, type VoiceItem } from "@/lib/voiceMatch";
import { snapshot, trendsFor } from "@/lib/server/trends";
import type { Aspect } from "@/remotion/spec";

export const maxDuration = 300;

const LENGTHS = [30, 60, 90, 120];
const ASPECTS: Aspect[] = ["9:16", "1:1", "16:9", "4:5"];
const AUDIENCE: Record<string, string> = { kids: "أطفال (٥-١٠ سنوات): كلمات بسيطة جداً وجمل قصيرة ومرحة", students: "طلاب مدارس: واضح ومرتّب مع أمثلة", adults: "كبار وعامة الناس: عملي ومباشر", pros: "متخصصين: دقيق ومركّز" };
const DIALECT: Record<string, string> = { kuwaiti: "لهجة كويتية بيضاء واضحة", saudi: "لهجة سعودية بيضاء واضحة", emirati: "لهجة إماراتية بيضاء واضحة", qatari: "لهجة قطرية بيضاء واضحة", bahraini: "لهجة بحرينية بيضاء واضحة", omani: "لهجة عُمانية بيضاء واضحة",  gulf: "لهجة خليجية بيضاء", iraqi: "لهجة عراقية بيضاء واضحة", levantine: "لهجة شامية بيضاء واضحة", egyptian: "لهجة مصرية بيضاء واضحة", sudanese: "لهجة سودانية بيضاء واضحة", yemeni: "لهجة يمنية بيضاء واضحة", libyan: "لهجة ليبية بيضاء واضحة", maghrebi: "لهجة مغاربية مفهومة (دارجة مبسطة قريبة من الفصحى)", msa: "عربية فصحى مبسطة", en: "English (simple, clear)" };
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);


export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  // «تلقائي»: only the idea was written; the kind of video, length and size are read from it
  if (b.auto === true) {
    const a = await autoPlan(String(b.topic ?? ""));
    b.mode = a.goal === "edu" ? "lesson" : "motion"; b.seconds = a.seconds; b.aspect = a.aspect; b.voiceover = a.voiceover;
    if (a.gender) b.vgender = a.gender;
    if (a.age) b.vage = a.age;
    if (a.tone) b.tone = a.tone;
    if (a.goal === "edu" && !b.look) b.look = "doodle";
  }
  const real = b.tool === "real-scenes"; // «مشاهد واقعية»: real stock footage under the voice, its own tool
  if (real) { b.mode = "motion"; b.look = "footage"; b.voiceover = b.voiceover !== false; }
  const motion = b.mode === "motion";
  const brand = String(b.brand ?? "").slice(0, 60);
  const toolId = real ? "real-scenes" : "motion-video"; // one tool for ads and educational videos (b.mode: "motion" = ad, otherwise educational)
  const topic = String(b.topic ?? "").trim().slice(0, 8000);
  if (topic.length < 5) return NextResponse.json({ error: motion ? "اكتب فكرة الفيديو." : "اكتب الدرس أو الفكرة." }, { status: 400 });
  { const bad = await guardContent(user.id, b, toolId); if (bad) return bad; }
  const seconds = motion ? ([15, 30, 60].includes(Number(b.seconds)) ? Number(b.seconds) : 30) : LENGTHS.includes(Number(b.seconds)) ? Number(b.seconds) : 60;
  // the field is optional: if the customer didn't pick one, read it from their text
  const ind = industryById(String(b.industry ?? "")) ?? industryById(await guessIndustry(`${brand ? `${String(b.brand)}: ` : ""}${topic}`));
  const pack = packById(ind?.id);
  const guide = ind && pack ? packBrief(pack, ind.label) : "";
  const voiceOn = motion ? b.voiceover === true : true;
  const tone = toneFor(typeof b.tone === "string" ? b.tone : undefined, motion ? "ad" : "edu", ind?.group); // narration tone: chosen, or read from the kind of video

  const aspect = ASPECTS.includes(b.aspect as Aspect) && (real || b.aspect !== "4:5") ? (b.aspect as Aspect) : "9:16";
  const audience = AUDIENCE[String(b.audience)] ? String(b.audience) : "students";
  const dialect = DIALECT[String(b.dialect)] ? String(b.dialect) : "kuwaiti";
  const panel = b.panel === "dark" ? "dark" : "light";
  const withMusic = b.music !== false;
  const full = b.cartoonMix === "full"; // cartoon in every scene, writing on top
  const look = b.look === "doodle" ? "doodle" : b.look === "cartoon" ? "cartoon" : b.look === "footage" ? "footage" : "images"; // images = montage with AI pictures · doodle = real hand-drawn animation
  const drawings = look === "images" ? b.drawings !== false : false;
  const tpl = motion ? await loadTemplate(b.templateId) : null; // a library template: its style, structure and look
  const illus = tpl ? tpl.style : ILLUS_STYLES.some((x) => x[0] === b.illus) ? String(b.illus) : undefined;
  // how many AI drawings: few (2-5 scenes), half of the scenes, or every scene
  const level = b.drawLevel === "all" ? "all" : b.drawLevel === "half" ? "half" : "few";
  const howMany = level === "all" ? "كل مشهد بالفيديو لازم يكون من نوع scene (رسمة بالذكاء الاصطناعي) بدون استثناء، والنص القصير يطلع فوق الرسمة (text وhl وsub)"
    : level === "half" ? "اجعل حوالي نصف مشاهد الفيديو من نوع scene (رسمة بالذكاء الاصطناعي) موزعة بالتساوي، والباقي مشاهد عادية (عناوين، خطوات، أرقام…)"
    : "استخدم مشهد scene (رسمة بالذكاء الاصطناعي) من 2 إلى 5 مرات بالفيديو للقصص والأمثلة والأماكن والشخصيات";
  const drawHint = look === "cartoon"
    ? "الفيديو بأسلوب كرتون خليجي: شخصية كرتون تتكلم وتتحرك بكل مشهد تقريباً. اختر شخصية رئيسية وحدة (char) تتكرر بأغلب المشاهد بحسب موضوع الفيديو وجنس الصوت (رجّال man أو جدّ elder أو حرمة woman أو ولد boy أو بنت girl)، ويمكن شخصية ثانية لبعض المشاهد للتنويع. غيّر mood وpose حسب الجملة (point لما تشرح شي بجانبها، wave للترحيب والختام). وكثير من المشاهد ضيف doodle رسمة تنرسم بجانب الشخصية لتوضّح الفكرة وبدّل side بين l وr. "+(full ? "كل المشاهد بدون استثناء من نوع character، والنص (text وhl وsub) يكتب فوق الشخصية، وكل مشهد معه doodle يوضّح الفكرة. لا تستخدم أي نوع مشهد غير character." : "وبين الحين والثاني مشهد شرح عادي (رقم، خطوات، جدول، مقارنة، عنوان) للتنويع بين الكرتون والشرح.")+" لا تستخدم scene أبداً. واختر board من: paper, notebook, soft, pastel."
    : look === "footage"
    ? "الفيديو بلقطات واقعية حقيقية بدون ظهور متحدث (صوت تعليق فوق لقطات). أغلب المشاهد (70% أو أكثر) من نوع clip: حقل q كلمات بحث بالإنجليزي من 2 إلى 4 كلمات تصف لقطة واقعية تناسب معنى الجملة بالضبط (مثلاً modern apartment interior، family eating dinner، hands typing laptop)، بدون ذكر أسماء أماكن محلية، وفضّل لقطات بدون وجوه واضحة (مباني، أكل، أيدي، طبيعة، شوارع، منتجات)، وبدون كتابة أو شعارات داخل اللقطة. اكتب q بوصف فاخر ونظيف ومضيء (مثل modern luxury apartment interior bright، clean modern kitchen، sea view balcony)، وتجنّب كلمات مثل old أو building أو construction أو ruins لأنها تجيب مباني مهجورة، ولا تكرر نفس q بين مشهدين. والنص القصير text وhl وsub يطلع فوق اللقطة. والباقي مشاهد عادية للعروض والأسعار والتواصل والختام (headline، offer، price، contact…). لا تستخدم scene ولا doodle ولا character. واختر board من: night, soft."
    : look === "doodle"
    ? "الفيديو بأسلوب رسوم متحركة حقيقية: استخدم مشهد doodle في أغلب المشاهد (60% أو أكثر) لأن الرسمة تنرسم باليد وتتحرك. اختر اسم الرسمة doodle من القائمة بما يناسب معنى الجملة، ولما تكون الجملة فيها عدة أفكار (2-4) استخدم doodle بصف items [{doodle,label}]. والمشاهد الباقية تكون عنوان أو خطوات أو رقم. لا تستخدم مشهد scene أبداً. واختر board من: paper, notebook, soft, dots."
    : drawings
    ? `${howMany}، و prompt يكون وصف إنجليزي واضح للرسمة بدون أي كتابة داخلها.${illus ? "" : " واختر \"illus\" ستايل الرسومات المناسب من: " + ILLUS_STYLES.map((x) => x[0]).join(", ") + "."}`
    : "لا تستخدم مشهد scene.";
  if (look === "footage" && !footageReady()) return NextResponse.json({ error: "اللقطات الواقعية مو مفعّلة بعد (تحتاج مفتاح Pixabay أو Pexels من الإدارة)." }, { status: 503 });
  const admin = createAdminClient();

  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", toolId).single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const cost = Math.max(1, Math.round(seconds / 15)) * tool.credit_cost;

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
    const like = await loadLike(b.likeWork);
    // the customer's own photos (product, dish, property…): brought in first, the writer places each one in a scene
    const photoIn = cleanPhotos(b.photos, user.id);
    const photoOut = (await importPhotos(user.id, job.id, photoIn, aspect)).map((p, i) => (p ? { ...p, n: i + 1 } : null)).filter((p): p is { img: string; label: string; n: number } => !!p);
    const photoAsk = photoOut.length ? `\nصور العميل نفسه (${photoOut.length}): ${photoOut.map((p) => `${p.n}) ${p.label || "صورة"}`).join(" · ")}.\nلازم تستخدم كل صورة مرة وحدة على الأقل، بمشهد من نوع scene بحقل photo برقم الصورة (بدون prompt)، بالوقت اللي يتكلم فيه الصوت عنها، ويطلع فوقها نص قصير (text وhl وsub مثل الاسم أو السعر أو العرض). لا ترسم بدالها. هذي الصور مستثناة من أي منع لمشاهد scene.\n` : "";
    const ask = (tpl ? `${templateText(tpl, drawings ? level : "none")}\n\n` : "") + (like ? `${likeText(like)}\n\n` : "") + `${motion ? "فكرة الفيديو" : "الدرس / الفكرة"}:\n${topic}\n\n${brand ? `اسم النشاط: ${brand}\n` : ""}${motion ? "" : `الجمهور: ${AUDIENCE[audience]}\n`}اللغة: ${DIALECT[dialect]}\n${voiceOn ? `نبرة التعليق: ${TONE_HINT[tone]}\n` : ""}المدة: ${seconds} ثانية تقريباً (${voiceOn ? `حوالي ${words} كلمة بالمجموع، ${Math.round(words / 11)} جملة تقريباً` : `${Math.max(3, Math.round(seconds / 3.5))} مشاهد تقريباً، بدون صوت`}).\n${b.notes ? `ملاحظات العميل: ${String(b.notes).slice(0, 500)}\n` : ""}${await brandHint(user.id)}\n${await trendsFor(ind?.id, "motion")}${photoAsk}`;
    let plan: Plan;
    try { plan = await aiJson<Plan>(SYSTEM(drawHint, motion, guide, voiceOn), ask, 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    catch { plan = await aiJson<Plan>(SYSTEM(drawHint, motion, guide, voiceOn), ask + "\nمهم: أعد JSON صالح ومكتمل فقط.", 9000, { provider: "claude", model: "claude-sonnet-5-5" }); }
    const lines = (plan.lines ?? []).map((l) => ({ say: String(l.say ?? "").replace(/\s+/g, " ").trim(), dur: Number(l.dur) || 0, scene: l.scene }))
      .filter((l) => (voiceOn ? l.say : l.scene)).slice(0, 40);
    if (!lines.length) throw new Error("empty script");
    if (tpl) { // the template's look (colors, font, board) is kept; the brand kit still wins below
      const k = tpl.skeleton;
      plan.colors = { accent: k.colors?.accent ?? plan.colors?.accent, bg: k.colors?.bg ?? plan.colors?.bg };
      if (k.font) plan.font = k.font;
      if (k.board) plan.board = k.board;
    }
    await admin.from("jobs").update({ progress: 35 }).eq("id", job.id);

    let timed: (typeof lines[number] & { s: number; e: number })[];
    let total: number;
    let vo: MontageSpec["vo"] = null;
    if (voiceOn && lines.some((l) => l.say)) {
      // 2) voice with word timings
      const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
      const voices = ((vc?.value as { items?: VoiceItem[] })?.items ?? []);
      // a voice picked by name wins; otherwise the best match for the dialect, gender and age the customer asked for
      let voiceId = voices.some((v) => v.id === b.voice) ? String(b.voice) : pickVoice(voices, { dialect, gender: String(b.vgender ?? ""), age: String(b.vage ?? "") })?.id ?? "pNInz6obpgDQGcFmaJgB";
      if (look === "cartoon") { // the narrator follows the main character: a man's voice for a man, a woman's for a woman
        const cnt: Record<string, number> = {};
        for (const l of lines) { const sc = l.scene as { kind?: string; char?: string } | undefined; if (sc?.kind === "character" && sc.char) cnt[sc.char] = (cnt[sc.char] ?? 0) + 1; }
        const main = (Object.entries(cnt).sort((a, c) => c[1] - a[1])[0]?.[0] ?? "man") as keyof typeof CHAR_GENDER;
        const want = CHAR_GENDER[main];
        const cur = voiceGender(voices.find((x) => x.id === voiceId));
        if (want && cur && cur !== want) { const alt = voices.find((x) => voiceGender(x) === want); if (alt) voiceId = alt.id; }
      }
      const vInfo = voices.find((x) => x.id === voiceId);
      const spoken = lines.filter((l) => l.say);
      const text = spoken.map((l) => (/[.!؟?]$/.test(l.say) ? l.say : `${l.say}.`)).join(" ");
      const v = await ttsTimed(text, voiceId, vInfo?.model || undefined, withTone(vInfo?.settings, tone));
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
    const cleaned = cleanGraphics(timed.filter((l) => l.scene).map((l, i, all) => ({ ...l.scene, at: Math.max(0, l.s - 0.1), dur: Math.max(1.6, ((all[i + 1]?.s ?? total) - l.s) - 0.05) })), total);
    // scenes made from the customer's own photos are kept apart: the pack rules and the cartoon switch must not remove them
    const photoScenes = cleaned.filter((g) => g.kind === "scene" && g.photo && photoOut.some((p) => p.n === g.photo))
      .map((g) => { const p = photoOut.find((x) => x.n === g.photo)!; const { photo: _p, prompt: _q, ...rest } = g; void _p; void _q; return { ...rest, img: p.img }; });
    const clipScenes = cleaned.filter((g) => g.kind === "clip");
    const kept = enforcePack(cleaned.filter((g) => !(g.kind === "scene" && g.photo) && g.kind !== "clip"), pack);
    let graphics = kept.graphics;
    if (look === "cartoon" && full) { // cartoon in every scene: turn any other scene into the main character with its text on top
      const count: Record<string, number> = {};
      for (const g of graphics) if (g.kind === "character" && g.char) count[g.char] = (count[g.char] ?? 0) + 1;
      const main = (Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "man") as NonNullable<typeof graphics[number]["char"]>;
      graphics = graphics.map((g, i) => ({ ...(g.kind === "character" ? g : { kind: "character" as const, at: g.at, dur: g.dur, char: main, mood: "happy" as const, pose: "point" as const, text: g.text ?? g.sub ?? g.good, hl: g.hl, doodle: g.doodle, side: i % 2 ? "l" as const : "r" as const }), tpos: "top" as const }));
    }

    // 3b) AI-drawn scenes, all at once
    if (drawings) graphics = await illustrateScenes(user.id, job.id, graphics, style, aspect, level === "all" ? 10 : level === "half" ? 8 : 6);
    else graphics = graphics.filter((g) => g.kind !== "scene");
    if (look === "footage" && clipScenes.length) {
      const filled = await fillClips(clipScenes, aspect, user.id, job.id, { topic, industry: ind?.label });
      // no real clip at all means this is not what the customer asked for: refund instead of handing over a different kind of video
      if (!filled.some((g) => g.kind === "clip")) throw new Error(`no clips found: ${footageError() || "search returned nothing"} | q=${clipScenes.map((g) => g.q).join(" ; ").slice(0, 200)}`);
      graphics = [...graphics, ...filled].sort((a, b) => a.at - b.at);
    }
    if (photoScenes.length) graphics = [...graphics, ...photoScenes].sort((a, b) => a.at - b.at);
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
    // three separate choices: the look of the pictures, the look of the cartoon character, and the background
    const dstyle = look !== "images" ? DSTYLES.find((x) => x[0] === b.dstyle)?.[0] : undefined;
    const cstyle = look === "cartoon" ? DSTYLES.find((x) => x[0] === b.cstyle)?.[0] : undefined;
    const chosenBoard = boards.includes(b.board as BoardStyle) ? (b.board as BoardStyle) : undefined;
    const forcedBoard = chosenBoard ? undefined : (cstyle && cstyle !== "marker" ? DSTYLE_BOARD[cstyle] : undefined) ?? (dstyle && dstyle !== "marker" ? DSTYLE_BOARD[dstyle] : undefined); // only when the customer left the background on «auto»
    const board: BoardStyle = forcedBoard ? forcedBoard : boards.includes(b.board as BoardStyle) ? (b.board as BoardStyle)
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
      illus: style, borrowed: kept.borrowed, music: musicTrack, layout: "board", panel: DARK_BOARDS.includes(board) ? "dark" : panel, board, ...(dstyle && dstyle !== "marker" ? { dstyle } : {}), ...(b.tpos === "top" ? { tpos: "top" as const } : {}), ...(Number(b.tscale) >= 0.6 && Number(b.tscale) <= 1.6 && Number(b.tscale) !== 1 ? { tscale: Number(b.tscale) } : {}), ...(cstyle && cstyle !== "marker" ? { cstyle } : {}), graphics, domain,
      vo,
      videoVolume: 0, sfx: true, progress: !motion, quality: "1080",
    };
    await resolveTerrain(spec);
    await admin.from("jobs").update({ status: "draft", progress: 100, title: String(plan.title || topic).slice(0, 80), input: { topic, seconds, aspect, audience, dialect, industry: ind?.id ?? null, first: snapshot(spec as unknown as Record<string, unknown>), spec } }).eq("id", job.id);
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    console.error("lesson", e);
    await admin.from("jobs").update({ status: "failed", error: `lesson: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
    await admin.rpc("refund_job", { p_job: job.id });
    return NextResponse.json({ error: motion ? (real ? "ما لقينا لقطات تناسب النص الحين، ورجّعنا لك الريش. جرّب تعدّل النص أو تحاول مرة ثانية." : "ما قدرنا نسوي الفيديو الحين، ورجّعنا لك الريش. حاول مرة ثانية.") : "ما قدرنا نسوي الدرس الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
  }
}
