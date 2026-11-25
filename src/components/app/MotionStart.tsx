"use client";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LikeNote } from "@/components/app/LikeNote";
import { Progress } from "@/components/app/Progress";
import { IndustryPicker } from "@/components/app/IndustryPicker";
import { PhotoPicker, type Photo } from "@/components/app/PhotoPicker";
import { industryById } from "@/design/industries";
import { More } from "@/components/app/Collapse";
import { focusFor } from "@/lib/videoFocus";
import { TONES, VOICE_AGES, voiceDialects } from "@/lib/voiceMatch";
import { ILLUS_STYLES } from "@/remotion/styles";

const adLengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const eduLengths = [[30, "30 ثانية"], [60, "دقيقة"], [90, "دقيقة ونص"], [120, "دقيقتين"]] as const;
const aspects = [["9:16", "ريلز / تيك توك 9:16"], ["1:1", "مربع 1:1"], ["16:9", "يوتيوب عريض 16:9"]] as const;
const audiences = [["kids", "أطفال"], ["students", "طلاب"], ["adults", "عامة الناس"], ["pros", "متخصصين"]] as const;
const PHOTO_TITLE: Record<string, string> = {
  "أكل وشرب": "صور الأطباق والمنتجات", "تعليم وتدريب": "صور الشرح أو المادة أو المكان", "بناء وعقار": "صور العقار أو المشروع",
  "جمال وأزياء": "صور المنتج أو قبل وبعد", "سيارات وخدمات": "صور السيارة أو الخدمة", "صحة ورياضة": "صور الخدمة أو النتيجة",
  "متاجر وتقنية": "صور المنتج", "خدمات": "صور الخدمة أو العمل",
};
const dialects: (readonly [string, string])[] = [...GULF_DIALECTS.map(([v, ar]) => [v, ar] as const), ["en", "English"]];
const panels = [["auto", "حسب مجالي"], ["light", "فاتحة"], ["dark", "داكنة"]] as const;
const boards = [["auto", "تلقائي (مختلف كل مرة)"], ["soft", "ناعم"], ["paper", "ورق"], ["grid", "مربعات"], ["dots", "نقاط"], ["notebook", "دفتر مسطّر"], ["chalk", "سبورة طباشير"], ["blueprint", "مخطط أزرق"], ["night", "ليلي"], ["neon", "نيون داكن"], ["pastel", "باستيل للأطفال"], ["sunrise", "شروق دافئ"]] as const;

/** Motion graphics: one form for ads and educational videos. */
export function MotionStart({ template, likeId, idea: ideaIn = "", costPer15, balance, brand, voices = [], industry: savedIndustry }: { template?: { id: string; title: string; thumb: string | null; style: string; seconds: number }; likeId?: string; idea?: string; costPer15: number; balance: number; brand?: string; voices?: { id: string; name: string; note?: string; dialects?: string[] }[]; industry?: string }) {
  const router = useRouter();
  const [auto, setAuto] = useState(!template); // «تلقائي»: write the idea and press create, Shaheen decides the rest
  const [goal, setGoal] = useState<"ad" | "edu">("ad");
  const [focus, setFocus] = useState("");
  const [idea, setIdea] = useState(ideaIn);
  const [name, setName] = useState(brand ?? "");
  const [notes, setNotes] = useState("");
  const [seconds, setSeconds] = useState(template ? ([15, 30, 60].reduce((a, b) => (Math.abs(b - template.seconds) < Math.abs(a - template.seconds) ? b : a))) : 30);
  const [aspect, setAspect] = useState("9:16");
  const [audience, setAudience] = useState("students");
  const [dialect, setDialect] = useState<string>("kuwaiti");
  const availD = voiceDialects(voices);
  useEffect(() => { setDialect(myDialect()); }, []);
  const [industry, setIndustry] = useState(savedIndustry ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [voiceover, setVoiceover] = useState(true);
  const [voice, setVoice] = useState(""); // "" = Shaheen picks the best match
  const [vgender, setVgender] = useState("");
  const [vage, setVage] = useState("");
  const [tone, setTone] = useState("auto");
  const [withMusic] = useState(false); // v302: no AI background music (customers add their own sound in the studio)
  const [drawings, setDrawings] = useState(true);
  const [mix, setMix] = useState<"full" | "mixed">("mixed");
  const [board, setBoard] = useState<string>("auto");
  const [dstyle, setDstyle] = useState<string>("marker");
  const [cstyle, setCstyle] = useState<string>("marker");
  const [look, setLook] = useState<"images" | "doodle" | "cartoon">("images");
  const [level, setLevel] = useState<"few" | "half" | "all">(template ? "all" : "few");
  const [tpos, setTpos] = useState<string>("");
  const [tscale, setTscale] = useState<number>(1);
  const [illus, setIllus] = useState(template?.style ?? "auto");
  const [panel, setPanel] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edu = goal === "edu";
  useEffect(() => { if (availD && (edu || voiceover) && !availD.has(dialect)) setDialect(dialects.find(([v]) => availD.has(v))?.[0] ?? "kuwaiti"); }, [availD, edu, voiceover, dialect]);
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15;
  const [pct, setPct] = useState(0);
  // Writing takes ~10-30s: move smoothly towards 95%, the last 5% when it is done.
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.05), 450);
    return () => clearInterval(t);
  }, [busy]);

  const photoTitle = PHOTO_TITLE[industryById(industry)?.group ?? ""] ?? "صور منتجك أو نشاطك";
  const photosBody = photos.map((p) => ({ path: p.path, bucket: p.bucket, label: p.label }));
  const focuses = focusFor(industry);
  const focusNote = focuses.find((f) => f.id === focus)?.note ?? "";
  function pickGoal(g: "ad" | "edu") {
    if (g === goal) return;
    setGoal(g);
    setSeconds(g === "edu" ? 60 : 30);
    if (!template) setLook(g === "edu" ? "doodle" : "images");
  }
  // the field decides which questions follow: its goals (offer, menu, lesson…) and whether the video is an ad or an explainer
  function pickField(id: string) {
    setIndustry(id);
    const first = focusFor(id)[0];
    setFocus(first?.id ?? "");
    if (first) pickGoal(first.goal);
  }
  function pickFocus(f: ReturnType<typeof focusFor>[number]) { setFocus(f.id); pickGoal(f.goal); }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        mode: edu ? "lesson" : "motion", topic: idea, notes: [focusNote, notes].filter(Boolean).join("\n"), brand: edu ? undefined : name, industry, audience, seconds, aspect, dialect, panel: panel === "auto" ? undefined : panel, board,
        voiceover: edu ? true : voiceover, voice, vgender, vage, tone, music: withMusic, look, dstyle, cstyle, cartoonMix: mix, drawLevel: level, drawings, illus: illus === "auto" ? undefined : illus,
        tpos, tscale, templateId: template?.id, likeWork: likeId, photos: photosBody }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/motion-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  async function goAuto(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ auto: true, topic: idea, brand: name, industry, likeWork: likeId, photos: photosBody }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/motion-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );
  const showVoice = (edu || voiceover) && voices.length > 0;

  if (auto) return (
    <form onSubmit={goAuto} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <IndustryPicker value={industry} onChange={setIndustry} title={false} optional hint="شو مجالك؟ (اختياري) شاهين يعرف منه النبرة والمشاهد والألوان المناسبة. إذا تخطيته يخمّنه من كلامك." />
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("اكتب اللي تبيه، وشاهين يسوي الباقي")}</span>
        <textarea required minLength={5} maxLength={8000} rows={6} value={idea} onChange={(e) => setIdea(e.target.value)} className="field"
          placeholder={L("مثال: إعلان لمطعم فريد الصويلح بالكويت، خصم 20٪ على الوجبات العائلية هالأسبوع، ريلز مع تعليق صوتي. أو: اشرح للطلاب الفرق بين الكسور العشرية والاعتيادية.")} /></label>
      <PhotoPicker photos={photos} onChange={setPhotos} title={photoTitle} hint="ارفع صورك الحقيقية وتطلع بالفيديو بدل الرسم." />
      <p className="text-[13px] text-subtle">{L("شاهين يختار لحاله: إعلان أو شرح، المدة، المقاس، الستايل. اكتب اللي تبيه بكلامك (مدة، مقاس، «بدون صوت»…) ويلتزم فيه. والفيديو يطلع بتعليق صوتي خليجي إلا إذا طلبت غير ذلك.")}</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يكتب ويرسم ويجهّز الفيديو…")} /> : (
        <button disabled={idea.trim().length < 5 || balance < costPer15} className="btn btn-gold py-3.5 text-[16px]">✨ {L("أنشئ الفيديو")}</button>
      )}
      {!busy && <button type="button" onClick={() => { setAuto(false); if (industry && !focus) pickField(industry); }} className="btn btn-primary py-3.5 text-[16px]">⚙️ {L("أبي أختار بنفسي")}</button>}
      {!busy && <p className="text-center text-[13px] text-subtle">{L("اختار بنفسك: المجال، الستايل، المدة، الصوت، الخلفية…")}</p>}
      {!busy && <p className="text-center text-[13px] text-subtle">{L("السعر يعتمد على المدة: من")} {costPer15} {L("ريشة (15 ثانية)، وفيديو 30 ثانية")} {costPer15 * 2} {L("ريشة.")}</p>}
      {balance < costPer15 && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
    </form>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      {template && <LikeNote like={{ title: `قالب «${template.title}»`, thumb: template.thumb }} />}
      {!template && <button type="button" onClick={() => setAuto(true)} className="btn btn-outline self-start px-4 py-2 text-[14px]">{L("← رجوع للوضع التلقائي (اكتب فكرتك بس)")}</button>}
      <IndustryPicker value={industry} onChange={pickField} hint="اختر مجالك، وتطلع لك خيارات خاصة فيه. كل مجال له حزمة (مشاهد وحركات وستايلات وفيديوهات جاهزة)." />
      {focuses.length > 0 && <div className="flex flex-col gap-2"><span className="font-semibold">{L("شو تبي بالفيديو؟")}</span>
        <div className="flex flex-wrap gap-2">{focuses.map((f) => <button key={f.id} type="button" aria-pressed={focus === f.id} onClick={() => pickFocus(f)} className="chip">{L(f.label)}</button>)}</div></div>}
      <label className="flex flex-col gap-2"><span className="font-semibold">{edu ? L("الدرس أو الفكرة") : L("فكرة الفيديو")}</span>
        <textarea required minLength={5} maxLength={8000} rows={edu ? 6 : 4} value={idea} onChange={(e) => setIdea(e.target.value)} className="field"
          placeholder={edu ? L("مثال: اشرح للطلاب الفرق بين الكسور العشرية والاعتيادية مع مثال من الحياة اليومية. أو الصق نص الدرس كامل.") : L("مثال: فيديو توعوي عن خرافات الكربوهيدرات لعيادة تغذية، ينتهي بدعوة لحجز استشارة")} /></label>
      <PhotoPicker photos={photos} onChange={setPhotos} title={photoTitle} hint="ارفع صورك الحقيقية وتطلع بالفيديو بدل الرسم." />
      {edu
        ? <div className="flex flex-col gap-2"><span className="font-semibold">{L("لمين الفيديو؟")}</span>{chips(audiences, audience, setAudience)}</div>
        : <label className="flex flex-col gap-2"><span className="font-semibold">{L("اسم نشاطك")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" placeholder={L("مثال: د. وسمية الحمد")} /></label>}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("شكل الفيديو")}</span>{chips([["images", "🖼️ مونتاج صور ومشاهد"], ["doodle", "✏️ رسوم متحركة تنرسم باليد"], ["cartoon", "🧑‍🏫 كرتون خليجي يتكلم"]] as readonly (readonly [string, string])[], look, (v) => setLook(v as "images" | "doodle" | "cartoon"))}<span className="text-[13px] text-subtle">{look === "doodle" ? L("رسمات بسيطة تنرسم قدامك بقلم وتتحرك، فيديو متحرك حقيقي بدون صور.") : look === "cartoon" ? L("شخصيات كرتون خليجية تتحرك وتتكلم بصوت الفيديو، ومعها رسمات تنرسم. اختر صوت يناسب الشخصية.") : L("مشاهد ورسومات بالذكاء الاصطناعي مركّبة مع بعض.")}</span></div>
      {look === "cartoon" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الشخصية")}</span>{chips([["marker", "🎨 كرتون ملوّن"], ["neon", "💡 نيون مضيء"], ["chalk", "🧑‍🏫 طباشير"], ["blueprint", "📐 مخطط"], ["shadow", "🌑 ظل أسود"], ["glass", "🔮 زجاج"], ["clay", "🧸 صلصال"]] as readonly (readonly [string, string])[], cstyle, setCstyle)}</div>}
      {look !== "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسمات")}</span>{chips([["marker", "✏️ ماركر ملوّن"], ["neon", "💡 نيون مضيء"], ["chalk", "🧑‍🏫 سبورة طباشير"], ["shadow", "🌑 ظل أسود"], ["blueprint", "📐 مخطط هندسي"], ["glass", "🔮 زجاج ثلاثي الأبعاد"], ["clay", "🧸 صلصال (كلاي ميشن)"]] as readonly (readonly [string, string])[], dstyle, setDstyle)}<span className="text-[13px] text-subtle">{L("هذا شكل الرسمات اللي تنرسم فقط. الشخصية والخلفية لهم خيارهم لحاله.")}</span></div>}
      {look === "cartoon" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم يكون الكرتون؟")}</span>{chips([["full", "كرتون كامل (الشخصية بكل مشهد والكتابة فوقها)"], ["mixed", "مختلط (لقطات كرتون + لقطات شرح وجداول)"]] as readonly (readonly [string, string])[], mix, (v) => setMix(v as "full" | "mixed"))}</div>}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span>{chips(edu ? eduLengths : adLengths, seconds, setSeconds)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span>{chips(aspects, aspect, setAspect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("اللهجة")}</span>{chips(((edu || voiceover) && availD ? dialects.filter(([v]) => availD.has(v)) : dialects).filter(([v]) => edu || v !== "en"), dialect, setDialect)}</div>
      {!edu && <label className="flex items-center gap-3"><input type="checkbox" checked={voiceover} onChange={(e) => setVoiceover(e.target.checked)} className="h-5 w-5" /><span>{L("🎙 تعليق صوتي بصوت خليجي")}</span></label>}
      {showVoice && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <span className="font-semibold">{L("🎙 الصوت")}</span>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("رجل أو امرأة")}</span>{chips([["", "أي صوت"], ["m", "رجل"], ["f", "امرأة"]] as readonly (readonly [string, string])[], vgender, setVgender)}</div>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("العمر")}</span>{chips([["", "أي عمر"], ...VOICE_AGES] as readonly (readonly [string, string])[], vage, setVage)}</div>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("نبرة الصوت")}</span>{chips(TONES as readonly (readonly [string, string])[], tone, setTone)}</div>
          <label className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("أو اختر صوت بعينه")}</span>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className="field"><option value="">{L("تلقائي: الأنسب للهجة واختياراتك")}</option>
              {voices.filter((v) => !v.dialects?.length || v.dialects.includes("any") || v.dialects.includes(dialect) || (v.dialects.includes("gulf") && ["kuwaiti", "saudi", "emirati", "qatari", "bahraini", "omani"].includes(dialect))).map((v) => <option key={v.id} value={v.id}>{v.name}{v.note ? ` — ${v.note}` : ""}</option>)}</select></label>
        </div>
      )}
      <More label={L("المزيد من الخيارات (الخلفية، مكان النص، الرسومات، الموسيقى)")}>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("شكل اللوحة")}</span>{chips(panels, panel, setPanel)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("خلفية اللوحة")}</span>{chips(boards, board, setBoard)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("مكان النص")}</span>{chips([["", "تحت الرسمة"], ["top", "فوق الرسمة"]] as const, tpos, setTpos)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("حجم النص")}</span>{chips([[0.8, "أصغر"], [1, "عادي"], [1.2, "أكبر"], [1.4, "كبير جداً"]] as const, tscale, setTscale)}</div>
      <label className={look !== "images" ? "hidden" : "flex items-center gap-3"}><input type="checkbox" checked={drawings} onChange={(e) => setDrawings(e.target.checked)} className="h-5 w-5" /><span>{L("🎨 مشاهد مرسومة بالذكاء الاصطناعي (قصص وأمثلة وشخصيات)")}</span></label>
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسومات")}</span>{chips([["auto", "شاهين يختار"], ...ILLUS_STYLES.map(([v, l]) => [v, l] as const)] as readonly (readonly [string, string])[], illus, setIllus)}</div>}
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم رسمة بالفيديو؟")}</span>{chips([["few", "قليلة (2-4 مشاهد)"], ["half", "متوسطة (نص المشاهد)"], ["all", "كل المشاهد"]] as readonly (readonly [string, string])[], level, (v) => setLevel(v as "few" | "half" | "all"))}<span className="text-[13px] text-subtle">{L("كل رسمة تنرسم بالذكاء الاصطناعي وتحتاج وقت أكثر. «كل المشاهد» يعطي فيديو كله بالستايل.")}</span></div>}
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("ملاحظات")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="field" placeholder={L("مثال: اختم بسؤال، واذكر اسم الأكاديمية بالنهاية")} /></label>
      </More>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يكتب ويرسم ويجهّز الفيديو…")} /> : (
        <button disabled={idea.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("أنشئ الفيديو")} ({cost} {L("ريشة")})</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل المشاهد والنصوص والألوان والصوت، وتطلب أي تعديل بالكلام.")}</p>
    </form>
  );
}
