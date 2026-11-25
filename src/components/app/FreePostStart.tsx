"use client";
import { uploadImage } from "@/components/app/DesignStart";
import { L, LT } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { PostStudio, type PostData } from "@/components/app/PostStudio";

const SIZES = [["4:5", "🖼️ بوست طولي 4:5"], ["1:1", "⬜ مربع 1:1"], ["9:16", "📱 ستوري 9:16"], ["16:9", "▶️ عرضي 16:9"]] as const;
type Done = PostData;
type State = { status: "queued" | "running"; progress: number } | Done | { status: "failed"; error: string } | { status: "expired" } | null;

/** «بوست / كاروسيل مبتكر»: the idea form, the waiting screen, then the pictures with «edit by words». */
export function FreePostStart({ tool, costPerSlide, balance, hasKit, hasLogo, imageCost = 0, hasStyle = false }: { imageCost?: number; hasStyle?: boolean; tool: "free-post" | "free-carousel" | "free-ad" | "free-invite" | "free-card" | "free-deck" | "free-cv"; costPerSlide: number; balance: number; hasKit: boolean; hasLogo: boolean }) {
  const router = useRouter();
  const jobId = useSearchParams().get("job");
  const [idea, setIdea] = useState("");
  const [aspect, setAspect] = useState<string>("4:5");
  const carousel = tool === "free-carousel";
  const invite = tool === "free-invite", ad = tool === "free-ad", bcard = tool === "free-card", deck = tool === "free-deck", cvTool = tool === "free-cv";
  const [slides, setSlides] = useState(carousel ? 5 : tool === "free-deck" ? 6 : 1);
  const [useBrand, setUseBrand] = useState(true);
  const [useLogo, setUseLogo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<State>(null);
  const [poll, setPoll] = useState(0);
  // «صورة للتصميم» (بوست وإعلان): none, drawn by AI (the image tool's price is added), or the customer's own picture
  const [useStyle, setUseStyle] = useState(true);
  const canPhoto = tool === "free-post" || tool === "free-ad";
  const [photo, setPhoto] = useState<"none" | "ai" | "upload">("none");
  const [photoDesc, setPhotoDesc] = useState("");
  const [up, setUp] = useState<{ path: string; preview: string } | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const cost = costPerSlide * slides + (canPhoto && photo === "ai" ? imageCost : 0);

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
  }, [jobId, poll]);

  async function send(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/free-post", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jobId) throw new Error(d.error || "تعذّر إرسال الطلب.");
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
          <p className="text-[13px] leading-6 text-subtle">{carousel || deck ? L("الكاروسيل ياخذ من 3 إلى 7 دقائق حسب عدد الشرائح. تقدر تطلع، وتلقاه في «أعمالي».") : L("ياخذ من دقيقة إلى 3 دقائق. تقدر تطلع، وتلقاه في «أعمالي».")}</p>
        </div>
      );
    }
    if (state.status === "failed") return <div className="card mx-auto flex max-w-xl flex-col items-center gap-3 p-8 text-center"><p className="font-semibold text-red-800">{L(state.error)}</p><button type="button" onClick={() => router.push(`/app/tools/${tool}`)} className="btn btn-primary px-6 py-2.5">{L("جرّب من جديد")}</button></div>;
    if (state.status === "expired") return <p className="card p-6 text-center">{L("انتهت مدة حفظ هذا الملف وتم حذفه")}</p>;
    if (state.status !== "done") return null;
    return <PostStudio key={`${jobId}:${poll}`} jobId={jobId} data={state} balance={balance}
      onQueued={(id) => { if (id === jobId) setPoll((x) => x + 1); else { router.push(`/app/tools/${tool}?job=${id}`); router.refresh(); } }}
      onNew={() => router.push(`/app/tools/${tool}`)} />;
  }

  return (
    <div className="card mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="fp-idea">{L("فكرتك")}</label>
        <textarea id="fp-idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={cvTool || deck ? 4000 : 1500} rows={6} className="field" placeholder={cvTool ? L("اكتب بياناتك: الاسم، المسمّى، الجوال والبريد والمدينة، نبذة قصيرة، الخبرات (المسمّى، الجهة، من سنة إلى سنة، وأهم إنجازاتك)، التعليم، المهارات، اللغات. والأسلوب اللي تحبه (رسمي، عصري، لون معيّن).") : deck ? L("مثال: عرض تعريفي عن شركة النخبة العقارية للمستثمرين: من نحن، خدماتنا الثلاث (بيع، تأجير، إدارة أملاك)، أرقامنا (120 عقار، 8 سنوات)، لماذا نحن، وطريقة التواصل. أسلوب رسمي بالكحلي والذهبي.") : bcard ? L("مثال: بطاقة عمل لأحمد العلي، مدير المبيعات في شركة النخبة العقارية. جوال 66112233، بريد ahmad@nokhba.com، الموقع nokhba.com، الكويت - شرق. أسلوب رسمي فخم بالكحلي والذهبي.") : invite ? L("مثال: دعوة زفاف محمد وسارة، يوم الجمعة 18 ديسمبر 2026 الساعة 8 مساءً، قاعة الراية بالكويت. طابع ملكي فخم بالأبيض والذهبي مع زخارف ناعمة.") : ad ? L("مثال: إعلان افتتاح فرعنا الجديد بالسالمية، خصم 30% على كل الوجبات أول أسبوع، للطلب واتساب 66112233. أسلوب جريء بالأحمر والأسود.") : carousel ? L("مثال: كاروسيل «5 أخطاء تخرب قهوتك بالبيت» لكوفي «دانة»: كل شريحة خطأ وحله بجملة، والأخيرة: زورونا بالسالمية، حسابنا @dana.cafe.") : L("مثال: إعلان افتتاح كوفي «دانة» بالسالمية، خصم 30% على كل المشروبات أول أسبوع، للحجز واتساب 5xxxxxxx، حسابنا @dana.cafe. أبيه فخم وهادي.")} />
        <p className="text-[12.5px] leading-6 text-subtle">{invite ? L("اكتب الأسماء والتاريخ والوقت والمكان بالضبط مثل ما تبيهم يظهرون، والطابع اللي تحبه. شاهين ما يخترع أسماء ولا تواريخ.") : bcard ? L("اكتب الاسم والمسمّى وأرقام التواصل والحسابات بالضبط مثل ما تبيها تظهر. شاهين ما يخترع أرقام ولا بيانات من عنده.") : cvTool ? L("اكتب بياناتك وخبراتك بالضبط مثل ما تبيها تظهر. شاهين ما يخترع أرقام ولا خبرات من عنده.") : deck ? L("اكتب موضوع العرض ونقاط كل شريحة، والأرقام مثل ما تبيها تظهر. شاهين ما يخترع أسعار ولا أرقام من عنده.") : L("اكتب كل اللي تبي يظهر: العرض، السعر، رقم التواصل، الحساب. شاهين ما يخترع أسعار ولا أرقام من عنده.")}</p>
      </div>
      {bcard && <p className="rounded-xl bg-navy-900/5 px-4 py-3 text-[13.5px] leading-6 text-muted">{L("البطاقة تطلع بوجهين (أمامي وخلفي) بمقاس الطباعة المعتمد 9 × 5 سم تقريباً، صورتين جاهزتين للمطبعة.")}</p>}
      <div className={bcard || deck || cvTool ? "hidden" : "flex flex-col gap-2"}>
        <span className="label">{L("المقاس")}</span>
        <div className="flex flex-wrap gap-2">{SIZES.map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)} className="chip">{L(l)}</button>)}</div>
      </div>
      {cvTool && <p className="rounded-xl bg-navy-900/5 px-4 py-3 text-[13.5px] leading-6 text-muted">{L("السيرة تطلع صفحة A4 وحدة: صورة + ملف PDF بنص حقيقي ينسخ ويُبحث فيه. شاهين ما يخترع خبرة ولا شهادة: اللي تكتبه هو اللي يطلع.")}</p>}
      {deck && <p className="rounded-xl bg-navy-900/5 px-4 py-3 text-[13.5px] leading-6 text-muted">{L("العرض يطلع شرائح عريضة 16:9: صور + ملف PDF واحد جاهز للعرض أو الإرسال. (مو ملف PowerPoint يتعدّل؛ التعديل من استوديو شاهين.)")}</p>}
      {(carousel || deck) && (
        <div className="flex flex-col gap-2">
          <span className="label">{L("عدد الشرائح")}</span>
          <div className="flex flex-wrap gap-2">{(deck ? [4, 5, 6, 7, 8] : [3, 4, 5, 6, 7, 8]).map((n) => <button key={n} type="button" aria-pressed={slides === n} onClick={() => setSlides(n)} className="chip">{n}</button>)}</div>
        </div>
      )}
      {canPhoto && (
        <div className="flex flex-col gap-2">
          <span className="label">{L("صورة داخل التصميم")}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={photo === "none"} onClick={() => setPhoto("none")} className="chip">{L("بدون صورة")}</button>
            {imageCost > 0 && <button type="button" aria-pressed={photo === "ai"} onClick={() => setPhoto("ai")} className="chip">✨ {L("صورة بالذكاء الاصطناعي")} (+{imageCost} {L("ريشة")})</button>}
            <button type="button" aria-pressed={photo === "upload"} onClick={() => setPhoto("upload")} className="chip">📷 {L("ارفع صورتك")}</button>
          </div>
          {photo === "ai" && (
            <label className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("وصف الصورة (اختياري). إذا تركته فاضي، شاهين يرسم صورة تناسب فكرتك. الصورة تطلع بدون كتابة.")}</span>
              <input value={photoDesc} onChange={(e) => setPhotoDesc(e.target.value)} maxLength={400} className="field" placeholder={L("مثال: لابتوب على مكتب أنيق وجنبه كوب قهوة، إضاءة دافئة")} /></label>
          )}
          {photo === "upload" && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn btn-outline cursor-pointer px-4 py-2 text-[14px]">{upBusy ? "…" : up ? L("غيّر الصورة") : L("اختر صورة")}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={upBusy} onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setUpBusy(true); setError(""); try { setUp(await uploadImage(f)); } catch (err) { setError((err as Error).message); } finally { setUpBusy(false); } }} /></label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {up && <img src={up.preview} alt="" className="h-16 w-16 rounded-xl border border-line object-cover" />}
              <span className="text-[13px] text-subtle">{L("صورة منتجك أو محلك أو أي صورة تملك حقها.")}</span>
            </div>
          )}
        </div>
      )}
      {hasKit && !invite && !cvTool && (
        <div className="flex flex-col gap-2 text-[14px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} className="h-4 w-4" />{L("استخدم ألوان وخط هويتي التجارية")}</label>
          {hasLogo && <label className="flex items-center gap-2"><input type="checkbox" checked={useBrand && useLogo} disabled={!useBrand} onChange={(e) => setUseLogo(e.target.checked)} className="h-4 w-4" />{L("حط شعاري على التصميم")}</label>}
        </div>
      )}
      {hasStyle && <label className="flex items-start gap-2.5 text-[14px]"><input type="checkbox" checked={useStyle} onChange={(e) => setUseStyle(e.target.checked)} className="mt-1 size-4" /><span><span className="font-semibold">{L("صمّم بأسلوبي ✨")}</span><span className="block text-[13px] text-subtle">{L("شاهين يستلهم من وصف ذوقك وصورك المرجعية المحفوظة في «هويتي».")}</span></span></label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      <button type="button" disabled={busy || upBusy || idea.trim().length < 10 || balance < cost || (canPhoto && photo === "upload" && !up)} onClick={() => send({ tool, idea, aspect, slides, useBrand, useLogo, useStyle, ...(canPhoto && photo === "ai" ? { photo: "ai", photoDesc } : canPhoto && photo === "upload" && up ? { photo: "upload", photoPath: up.path } : {}) })} className="btn btn-gold w-full py-3.5 disabled:opacity-50">{busy ? L("جاري الإرسال…") : LT(`✨ صمّم (${cost} ريشة)`, `✨ Design (${cost} credits)`)}</button>
      {balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك من الريش ما يكفي.")}</p>}
      <p className="text-center text-[12.5px] leading-6 text-subtle">{L("أداة تجريبية: التصميم يكتبه الذكاء الاصطناعي من الصفر، فمرة يطلع ممتاز ومرة يحتاج تعديل بالكلام. إذا فشل ترجع الريش تلقائياً.")}</p>
    </div>
  );
}
