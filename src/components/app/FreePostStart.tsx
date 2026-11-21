"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { RetentionNote } from "@/components/app/RetentionNote";

const SIZES = [["4:5", "🖼️ بوست طولي 4:5"], ["1:1", "⬜ مربع 1:1"], ["9:16", "📱 ستوري 9:16"], ["16:9", "▶️ عرضي 16:9"]] as const;
type Done = { status: "done"; title: string; aspect: string; editCost: number; images: { url: string; download: string }[] };
type State = { status: "queued" | "running"; progress: number } | Done | { status: "failed"; error: string } | { status: "expired" } | null;

/** «بوست / كاروسيل مبتكر»: the idea form, the waiting screen, then the pictures with «edit by words». */
export function FreePostStart({ tool, costPerSlide, balance, hasKit, hasLogo }: { tool: "free-post" | "free-carousel"; costPerSlide: number; balance: number; hasKit: boolean; hasLogo: boolean }) {
  const router = useRouter();
  const jobId = useSearchParams().get("job");
  const [idea, setIdea] = useState("");
  const [aspect, setAspect] = useState<string>("4:5");
  const carousel = tool === "free-carousel";
  const [slides, setSlides] = useState(carousel ? 5 : 1);
  const [useBrand, setUseBrand] = useState(true);
  const [useLogo, setUseLogo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<State>(null);
  const [instruction, setInstruction] = useState("");
  const cost = costPerSlide * slides;

  useEffect(() => {
    if (!jobId) { setState(null); return; }
    let stop = false, timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      const r = await fetch(`/api/free-post?job=${jobId}`).catch(() => null);
      const d = r ? await r.json().catch(() => null) : null;
      if (stop) return;
      if (d?.status) setState(d as State); else if (d?.error) setState({ status: "failed", error: String(d.error) });
      if (!d || d.status === "queued" || d.status === "running") timer = setTimeout(tick, 3500);
    };
    setState({ status: "queued", progress: 0 });
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [jobId]);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/free-post", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jobId) throw new Error(d.error || "تعذّر إرسال الطلب.");
      setInstruction("");
      router.push(`/app/tools/${tool}?job=${d.jobId}`);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر إرسال الطلب."); }
    finally { setBusy(false); }
  }

  if (jobId) {
    if (!state || state.status === "queued" || state.status === "running") {
      return (
        <div className="card mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-8 text-center">
          <h2 className="text-[20px] font-bold text-navy-900">{L("شاهين يصمّم لك…")}</h2>
          <div className="w-full"><Progress value={state?.progress ?? 0} label={state?.status === "running" ? L("يكتب التصميم ويرسمه…") : L("في الطابور…")} /></div>
          <p className="text-[13px] leading-6 text-subtle">{L("ياخذ من دقيقة إلى 3 دقائق. تقدر تطلع، وتلقاه في «أعمالي».")}</p>
        </div>
      );
    }
    if (state.status === "failed") return <div className="card mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center"><p className="font-semibold text-red-800">{L(state.error)}</p><button type="button" onClick={() => router.push(`/app/tools/${tool}`)} className="btn btn-primary px-6 py-2.5">{L("جرّب من جديد")}</button></div>;
    if (state.status === "expired") return <p className="card p-6 text-center">{L("انتهت مدة حفظ هذا الملف وتم حذفه")}</p>;
    if (state.status !== "done") return null;
    const d = state;
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div className={`grid gap-4 ${d.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {d.images.map((im, i) => (
            <figure key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="w-full" />
              <div className="flex items-center gap-2 p-3">
                <a href={im.download} download className="btn btn-gold flex-1 py-2.5 text-[14px]">⬇️ {d.images.length > 1 ? LT(`تحميل الشريحة ${i + 1}`, `Download slide ${i + 1}`) : L("تحميل")}</a>
              </div>
            </figure>
          ))}
        </div>
        <RetentionNote />
        <div className="card flex flex-col gap-3 p-5">
          <h3 className="text-[16px] font-bold text-navy-900">{L("عدّل بالكلام")}</h3>
          <p className="text-[13px] leading-6 text-subtle">{L("اكتب اللي تبي يتغيّر (مثال: كبّر العنوان، خل الخلفية أفتح، غيّر الزر إلى «احجز الآن»). يطلع لك تصميم جديد والأصلي يبقى.")}</p>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={600} rows={3} className="field" placeholder={L("اكتب التعديل هنا…")} />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || instruction.trim().length < 3 || balance < d.editCost} onClick={() => send({ from: jobId, instruction })} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">{busy ? L("جاري الإرسال…") : LT(`✏️ عدّل (${d.editCost} ريشة)`, `✏️ Edit (${d.editCost} credits)`)}</button>
            <button type="button" onClick={() => router.push(`/app/tools/${tool}`)} className="btn btn-outline px-5 py-2.5">{L("تصميم جديد")}</button>
          </div>
          {balance < d.editCost && <p className="text-[12.5px] text-subtle">{L("رصيدك ما يكفي للتعديل.")}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="fp-idea">{L("فكرتك")}</label>
        <textarea id="fp-idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} rows={6} className="field" placeholder={carousel ? L("مثال: كاروسيل «5 أخطاء تخرب قهوتك بالبيت» لكوفي «دانة»: كل شريحة خطأ وحله بجملة، والأخيرة: زورونا بالسالمية، حسابنا @dana.cafe.") : L("مثال: إعلان افتتاح كوفي «دانة» بالسالمية، خصم 30% على كل المشروبات أول أسبوع، للحجز واتساب 5xxxxxxx، حسابنا @dana.cafe. أبيه فخم وهادي.")} />
        <p className="text-[12.5px] leading-6 text-subtle">{L("اكتب كل اللي تبي يظهر: العرض، السعر، رقم التواصل، الحساب. شاهين ما يخترع أسعار ولا أرقام من عنده.")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">{L("المقاس")}</span>
        <div className="flex flex-wrap gap-2">{SIZES.map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)} className="chip">{L(l)}</button>)}</div>
      </div>
      {carousel && (
        <div className="flex flex-col gap-2">
          <span className="label">{L("عدد الشرائح")}</span>
          <div className="flex flex-wrap gap-2">{[3, 4, 5, 6, 7, 8].map((n) => <button key={n} type="button" aria-pressed={slides === n} onClick={() => setSlides(n)} className="chip">{n}</button>)}</div>
        </div>
      )}
      {hasKit && (
        <div className="flex flex-col gap-2 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} className="h-4 w-4" />{L("استخدم ألوان وخط هويتي التجارية")}</label>
          {hasLogo && <label className="flex items-center gap-2"><input type="checkbox" checked={useBrand && useLogo} disabled={!useBrand} onChange={(e) => setUseLogo(e.target.checked)} className="h-4 w-4" />{L("حط شعاري على التصميم")}</label>}
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      <button type="button" disabled={busy || idea.trim().length < 10 || balance < cost} onClick={() => send({ tool, idea, aspect, slides, useBrand, useLogo })} className="btn btn-gold w-full py-3.5 disabled:opacity-50">{busy ? L("جاري الإرسال…") : LT(`✨ صمّم (${cost} ريشة)`, `✨ Design (${cost} credits)`)}</button>
      {balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك من الريش ما يكفي.")}</p>}
      <p className="text-center text-[12.5px] leading-6 text-subtle">{L("أداة تجريبية: التصميم يكتبه الذكاء الاصطناعي من الصفر، فمرة يطلع ممتاز ومرة يحتاج تعديل بالكلام. إذا فشل ترجع الريش تلقائياً.")}</p>
    </div>
  );
}
