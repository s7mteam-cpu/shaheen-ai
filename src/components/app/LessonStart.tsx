"use client";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { More } from "@/components/app/Collapse";
import { ILLUS_STYLES } from "@/remotion/styles";

const lengths = [[30, "30 ثانية"], [60, "دقيقة"], [90, "دقيقة ونص"], [120, "دقيقتين"]] as const;
const aspects = [["9:16", "ريلز / تيك توك 9:16"], ["1:1", "مربع 1:1"], ["16:9", "يوتيوب عريض 16:9"]] as const;
const audiences = [["kids", "أطفال"], ["students", "طلاب"], ["adults", "عامة الناس"], ["pros", "متخصصين"]] as const;
const dialects: (readonly [string, string])[] = [...GULF_DIALECTS.map(([v, ar]) => [v, ar] as const), ["en", "English"]];
const panels = [["light", "خلفية فاتحة"], ["dark", "خلفية داكنة"]] as const;
const boards = [["auto", "تلقائي (مختلف كل مرة)"], ["soft", "ناعم"], ["paper", "ورق"], ["grid", "مربعات"], ["dots", "نقاط"], ["notebook", "دفتر مسطّر"], ["chalk", "سبورة طباشير"], ["blueprint", "مخطط أزرق"], ["night", "ليلي"], ["neon", "نيون داكن"], ["pastel", "باستيل للأطفال"], ["sunrise", "شروق دافئ"]] as const;

/** Educational animated video: the lesson, who it's for, and how it sounds. */
export function LessonStart({ likeId, idea = "", costPer30, balance, voices }: { likeId?: string; idea?: string; costPer30: number; balance: number; voices: { id: string; name: string; note?: string }[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState(idea);
  const [notes, setNotes] = useState("");
  const [seconds, setSeconds] = useState<number>(60);
  const [aspect, setAspect] = useState<string>("9:16");
  const [audience, setAudience] = useState<string>("students");
  const [dialect, setDialect] = useState<string>("kuwaiti");
  useEffect(() => { setDialect(myDialect()); }, []);
  const [panel, setPanel] = useState<string>("light");
  const [board, setBoard] = useState<string>("auto");
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [withMusic, setWithMusic] = useState(true);
  const [drawings, setDrawings] = useState(true);
  const [mix, setMix] = useState<"full" | "mixed">("mixed");
  const [dstyle, setDstyle] = useState<string>("marker");
  const [cstyle, setCstyle] = useState<string>("marker");
  const [look, setLook] = useState<"images" | "doodle" | "cartoon">("doodle");
  const [level, setLevel] = useState<"few" | "half" | "all">("few");
  const [illus, setIllus] = useState<string>("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const cost = Math.max(1, Math.round(seconds / 30)) * costPer30;
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.04), 500);
    return () => clearInterval(t);
  }, [busy]);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ look, dstyle, cstyle, cartoonMix: mix, drawLevel: level, likeWork: likeId, topic, notes, seconds, aspect, audience, dialect, panel, board, voice, music: withMusic, drawings, illus: illus === "auto" ? undefined : illus }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/lesson-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("الدرس أو الفكرة")}</span>
        <textarea required minLength={5} maxLength={4000} rows={6} value={topic} onChange={(e) => setTopic(e.target.value)} className="field"
          placeholder={L("مثال: اشرح للطلاب الفرق بين الكسور العشرية والاعتيادية مع مثال من الحياة اليومية. أو الصق نص الدرس كامل.")} /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لمين الفيديو؟")}</span>{chips(audiences, audience, setAudience)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لغة الشرح")}</span>{chips(dialects, dialect, setDialect)}</div>
      {voices.length > 0 && (
        <label className="flex flex-col gap-2"><span className="font-semibold">{L("الصوت")}</span>
          <select value={voice} onChange={(e) => setVoice(e.target.value)} className="field">{voices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.note ? ` — ${v.note}` : ""}</option>)}</select></label>
      )}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span>{chips(lengths, seconds, setSeconds)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span>{chips(aspects, aspect, setAspect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("شكل الفيديو")}</span>{chips([["images", "🖼️ مونتاج صور ومشاهد"], ["doodle", "✏️ رسوم متحركة تنرسم باليد"], ["cartoon", "🧑‍🏫 كرتون خليجي يتكلم"]] as readonly (readonly [string, string])[], look, (v) => setLook(v as "images" | "doodle" | "cartoon"))}<span className="text-[13px] text-subtle">{look === "doodle" ? L("رسمات بسيطة تنرسم قدامك بقلم وتتحرك، فيديو متحرك حقيقي بدون صور.") : look === "cartoon" ? L("شخصيات كرتون خليجية تتحرك وتتكلم بصوت الفيديو، ومعها رسمات تنرسم. اختر صوت يناسب الشخصية.") : L("مشاهد ورسومات بالذكاء الاصطناعي مركّبة مع بعض.")}</span></div>
      {look === "cartoon" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الشخصية")}</span>{chips([["marker", "🎨 كرتون ملوّن"], ["neon", "💡 نيون مضيء"], ["chalk", "🧑‍🏫 طباشير"], ["blueprint", "📐 مخطط"], ["shadow", "🌑 ظل أسود"], ["glass", "🔮 زجاج"], ["clay", "🧸 صلصال"]] as readonly (readonly [string, string])[], cstyle, setCstyle)}</div>}
      {look !== "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسمات")}</span>{chips([["marker", "✏️ ماركر ملوّن"], ["neon", "💡 نيون مضيء"], ["chalk", "🧑‍🏫 سبورة طباشير"], ["shadow", "🌑 ظل أسود"], ["blueprint", "📐 مخطط هندسي"], ["glass", "🔮 زجاج ثلاثي الأبعاد"], ["clay", "🧸 صلصال (كلاي ميشن)"]] as readonly (readonly [string, string])[], dstyle, setDstyle)}<span className="text-[13px] text-subtle">{L("هذا شكل الرسمات اللي تنرسم فقط. الشخصية والخلفية لهم خيارهم لحاله.")}</span></div>}
      {look === "cartoon" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم يكون الكرتون؟")}</span>{chips([["full", "كرتون كامل (الشخصية بكل مشهد والكتابة فوقها)"], ["mixed", "مختلط (لقطات كرتون + لقطات شرح وجداول)"]] as readonly (readonly [string, string])[], mix, (v) => setMix(v as "full" | "mixed"))}</div>}
      <More label={L("المزيد من الخيارات (الخلفية، ستايل الرسومات، الموسيقى، ملاحظات)")}>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("شكل اللوحة")}</span>{chips(panels, panel, setPanel)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("خلفية اللوحة")}</span>{chips(boards, board, setBoard)}</div>
      <label className={look !== "images" ? "hidden" : "flex items-center gap-3"}><input type="checkbox" checked={drawings} onChange={(e) => setDrawings(e.target.checked)} className="h-5 w-5" /><span>{L("🎨 مشاهد مرسومة بالذكاء الاصطناعي (قصص وأمثلة وشخصيات)")}</span></label>
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسومات")}</span>{chips([["auto", "شاهين يختار"], ...ILLUS_STYLES.map(([v, l]) => [v, l] as const)] as readonly (readonly [string, string])[], illus, setIllus)}</div>}
      {drawings && look === "images" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("كم رسمة بالفيديو؟")}</span>{chips([["few", "قليلة (2-4 مشاهد)"], ["half", "متوسطة (نص المشاهد)"], ["all", "كل المشاهد"]] as readonly (readonly [string, string])[], level, (v) => setLevel(v as "few" | "half" | "all"))}<span className="text-[13px] text-subtle">{L("كل رسمة تنرسم بالذكاء الاصطناعي وتحتاج وقت أكثر. «كل المشاهد» يعطي فيديو كله بالستايل.")}</span></div>}
      <label className="flex items-center gap-3"><input type="checkbox" checked={withMusic} onChange={(e) => setWithMusic(e.target.checked)} className="h-5 w-5" /><span>{L("موسيقى خلفية هادئة")}</span></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("ملاحظات")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} className="field" placeholder={L("مثال: اختم بسؤال للطلاب، واذكر اسم الأكاديمية")} /></label>
      </More>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يكتب الدرس ويسجّل الصوت ويرسم المشاهد…")} /> : (
        <button disabled={topic.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("أنشئ الفيديو التعليمي")} ({cost} {L("ريشة")})</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل المشاهد والنصوص والألوان والصوت، وتطلب أي تعديل بالكلام.")}</p>
    </form>
  );
}
