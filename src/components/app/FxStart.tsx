"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Progress } from "@/components/app/Progress";
import { createClient } from "@/lib/supabase/client";
import { compressVideo } from "@/lib/compressVideo";
import { FX_STYLES, FX_MAX_SECONDS } from "@/lib/fxStyles";
import { FxStudio } from "@/components/app/FxStudio";

type State = { status: "queued" | "running"; progress: number; step?: string } | { status: "done"; title: string; aspect: string; seconds: number; cues: number; missing: number; note?: string; videoUrl: string; downloadUrl: string } | { status: "failed"; error: string };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** «مونتاج مبتكر»: the customer uploads his own talking video and describes the edit; the AI plans the graphics from his words and draws them over the video. */
export function FxStart({ costPerMinute, balance, hasKit }: { costPerMinute: number; balance: number; hasKit: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const jobId = sp.get("job");
  const [video, setVideo] = useState<{ path: string; name: string; seconds: number } | null>(null);
  const [upPct, setUpPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [styles, setStyles] = useState<string[]>(["paper"]);
  const [depth, setDepth] = useState<"auto" | "2d" | "2.5d">("auto");
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
      setUpPct(0);
      const small = await compressVideo(file, setUpPct); // big phone videos are shrunk to 1080p in the browser first
      setUpPct(null);
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
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "video", type: small.type, size: small.size, name: small.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      const { error } = await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, small);
      if (error) throw new Error(/size|large|413/i.test(error.message) ? L("الملف أكبر من المسموح. صغّر حجمه وحاول مرة ثانية.") : L("تعذّر رفع الملف."));
      setVideo({ path: d.path, name: file.name, seconds });
    } catch (e) { setErr(e instanceof Error ? e.message : L("تعذّر رفع الملف.")); }
    finally { setUploading(false); setUpPct(null); }
  }

  const minutes = video ? Math.max(1, Math.ceil(Math.ceil(video.seconds) / 60)) : 1;
  const cost = minutes * costPerMinute;
  const descOk = styles.length > 0 || styleDesc.trim().length >= 15;

  async function start(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!video || busy) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/free-montage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video: video.path, seconds: Math.ceil(video.seconds), notes, styles, styleDesc, depth, captions, useIdentity }) }).catch(() => null);
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
        ) : (
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
          {([["auto", "تلقائي"], ["2d", "2D مسطح"], ["2.5d", "2.5D طبقات وعمق"]] as const).map(([id, name]) => <button key={id} type="button" aria-pressed={depth === id} onClick={() => setDepth(id)} className={`rounded-lg border px-3 py-1.5 text-[13px] ${depth === id ? "border-gold-500 bg-gold-500/10 font-semibold" : "border-line bg-white"}`}>{L(name)}</button>)}
        </div>
      </div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("شنو تبي بالمونتاج؟ (اختياري)")}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={800} rows={4} className="field" placeholder={L("مثال: ابدأ بهوك قوي، كل رقم أذكره يطلع كبير، ولما أذكر دولة تطلع خريطتها، والنقاط المهمة تطلع قائمة على اليمين. الإيقاع سريع.")} />
        <span className="text-[12px] text-subtle">{L("شاهين ما يحط صور أو وجوه أشخاص حقيقيين ولا شعارات وجرائد حقيقية: كل شي ينرسم من جديد.")}</span></label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={captions} onChange={(e) => setCaptions(e.target.checked)} className="h-5 w-5" /><span className="text-[15px]">{L("ترجمة عربية متحركة كلمة كلمة")}</span></label>
      {hasKit && <label className="flex items-center gap-3"><input type="checkbox" checked={useIdentity} onChange={(e) => setUseIdentity(e.target.checked)} className="h-5 w-5" /><span className="text-[15px]">{L("استخدم ألوان هويتي")}</span></label>}
      {err && <p className="text-[14px] text-red-700">{err}</p>}
      <button disabled={busy || uploading || !video || !descOk || balance < cost} className="btn btn-gold py-3.5 text-[16px]">{busy ? L("لحظات…") : `✨ ${L("ابدأ المونتاج")} (${cost} ${L("ريشة")})`}</button>
      <p className="text-center text-[12px] text-subtle">{L("السعر بالدقيقة")}: {costPerMinute} {L("ريشة")}{video ? ` × ${minutes}` : ""}</p>
      {video && balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك ما يكفي.")}</p>}
    </form>
  );
}
