"use client";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LikeNote } from "@/components/app/LikeNote";
import { Progress } from "@/components/app/Progress";
import { IndustryPicker } from "@/components/app/IndustryPicker";
import { ILLUS_STYLES } from "@/remotion/styles";

const lengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const aspects = [["9:16", "ريلز / تيك توك 9:16"], ["1:1", "مربع 1:1"], ["16:9", "يوتيوب عريض 16:9"]] as const;
const dialects = [...GULF_DIALECTS.map(([v, ar]) => [v, ar] as const)];

/** Step 1 of the motion studio: the idea. */
export function MotionStart({ template, likeId, idea: ideaIn = "", costPer15, balance, brand, voices = [], industry: savedIndustry }: { template?: { id: string; title: string; thumb: string | null; style: string; seconds: number }; likeId?: string; idea?: string; costPer15: number; balance: number; brand?: string; voices?: { id: string; name: string; note?: string }[]; industry?: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState(ideaIn);
  const [name, setName] = useState(brand ?? "");
  const [seconds, setSeconds] = useState(template ? ([15, 30, 60].reduce((a, b) => (Math.abs(b - template.seconds) < Math.abs(a - template.seconds) ? b : a))) : 30);
  const [aspect, setAspect] = useState("9:16");
  const [dialect, setDialect] = useState<string>("kuwaiti");
  useEffect(() => { setDialect(myDialect()); }, []);
  const [industry, setIndustry] = useState(savedIndustry ?? "");
  const [voiceover, setVoiceover] = useState(false);
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [drawings, setDrawings] = useState(true);
  const [mix, setMix] = useState<"full" | "mixed">("mixed");
  const [dstyle, setDstyle] = useState<string>("marker");
  const [look, setLook] = useState<"images" | "doodle" | "cartoon">("images");
  const [level, setLevel] = useState<"few" | "half" | "all">(template ? "all" : "few");
  const [illus, setIllus] = useState(template?.style ?? "auto");
  const [panel, setPanel] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15;
  const [pct, setPct] = useState(0);
  // Writing takes ~10-30s: move smoothly towards 95%, the last 5% when it is done.
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.07), 400);
    return () => clearInterval(t);
  }, [busy]);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ look, dstyle, cartoonMix: mix, drawLevel: level, templateId: template?.id, likeWork: likeId, mode: "motion", topic: idea, brand: name, industry, seconds, aspect, dialect, voiceover, voice, drawings, illus: illus === "auto" ? undefined : illus, panel }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/motion-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      {template && <LikeNote like={{ title: `قالب «${template.title}»`, thumb: template.thumb }} />}
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("فكرة الفيديو")}</span>
        <textarea required minLength={5} maxLength={1200} rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} className="field"
          placeholder={L("مثال: فيديو توعوي عن خرافات الكربوهيدرات لعيادة تغذية، ينتهي بدعوة لحجز استشارة")} /></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("اسم نشاطك")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" placeholder={L("مثال: د. وسمية الحمد")} /></label>
      <IndustryPicker value={industry} onChange={setIndustry} hint="اختياري: كل مجال له حزمة خاصة (مشاهد وحركات وستايلات وفيديوهات جاهزة). إذا ما اخترت، شاهين يعرف مجالك من وصفك." />
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span>{chips(lengths, seconds, setSeconds)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span>{chips(aspects, aspect, setAspect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لهجة النصوص")}</span>{chips(dialects, dialect, setDialect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("الخلفية")}</span>{chips([["auto", "حسب مجالي"], ["light", "فاتحة"], ["dark", "داكنة"]] as const, panel, setPanel)}</div>
      <label className="flex items-center gap-3"><input type="checkbox" checked={voiceover} onChange={(e) => setVoiceover(e.target.checked)} className="h-5 w-5" /><span>{L("🎙 تعليق صوتي بصوت خليجي")}</span></label>
      {voiceover && voices.length > 0 && <select value={voice} onChange={(e) => setVoice(e.target.value)} className="field">{voices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.note ? ` — ${v.note}` : ""}</option>)}</select>}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("شكل الفيديو")}</span>{chips([["images", "🖼️ مونتاج صور ومشاهد"], ["doodle", "✏️ رسوم متحركة تنرسم باليد"], ["cartoon", "🧑‍🏫 كرتون خليجي يتكلم"]] as readonly (readonly [string, string])[], look, (v) => setLook(v as "images" | "doodle" | "cartoon"))}<span className="text-[13px] text-subtle">{look === "doodle" ? L("رسمات بسيطة تنرسم قدامك بقلم وتتحرك، فيديو متحرك حقيقي بدون صور.") : look === "cartoon" ? L("شخصيات كرتون خليجية تتحرك وتتكلم بصوت الفيديو، ومعها رسمات تنرسم. اختر صوت يناسب الشخصية.") : L("مشاهد ورسومات بالذكاء الاصطناعي مركّبة مع بعض.")}</span></div>
      {look !== "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسم")}</span>{chips([["marker", "✏️ ماركر ملوّن"], ["neon", "💡 نيون مضيء"], ["chalk", "🧑‍🏫 سبورة طباشير"], ["shadow", "🌑 ظل أسود"], ["blueprint", "📐 مخطط هندسي"]] as readonly (readonly [string, string])[], dstyle, setDstyle)}<span className="text-[13px] text-subtle">{L("يغيّر شكل الرسمات والخلفية كلها: النيون على خلفية سودا مضيئة، والطباشير على سبورة، والمخطط بخلفية زرقا وقياسات.")}</span></div>}
      {look === "cartoon" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم يكون الكرتون؟")}</span>{chips([["full", "كرتون كامل (الشخصية بكل مشهد والكتابة فوقها)"], ["mixed", "مختلط (لقطات كرتون + لقطات شرح وجداول)"]] as readonly (readonly [string, string])[], mix, (v) => setMix(v as "full" | "mixed"))}</div>}
      <label className={look !== "images" ? "hidden" : "flex items-center gap-3"}><input type="checkbox" checked={drawings} onChange={(e) => setDrawings(e.target.checked)} className="h-5 w-5" /><span>{L("🎨 مشاهد مرسومة بالذكاء الاصطناعي")}</span></label>
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسومات")}</span>{chips([["auto", "شاهين يختار"], ...ILLUS_STYLES.map(([v, l]) => [v, l] as const)] as readonly (readonly [string, string])[], illus, setIllus)}</div>}
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم رسمة بالفيديو؟")}</span>{chips([["few", "قليلة (2-4 مشاهد)"], ["half", "متوسطة (نص المشاهد)"], ["all", "كل المشاهد"]] as readonly (readonly [string, string])[], level, (v) => setLevel(v as "few" | "half" | "all"))}<span className="text-[13px] text-subtle">{L("كل رسمة تنرسم بالذكاء الاصطناعي وتحتاج وقت أكثر. «كل المشاهد» يعطي فيديو كله بالستايل.")}</span></div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("جاري إنشاء الفيديو…")} /> : (
        <button disabled={idea.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("أنشئ الفيديو")} ({cost} {L("ريشة")})</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل المشاهد والنصوص والألوان، وتطلب أي تعديل بالكلام.")}</p>
    </form>
  );
}
