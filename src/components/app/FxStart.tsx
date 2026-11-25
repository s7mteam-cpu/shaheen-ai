"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Progress } from "@/components/app/Progress";
import { createClient } from "@/lib/supabase/client";
import { compressVideo } from "@/lib/compressVideo";
import { FX_STYLES } from "@/lib/fxStyles";
import { FxStudio } from "@/components/app/FxStudio";

type State = { status: "queued" | "running"; progress: number; step?: string } | { status: "done"; title: string; aspect: string; seconds: number; cues: number; missing: number; note?: string; adminView?: { timings: Record<string, number> | null; review: { score?: number | null; summary?: string; issues?: number; redone?: number[] } | null } | null; videoUrl: string; downloadUrl: string } | { status: "failed"; error: string };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** «مونتاج مبتكر»: the customer uploads his own talking video and describes the edit; the AI plans the graphics from his words and draws them over the video. */
export function FxStart({ costPerMinute, balance, hasKit, maxSeconds, behindCost, imagesCost, musicCost, bgCost }: { costPerMinute: number; balance: number; hasKit: boolean; maxSeconds: number; /** -1: not offered */ behindCost: number; /** -1: not offered */ imagesCost: number; /** -1: not offered */ musicCost: number; /** «غيّر خلفيتي»: -1 not offered, otherwise the cut-out price it shares with «ورا المتحدث» */ bgCost: number }) {
  const [bgOn, setBgOn] = useState(false);
  const [bgText, setBgText] = useState("");
  const [sfx, setSfx] = useState(true);
  const [tight, setTight] = useState(false);
  const [ownMusic, setOwnMusic] = useState<{ path: string; name: string } | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const [moves, setMoves] = useState(true);
  const [music, setMusic] = useState(false);
  const [behind, setBehind] = useState(false);
  const [aiImages, setAiImages] = useState(false);
  const FX_MAX_SECONDS = maxSeconds;
  const router = useRouter();
  const sp = useSearchParams();
  const jobId = sp.get("job");
  const [video, setVideo] = useState<{ path: string; name: string; seconds: number; url: string } | null>(null);
  const [photos, setPhotos] = useState<{ path: string; url: string; note: string }[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  async function addPhoto(file: File | undefined) {
    if (!file || photos.length >= 3) return;
    setErr(""); setPhotoBusy(true);
    try {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error(L("الصورة لازم تكون PNG أو JPG أو WEBP."));
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      const { error } = await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      if (error) throw new Error(L("تعذّر رفع الصورة."));
      setPhotos((p) => [...p, { path: d.path, url: URL.createObjectURL(file), note: "" }].slice(0, 3));
    } catch (e) { setErr(e instanceof Error ? e.message : L("تعذّر رفع الصورة.")); }
    finally { setPhotoBusy(false); }
  }
  async function addMusic(file: File | undefined) {
    if (!file) return;
    setErr(""); setMusicBusy(true);
    try {
      if (!/^audio\//.test(file.type)) throw new Error(L("الملف لازم يكون صوت (MP3 أو M4A أو WAV)."));
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "audio", type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      const { error } = await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      if (error) throw new Error(L("تعذّر رفع الملف."));
      setOwnMusic({ path: d.path, name: file.name });
    } catch (e) { setErr(e instanceof Error ? e.message : L("تعذّر رفع الملف.")); }
    finally { setMusicBusy(false); }
  }
  const [upPct, setUpPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [styles, setStyles] = useState<string[]>(["paper"]);
  const [depth, setDepth] = useState<"auto" | "2d" | "2.5d" | "3d">("auto");
  const pickStyle = (id: string) => setStyles((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2))); // up to two: they are merged into one look
  const [styleDesc, setStyleDesc] = useState("");
  const [captions, setCaptions] = useState(true);
  const [useIdentity, setUseIdentity] = useState(hasKit);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [state, setState] = useState<State | null>(null);
  const stopped = useRef(false);
  const [ask, setAsk] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  async function cancel() {
    if (!jobId || cancelling) return;
    setCancelling(true);
    const r = await fetch(`/api/free-montage?job=${jobId}`, { method: "DELETE" }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setCancelling(false); setAsk(false);
    if (r?.ok) { stopped.current = true; setState({ status: "failed", error: "ألغيت الطلب." }); router.refresh(); } else { setErr(L(d?.error ?? "تعذّر الإلغاء.")); void poll(); }
  }

  const poll = useCallback(async () => {
    if (!jobId) return;
    const r = await fetch(`/api/free-montage?job=${jobId}`, { cache: "no-store" }).catch(() => null);
    const d = r ? ((await r.json().catch(() => null)) as State | { error: string } | null) : null;
    if (!d) return;
    if ("error" in d && !("status" in d)) { setState({ status: "failed", error: d.error }); stopped.current = true; return; }
    setState(d as State);
    if ((d as State).status === "done" || (d as State).status === "failed") stopped.current = true;
  }, [jobId]);
  useEffect(() => {
    if (!jobId) return;
    stopped.current = false; setState(null);
    void poll();
    const t = setInterval(() => { if (!stopped.current) void poll(); }, 5000);
    return () => clearInterval(t);
  }, [jobId, poll]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setErr(""); setUploading(true); setVideo(null);
    try {
      // The customer's file goes up AS IT IS whenever the upload limit allows it (best quality, nothing re-encoded in the browser).
      // Only a file above the limit is shrunk in the browser first, and the shrunk copy is used only if it passes the checks in compressVideo.
      const sign = (f: File) => fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "video", type: f.type, size: f.size, name: f.name }) });
      let small = file, r = await sign(file), d = await r.json();
      if (!r.ok && d?.code === "TOO_BIG") {
        setUpPct(0);
        small = await compressVideo(file, setUpPct);
        setUpPct(null);
        if (small === file) throw new Error(`${L("حجم الفيديو")} ${Math.round(file.size / 1048576)} ${L("ميجا والحد الأقصى")} ${d.maxMb} ${L("ميجا، وما قدر متصفحك يصغّره بدون ما يخرب تزامن الصوت. صدّره من جوالك بدقة 1080p أو قصّه، وارفعه مرة ثانية.")}`);
        r = await sign(small); d = await r.json();
      }
      const seconds = await new Promise<number>((res) => {
        const el = document.createElement("video");
        const done = (v: number) => { clearTimeout(t); res(Number.isFinite(v) && v > 0 ? v : 0); };
        const t = setTimeout(() => done(0), 8000);
        el.preload = "metadata"; el.muted = true; el.onloadedmetadata = () => done(el.duration); el.onerror = () => done(0);
        el.src = URL.createObjectURL(small);
      });
      if (!seconds) throw new Error(L("ما قدرنا نقرأ مدة الفيديو. جرّب فيديو بصيغة MP4."));
      if (seconds < 5) throw new Error(L("الفيديو قصير جداً (أقل من 5 ثواني)."));
      if (seconds > FX_MAX_SECONDS) throw new Error(`${L("الحد الأقصى حالياً")} ${Math.round(FX_MAX_SECONDS / 60)} ${L("دقائق للفيديو. قصّه وارفعه مرة ثانية.")}`);
      if (!r.ok) throw new Error(L(d.error));
      const { error } = await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, small);
      if (error) throw new Error(/size|large|413/i.test(error.message) ? L("الملف أكبر من المسموح. صغّر حجمه وحاول مرة ثانية.") : L("تعذّر رفع الملف."));
      setVideo({ path: d.path, name: file.name, seconds, url: URL.createObjectURL(small) });
    } catch (e) { setErr(e instanceof Error ? e.message : L("تعذّر رفع الملف.")); }
    finally { setUploading(false); setUpPct(null); }
  }

  const minutes = video ? Math.max(1, Math.ceil(Math.ceil(video.seconds) / 60)) : 1;
  const picCount = video ? Math.max(1, Math.min(8, Math.round(Math.ceil(video.seconds) / 8))) : 8;
  const wantBg = bgOn && bgCost >= 0 && bgText.trim().length >= 3;
  const cost = minutes * (costPerMinute + ((behind && behindCost >= 0) || wantBg ? Math.max(0, behindCost >= 0 ? behindCost : bgCost) : 0) + (music && !ownMusic && musicCost >= 0 ? musicCost : 0)) + (aiImages && imagesCost >= 0 ? picCount * imagesCost : 0);
  const descOk = styles.length > 0 || styleDesc.trim().length >= 15;

  async function start(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!video || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/free-montage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video: video.path, seconds: Math.ceil(video.seconds), notes, styles, styleDesc, depth, captions, useIdentity, behind: behind && behindCost >= 0, aiImages: aiImages && imagesCost >= 0, sfx, moves, tight, ...(wantBg ? { bg: bgText.trim() } : {}), music: music && !ownMusic && musicCost >= 0, ...(ownMusic ? { musicFile: ownMusic.path } : {}), photos: photos.map((x) => ({ path: x.path, note: x.note })) }) }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok || !d?.jobId) { setErr(L(d?.error ?? "تعذّر بدء المونتاج.")); return; }
    router.push(`/app/tools/free-montage?job=${d.jobId}`);
    router.refresh();
  }

  if (jobId && sp.get("studio") === "1") return <FxStudio jobId={jobId} balance={balance} />;
  if (jobId) {
    if (state?.status === "failed") return <div className="card max-w-2xl p-6"><p className="font-semibold text-red-700">{L(state.error)}</p><p className="mt-2 text-[14px] text-muted">{L("رجعت لك ريشك كاملة.")}</p><Link href="/app/tools/free-montage" className="btn btn-outline mt-4 inline-flex px-5 py-2.5">{L("جرّب مرة ثانية")}</Link></div>;
    if (state?.status === "done") return (
      <div className="card flex max-w-3xl flex-col gap-4 p-5 sm:p-6">
        <p className="text-[15px] font-semibold text-navy-900">✅ {state.title}</p>
        <video src={state.videoUrl} controls playsInline className={`mx-auto w-full rounded-2xl bg-black ${state.aspect === "16:9" ? "" : state.aspect === "1:1" ? "max-w-md" : "max-w-xs"}`} />
        <p className="text-center text-[13px] text-subtle">{mmss(state.seconds)} · {state.cues} {L("عنصر غرافيكس")}{state.missing ? ` · ${L("جزء من الفيديو طلع بالترجمة فقط")}` : ""}</p>
        {state.adminView && <div className="rounded-xl border border-line bg-tint px-4 py-3 text-[13px] text-navy-900" dir="rtl">
          <p className="font-semibold">{L("للأدمن فقط")}</p>
          {state.adminView.timings && (() => { const t = state.adminView!.timings!, steps: [string, string][] = [["prepare", "تجهيز"], ["listen", "تفريغ"], ["plan", "تخطيط"], ["design", "تصميم"], ["draw", "تركيب"], ["watch", "مراجعة"], ["redo", "إعادة"], ["finish", "تسليم"]]; let prev = 0; return <p className="mt-1">{L("وقت كل مرحلة")}: {steps.filter(([k]) => typeof t[k] === "number").map(([k, n]) => { const dur = t[k] - prev; prev = t[k]; return `${L(n)} ${dur}${L("ث")}`; }).join(" · ")} · {L("المجموع")} {Math.round(prev / 60 * 10) / 10} {L("دقيقة")}</p>; })()}
          {state.adminView.review && <p className="mt-1">{L("المراجعة النهائية")}: {state.adminView.review.score ?? "—"}/10 · {state.adminView.review.issues ?? 0} {L("ملاحظة")}{state.adminView.review.redone?.length ? ` · ${L("أُعيد مقطع")} ${state.adminView.review.redone.join("، ")}` : ""}. {state.adminView.review.summary}</p>}
        </div>}
        {state.note && <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-[13px] text-amber-900">ℹ️ {state.note}</p>}
        <div className="flex flex-wrap justify-center gap-2">
          <a href={state.downloadUrl} className="btn btn-gold px-6 py-3">⬇️ {L("تحميل الفيديو")}</a>
          <Link href={`/app/tools/free-montage?job=${jobId}&studio=1`} className="btn btn-outline px-5 py-3">🎛️ {L("عدّل بالاستوديو")}</Link>
          <Link href="/app/tools/free-montage" className="btn btn-outline px-5 py-3">✨ {L("مونتاج جديد")}</Link>
        </div>
        <p className="text-center text-[12px] text-subtle">{L("بالاستوديو تحرّك العناصر وتغيّر النصوص والألوان وتصحّح كلمات الترجمة، ثم تصدّر من جديد مجاناً. الفيديو محفوظ بـ«أعمالي».")}</p>
      </div>
    );
    const pr = state && "progress" in state ? state.progress : 0;
    return <div className="card max-w-2xl p-6"><Progress value={pr || 3} label={state && "step" in state && state.step ? L(state.step) : L("بالانتظار…")} /><p className="mt-3 text-[13px] text-subtle">{L("شاهين يسمع كلامك، يخطط المونتاج، يرسم الغرافيكس ويركّبها فوق فيديوك. ياخذ تقريباً من 5 إلى 10 دقائق لكل دقيقة فيديو.")} {L("تقدر تطلع من الصفحة، تلقاه بـ«أعمالي» لما يخلص.")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ask ? (<><span className="text-[14px] text-navy-900">{L("متأكد؟ يتوقف المونتاج وترجع لك ريشك.")}</span><button type="button" disabled={cancelling} onClick={cancel} className="btn btn-outline px-4 py-2 text-[14px] text-red-700">{cancelling ? L("لحظات…") : L("نعم، ألغِ الطلب")}</button><button type="button" disabled={cancelling} onClick={() => setAsk(false)} className="btn btn-outline px-4 py-2 text-[14px]">{L("لا، كمّل")}</button></>) : <button type="button" onClick={() => setAsk(true)} className="text-[13px] font-semibold text-red-700 underline">{L("إلغاء الطلب")}</button>}
      </div>
      {err && <p className="mt-2 text-[14px] text-red-700">{err}</p>}</div>;
  }

  return (
    <form onSubmit={start} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900">{L("ميزة تجريبية: شاهين يرسم غرافيكس ومؤثرات جديدة من كلامك ويركّبها فوق فيديوك. فيديوك وصوتك ما يتغيرون. إذا فشل المونتاج ترجع لك ريشك كاملة.")}</p>
      <div className="flex flex-col gap-2">
        <span className="font-semibold">{L("الفيديو")} <span className="text-[13px] font-normal text-subtle">{L("(أنت تتكلم للكاميرا، حتى")} {Math.round(FX_MAX_SECONDS / 60)} {L("دقائق)")}</span></span>
        {video ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"><span className="truncate text-[14px]">🎬 {video.name} · <span dir="ltr">{mmss(video.seconds)}</span></span><button type="button" onClick={() => setVideo(null)} className="text-[13px] font-semibold text-red-700">{L("تغيير")}</button></div>
        ) : null}
        {video && <div className="flex flex-col items-center gap-1.5"><video src={video.url} controls playsInline preload="metadata" className="max-h-72 rounded-xl bg-black" /><span className="text-[12px] text-subtle">{L("تأكد إن هذا هو الفيديو الخام (بدون مونتاج سابق عليه) قبل ما تبدأ.")}</span></div>}
        {video ? null : (
          <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line bg-tint px-4 py-8 text-center ${uploading ? "pointer-events-none opacity-70" : ""}`}>
            <span className="text-[15px] font-semibold text-navy-900">{uploading ? (upPct !== null ? `${L("تجهيز الفيديو")} ${upPct}%` : L("جارٍ الرفع…")) : `⬆️ ${L("ارفع الفيديو")}`}</span>
            <span className="text-[12px] text-subtle">MP4 / MOV</span>
            <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" disabled={uploading} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-semibold">{L("ستايل الغرافيكس")} <span className="text-[13px] font-normal text-subtle">{L("(اختر واحد أو اثنين يندمجون، أو اكتب ستايلك تحت)")}</span></span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FX_STYLES.map((a) => (
            <button key={a.id} type="button" aria-pressed={styles.includes(a.id)} onClick={() => pickStyle(a.id)} className={`rounded-xl border p-2.5 text-start ${styles.includes(a.id) ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}><span className="block text-[14px] font-semibold text-navy-900">{a.icon} {L(a.name)}</span><span className="block text-[12px] leading-5 text-subtle">{L(a.hint)}</span></button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">✍️ {L("من وصفي")} <span className="font-normal text-subtle">{styles.length ? L("(اختياري: يندمج مع الستايل المختار)") : L("(اكتب الستايل كله بكلامك)")}</span></span>
          <textarea value={styleDesc} onChange={(e) => setStyleDesc(e.target.value)} maxLength={600} rows={3} className="field" placeholder={L("اكتب الجو العام، الألوان، الخامات، نوع الحركة والمشاهد. مثال: زجاج شفاف بحواف مضيئة فوق ألوان ليلية، بطاقات تدور بعمق، حركة ناعمة وبطيئة، وأرقام كبيرة تعدّ.")} /></label>
        <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold">{L("العمق")}:</span>
          {([["auto", "تلقائي"], ["2d", "2D مسطح"], ["2.5d", "2.5D طبقات وعمق"], ["3d", "3D مجسّمات حقيقية ✨"]] as const).map(([id, name]) => <button key={id} type="button" aria-pressed={depth === id} onClick={() => setDepth(id)} className={`rounded-lg border px-3 py-1.5 text-[13px] ${depth === id ? "border-gold-500 bg-gold-500/10 font-semibold" : "border-line bg-white"}`}>{L(name)}</button>)}
        </div>
      </div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("شنو تبي بالمونتاج؟ (اختياري)")}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={800} rows={4} className="field" placeholder={L("كل ما وصفت أدق طلع أحسن: وين تطلع العناصر (فوق، تحت، بالنص، حتى فوق وجهك)، حجمها، سرعتها، وشنو يطلع مع كل جملة. مثال: ابدأ بهوك قوي يغطي الشاشة، كل رقم أذكره يطلع كبير بالنص، ولما أذكر دولة تطلع خريطتها تحت. الإيقاع سريع. واكتب اسمك والأسماء المهمة هنا بإملائها الصحيح، حتى تنكتب صح بالترجمة.")} />
        <span className="text-[12px] text-subtle">{L("شاهين ما يحط صور أو وجوه أشخاص حقيقيين ولا شعارات وجرائد حقيقية: كل شي ينرسم من جديد.")}</span></label>
      <div className="flex flex-col gap-2">
        <span className="font-semibold">{L("صورك داخل المونتاج")} <span className="text-[13px] font-normal text-subtle">{L("(اختياري، حتى 3: منتجك، شعارك، لقطة تملكها)")}</span></span>
        {photos.map((ph, i) => (
          <div key={ph.path} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <input value={ph.note} maxLength={80} onChange={(e) => { const v = e.target.value; setPhotos((p) => p.map((x, k) => (k === i ? { ...x, note: v } : x))); }} className="field min-w-0 flex-1" placeholder={L("شنو هالصورة ومتى تطلع؟ مثال: منتجي، تطلع لما أذكر السعر")} />
            <button type="button" onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))} className="px-2 text-[13px] font-semibold text-red-700">{L("حذف")}</button>
          </div>
        ))}
        {photos.length < 3 && <label className={`inline-flex cursor-pointer items-center gap-2 self-start rounded-xl border border-dashed border-line bg-tint px-4 py-2.5 text-[14px] font-semibold text-navy-900 ${photoBusy ? "pointer-events-none opacity-60" : ""}`}>{photoBusy ? L("جارٍ الرفع…") : `➕ ${L("أضف صورة")}`}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={photoBusy} onChange={(e) => { void addPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>}
        <span className="text-[12px] text-subtle">{L("أنت المسؤول عن الصور اللي ترفعها: ارفع فقط ما تملك حق استخدامه ونشره. الصورة تطلع كما هي بإطار وحركة من الستايل.")}</span>
      </div>
      <label className="flex items-start gap-3"><input type="checkbox" checked={sfx} onChange={(e) => setSfx(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("مؤثرات صوتية 🔊")}<span className="block text-[12px] text-subtle">{L("صوت خفيف مع دخول كل عنصر (ووش، نقرة، رنّة مع الأرقام). صوتك يبقى مثل ما هو.")}</span></span></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={moves} onChange={(e) => setMoves(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("زوم وانتقالات 🎥")}<span className="block text-[12px] text-subtle">{L("تقريب ناعم على وجهك بالجمل المهمة، ولمعة سريعة لما تنتقل لموضوع جديد.")}</span></span></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={tight} onChange={(e) => setTight(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("قص السكتات ✂️")}<span className="block text-[12px] text-subtle">{L("شاهين يشيل السكتات الطويلة من كلامك (ثانية وأكثر) فيطلع الفيديو مشدود وأقصر.")}</span></span></label>
      <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3">
        <span className="text-[15px]">{L("موسيقتك أو نشيدك 🎶")} <span className="text-[12px] text-subtle">{L("(اختياري)")}</span></span>
        {ownMusic ? <div className="flex items-center gap-3"><span className="min-w-0 flex-1 truncate text-[14px]" dir="auto">{ownMusic.name}</span><button type="button" onClick={() => setOwnMusic(null)} className="px-2 text-[13px] font-semibold text-red-700">{L("حذف")}</button></div>
          : <label className="btn btn-outline w-fit cursor-pointer px-3 py-1.5 text-[14px]">{musicBusy ? L("جارٍ الرفع…") : L("ارفع ملف صوت")}<input type="file" accept="audio/*" className="hidden" disabled={musicBusy} onChange={(e) => { addMusic(e.target.files?.[0]); e.target.value = ""; }} /></label>}
        <span className="text-[12px] text-subtle">{L("يشتغل بصوت واطي تحت كلامك طول الفيديو. أنت المسؤول عنه: ارفع فقط ما تملك حق استخدامه ونشره.")}</span>
      </div>
      {musicCost >= 0 && !ownMusic && <label className="flex items-start gap-3"><input type="checkbox" checked={music} onChange={(e) => setMusic(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("موسيقى خلفية 🎵")}{musicCost > 0 ? ` (+${musicCost} ${L("ريشة لكل دقيقة")})` : ""}<span className="block text-[12px] text-subtle">{L("موسيقى هادئة بدون غناء تناسب كلامك، بصوت واطي تحت صوتك.")}</span></span></label>}
      {imagesCost >= 0 && <label className="flex items-start gap-3"><input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("صور مولّدة بالذكاء الاصطناعي 🖼️")}{imagesCost > 0 ? ` (+${picCount * imagesCost} ${L("ريشة")})` : ""}<span className="block text-[12px] text-subtle">{L("شاهين يرسم صوراً تناسب كلامك (قطار، مدينة، مشهد تاريخي، منتج…) ويحطها بالمونتاج. بدون أشخاص حقيقيين أو مشاهير أو شعارات. إذا تبي صورة حقيقية بعينها، ارفعها من «صورك داخل المونتاج» وعلى مسؤوليتك.")}</span></span></label>}
      {bgCost >= 0 && <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3"><input type="checkbox" checked={bgOn} onChange={(e) => setBgOn(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("غيّر خلفيتي 🏢")}{bgCost > 0 && !behind ? ` (+${bgCost} ${L("ريشة لكل دقيقة")})` : ""}<span className="block text-[12px] text-subtle">{L("شاهين يقصّك من الغرفة ويحط وراك مكان جديد مرسوم بالذكاء الاصطناعي طول الفيديو. يطلع أحسن إذا الكاميرا ثابتة وأنت واضح عن الخلفية. بدون أشخاص حقيقيين أو شعارات.")}</span></span></label>
        {bgOn && <input value={bgText} maxLength={200} onChange={(e) => setBgText(e.target.value)} className="field" placeholder={L("شنو تبي وراك؟ مثال: مكتب فخم فيه مكتبة خشب وإضاءة دافئة")} />}
      </div>}
      {behindCost >= 0 && <label className="flex items-start gap-3"><input type="checkbox" checked={behind} onChange={(e) => setBehind(e.target.checked)} className="mt-1 h-5 w-5" /><span className="text-[15px]">{L("عناصر ورا المتحدث ✨")}{behindCost > 0 ? ` (+${behindCost} ${L("ريشة لكل دقيقة")})` : ""}<span className="block text-[12px] text-subtle">{L("شاهين يقصّك من الخلفية ويحط كلمات وأشكال كبيرة وراك، فتطلع بعمق حقيقي. ياخذ وقت أطول، وفيديوك يمر على خدمة قص خارجية.")}</span></span></label>}
      <label className="flex items-center gap-3"><input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} className="h-5 w-5" /><span className="text-[15px]">{L("ترجمة عربية متحركة كلمة كلمة")}</span></label>
      {hasKit && <label className="flex items-center gap-3"><input type="checkbox" checked={useIdentity} onChange={(e) => setUseIdentity(e.target.checked)} className="h-5 w-5" /><span className="text-[15px]">{L("استخدم ألوان هويتي")}</span></label>}
      {err && <p className="text-[14px] text-red-700">{err}</p>}
      <button disabled={busy || uploading || !video || !descOk || balance < cost} className="btn btn-gold py-3.5 text-[16px]">{busy ? L("لحظات…") : `✨ ${L("ابدأ المونتاج")} (${cost} ${L("ريشة")})`}</button>
      <p className="text-center text-[12px] text-subtle">{L("السعر بالدقيقة")}: {costPerMinute} {L("ريشة")}{video ? ` × ${minutes}` : ""}</p>
      {video && balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك ما يكفي.")}</p>}
    </form>
  );
}
