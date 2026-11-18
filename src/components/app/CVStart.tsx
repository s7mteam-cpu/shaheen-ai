"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { uploadImage } from "@/components/app/DesignStart";

/** «السيرة الذاتية»: tell Shaheen about yourself (or upload the old CV) → a designed, editable CV. */
export function CVStart({ cost, balance }: { cost: number; balance: number }) {
  const router = useRouter();
  const [info, setInfo] = useState("");
  const [target, setTarget] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState("ar");
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
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
      const f = new FormData();
      f.set("info", info); f.set("target", target); f.set("lang", lang);
      if (photo) f.set("photo", photo.path);
      if (file) f.set("file", file);
      const r = await fetch("/api/cv/start", { method: "POST", body: f });
      const d = await r.json().catch(() => ({ error: "صار خطأ." }));
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/cv?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }
  const ready = info.trim().length >= 20 || !!file;
  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("اكتب عن نفسك: خبراتك، دراستك، مهاراتك")}</span>
        <textarea maxLength={12000} rows={9} value={info} onChange={(e) => setInfo(e.target.value)} className="field"
          placeholder={L("مثال: اسمي عبدالله العتيبي، مدير مشاريع، اشتغلت 12 سنة في شركات إنشاءات بالكويت… (اكتب بحريّتك وبأي ترتيب، وشاهين يرتّبها. ما يخترع شي مو مكتوب.)")} /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("أو ارفع سيرتك القديمة (اختياري)")}</span>
        <input type="file" accept=".docx,.pdf,.txt,.md" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="field" />
        <span className="text-[13px] text-subtle">{L("Word أو PDF أو نص. الحد 3.5 ميغابايت.")}</span></div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("الوظيفة اللي تتقدّم لها (اختياري)")}</span>
        <input maxLength={120} value={target} onChange={(e) => setTarget(e.target.value)} className="field" placeholder={L("مثال: مدير مشاريع في شركة نفط")} />
        <span className="text-[13px] text-subtle">{L("لو كتبتها، شاهين يوجّه النبذة المهنية والكلمات المفتاحية لها.")}</span></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لغة السيرة")}</span>
        <div className="flex gap-2">{([["ar", "العربية"], ["en", "English"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={lang === v} onClick={() => setLang(v)} className="chip">{l}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("صورة شخصية (اختياري)")}</span>
        <div className="flex items-center gap-3">
          {photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={photo.preview} alt="" className="h-16 w-16 rounded-full object-cover" />}
          <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhoto(await uploadImage(f)); } catch (er) { setError((er as Error).message); } }} className="field" />
        </div>
        <span className="text-[13px] text-subtle">{L("بعض الشركات في الخليج تطلبها وبعضها لا، تقدر تشيلها لاحقاً.")}</span></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يرتّب سيرتك…")} /> : (
        <button disabled={!ready || balance < cost} className="btn btn-gold py-3.5 text-[16px]">📄 {L("جهّز سيرتي")} · {cost} {L("ريشة")}</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("تختار من 50 ستايل، تعدّل كل شي، وتنزّلها PDF وWord.")}</p>
    </form>
  );
}
