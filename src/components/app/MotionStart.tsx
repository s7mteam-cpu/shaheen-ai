"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { IndustryPicker } from "@/components/app/IndustryPicker";
import { ILLUS_STYLES } from "@/remotion/styles";

const lengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const aspects = [["9:16", "ريلز / تيك توك 9:16"], ["1:1", "مربع 1:1"], ["16:9", "يوتيوب عريض 16:9"]] as const;
const dialects = [["kuwaiti", "كويتية"], ["gulf", "خليجية"], ["msa", "فصحى"]] as const;

/** Step 1 of the motion studio: the idea. */
export function MotionStart({ costPer15, balance, brand, voices = [], industry: savedIndustry }: { costPer15: number; balance: number; brand?: string; voices?: { id: string; name: string; note?: string }[]; industry?: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [name, setName] = useState(brand ?? "");
  const [seconds, setSeconds] = useState(30);
  const [aspect, setAspect] = useState("9:16");
  const [dialect, setDialect] = useState("kuwaiti");
  const [industry, setIndustry] = useState(savedIndustry ?? "");
  const [voiceover, setVoiceover] = useState(false);
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [drawings, setDrawings] = useState(true);
  const [illus, setIllus] = useState("auto");
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
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "motion", topic: idea, brand: name, industry, seconds, aspect, dialect, voiceover, voice, drawings, illus: illus === "auto" ? undefined : illus, panel }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPct(100);
      router.push(`/app/tools/motion-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
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
      <label className="flex items-center gap-3"><input type="checkbox" checked={drawings} onChange={(e) => setDrawings(e.target.checked)} className="h-5 w-5" /><span>{L("🎨 مشاهد مرسومة بالذكاء الاصطناعي")}</span></label>
      {drawings && <div className="flex flex-col gap-2"><span className="font-semibold">{L("ستايل الرسومات")}</span>{chips([["auto", "شاهين يختار"], ...ILLUS_STYLES.map(([v, l]) => [v, l] as const)] as readonly (readonly [string, string])[], illus, setIllus)}</div>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("جاري إنشاء الفيديو…")} /> : (
        <button disabled={idea.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("أنشئ الفيديو")} ({cost} {L("ريشة")})</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل المشاهد والنصوص والألوان، وتطلب أي تعديل بالكلام.")}</p>
    </form>
  );
}
