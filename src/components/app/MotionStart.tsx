"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const lengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const aspects = [["9:16", "ريلز / تيك توك 9:16"], ["1:1", "مربع 1:1"], ["16:9", "يوتيوب عريض 16:9"]] as const;
const dialects = [["kuwaiti", "كويتية"], ["gulf", "خليجية"], ["msa", "فصحى"]] as const;

/** Step 1 of the motion studio: the idea. */
export function MotionStart({ costPer15, balance, brand }: { costPer15: number; balance: number; brand?: string }) {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [name, setName] = useState(brand ?? "");
  const [seconds, setSeconds] = useState(30);
  const [aspect, setAspect] = useState("9:16");
  const [dialect, setDialect] = useState("kuwaiti");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15;

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/motion/script", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea, brand: name, seconds, aspect, dialect }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/app/tools/motion-video?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || "صار خطأ."); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{l}</button>)}</div>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <label className="flex flex-col gap-2"><span className="font-semibold">فكرة الفيديو</span>
        <textarea required minLength={5} maxLength={1200} rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} className="field"
          placeholder="مثال: فيديو توعوي عن خرافات الكربوهيدرات لعيادة تغذية، ينتهي بدعوة لحجز استشارة" /></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">اسم نشاطك <span className="font-normal text-subtle">(اختياري)</span></span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="field" placeholder="مثال: د. وسمية الحمد" /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">المدة</span>{chips(lengths, seconds, setSeconds)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">المقاس</span>{chips(aspects, aspect, setAspect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">لهجة النصوص</span>{chips(dialects, dialect, setDialect)}</div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
      <button disabled={busy || idea.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">
        {busy ? "شاهين يكتب الفيديو…" : `✨ أنشئ الفيديو (${cost} ريشة)`}
      </button>
      {balance < cost && <p className="text-center text-[14px] text-red-700">رصيدك ما يكفي. <a href="/app/subscribe" className="underline">زوّد رصيدك</a></p>}
      <p className="text-center text-[13px] text-subtle">بعدها تقدر تعدّل الألوان والنصوص والخط مجاناً وتشوف التغيير مباشرة.</p>
    </form>
  );
}
