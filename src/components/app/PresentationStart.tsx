"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";

const counts = [[6, "قصير · 6 شرائح"], [10, "متوسط · 10 شرائح"], [15, "مفصّل · 15 شريحة"], [20, "موسّع · 20 شريحة"]] as const;
const IMG_COST = 8; // same as the server

/** «عروض PowerPoint»: an idea, a full text or a file in; a finished, editable .pptx out. */
export function PresentationStart({ cost: base, balance, hasKit }: { cost: number; balance: number; hasKit: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [slides, setSlides] = useState(10);
  const [lang, setLang] = useState("ar");
  const [audience, setAudience] = useState("");
  const [images, setImages] = useState(false);
  const [kit, setKit] = useState(hasKit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const cost = base * Math.ceil(slides / 10) + (images ? IMG_COST : 0);
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.03), 600);
    return () => clearInterval(t);
  }, [busy]);

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const f = new FormData();
      f.set("topic", topic); f.set("slides", String(slides)); f.set("lang", lang); f.set("audience", audience);
      f.set("images", images ? "1" : "0"); f.set("kit", kit ? "1" : "0");
      if (file) f.set("file", file);
      const r = await fetch("/api/presentation", { method: "POST", body: f });
      const d = await r.json().catch(() => ({ error: "صار خطأ." }));
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/presentations?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const ready = topic.trim().length >= 5 || !!file;
  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("موضوع العرض أو فكرتك أو نصك كامل")}</span>
        <textarea maxLength={12000} rows={7} value={topic} onChange={(e) => setTopic(e.target.value)} className="field"
          placeholder={L("مثال: عرض لشركتي الناشئة للمستثمرين: مشكلة السوق، حلّنا، النموذج المالي. أو الصق هنا كتابك أو مقالك كامل وشاهين يحوّله لعرض.")} /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("أو ارفع ملفك (اختياري)")}</span>
        <input type="file" accept=".docx,.pdf,.txt,.md,.pptx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="field" />
        <span className="text-[13px] text-subtle">{L("Word أو PDF أو نص أو عرض قديم تبي تحسّنه. الحد 3.5 ميغابايت.")}</span></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("حجم العرض")}</span>{chips(counts, slides, setSlides)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لغة العرض")}</span>{chips([["ar", "العربية"], ["en", "English"]] as const, lang, setLang)}</div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("لمن العرض؟ (اختياري)")}</span>
        <input maxLength={200} value={audience} onChange={(e) => setAudience(e.target.value)} className="field" placeholder={L("مثال: مستثمرين، عملاء، طلاب جامعة، إدارة الشركة")} /></label>
      {hasKit && <label className="flex items-center gap-3"><input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} className="h-5 w-5" /><span>{L("استخدم ألوان هويتي وشعاري")}</span></label>}
      <label className="flex items-start gap-3"><input type="checkbox" checked={images} onChange={(e) => setImages(e.target.checked)} className="mt-1 h-5 w-5" />
        <span>{L("أضف صور بالذكاء الاصطناعي لأهم الشرائح")} <span className="text-[13px] text-subtle">(+{IMG_COST} {L("ريشة")})</span></span></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يكتب العرض ويرتّب الشرائح…")} /> : (
        <button disabled={!ready || balance < cost} className="btn btn-gold py-3.5 text-[16px]">📊 {L("أنشئ العرض")} · {cost} {L("ريشة")}</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("تحصل ملف PowerPoint جاهز، كل نص وشكل فيه تقدر تعدّله بنفسك.")}</p>
    </form>
  );
}
