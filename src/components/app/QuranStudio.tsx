"use client";
import { L, LT } from "@/lib/i18n/ui";
import "@fontsource/amiri-quran/arabic-400.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import { Player } from "@remotion/player";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuranVideo } from "@/remotion/QuranVideo";
import { MAX_AYAT, QFPS, Q_FONTS, Q_STYLES, SURAHS, qDims, qFrames, type QAyah, type QuranSpec, type Reciter } from "@/remotion/quran";
import { createClient } from "@/lib/supabase/client";

const BG_PRESETS: [string, string][] = [
  ["ocean waves calm", "🌊 بحر"], ["clouds sky timelapse", "☁️ سماء وغيوم"], ["green forest nature", "🌳 طبيعة خضراء"], ["night sky stars", "✨ نجوم وليل"],
  ["rain drops window", "🌧 مطر"], ["desert sand dunes", "🏜 صحراء"], ["waterfall", "💧 شلال"], ["sunset clouds", "🌅 غروب"], ["mountains fog", "⛰ جبال وضباب"], ["flowers nature", "🌸 زهور"],
];
type BgHit = { id: number; thumb: string; preview: string; full: string; by: string; secs: number };

const START: QuranSpec = {
  aspect: "9:16", surah: 1, from: 1, to: 7, reciter: "dosari", reciterName: "ياسر الدوسري", folder: "", ayahs: [], bg: null,
  dim: 0.35, style: "classic", font: "Amiri Quran", textColor: "#FFFFFF", accent: "#C9A45C",
  showSurah: true, showNumbers: true, showTranslation: false, showReciter: true, gap: 1, quality: "1080",
};

/** Reads the length of each ayah's recitation in the browser (the worker measures it again exactly). */
function audioLen(src: string): Promise<number | null> {
  return new Promise((res) => {
    const a = new Audio(); a.preload = "metadata";
    const done = (v: number | null) => { a.src = ""; res(v); };
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => done(null);
    setTimeout(() => done(null), 10000);
    a.src = src;
  });
}

export function QuranStudio({ costPer30, balance }: { costPer30: number; balance: number }) {
  const [spec, setSpec] = useState<QuranSpec>(START);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [basmala, setBasmala] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bgHits, setBgHits] = useState<BgHit[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; status: string; progress: number; url?: string } | null>(null);
  const seq = useRef(0);
  const count = SURAHS[spec.surah - 1][1];

  // load the ayat (exact Uthmani text from the mushaf API) whenever the choice changes
  useEffect(() => {
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch("/api/quran/verses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ surah: spec.surah, from: spec.from, to: spec.to, reciter: spec.reciter, basmala }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || L("تعذّر جلب الآيات، حاول مرة ثانية."));
        if (my !== seq.current) return;
        setReciters(d.reciters);
        const est = (a: { text: string }) => Math.max(3, a.text.length / 9);
        const ayahs: QAyah[] = d.ayahs.map((a: QAyah) => ({ ...a, dur: est(a) }));
        setSpec((s) => ({ ...s, reciterName: d.reciter.name, folder: d.reciter.folder, ayahs }));
        const lens = await Promise.all(ayahs.map((a) => audioLen(a.audio)));
        if (my !== seq.current) return;
        setSpec((s) => ({ ...s, ayahs: s.ayahs.map((a, i) => ({ ...a, dur: lens[i] ? +lens[i]!.toFixed(2) : a.dur })) }));
      } catch (e) { if (my === seq.current) setErr((e as Error).message || L("تعذّر جلب الآيات.")); } finally { if (my === seq.current) setLoading(false); }
    }, 450);
    return () => clearTimeout(t);
  }, [spec.surah, spec.from, spec.to, spec.reciter, basmala]);

  // render progress after export
  useEffect(() => {
    if (!job || job.status === "done" || job.status === "failed") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/jobs/${job.id}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json();
      setJob((j) => j && { ...j, status: d.status, progress: d.progress ?? 0, url: d.files?.[0]?.url });
    }, 3000);
    return () => clearInterval(t);
  }, [job]);

  async function post<T>(action: string, body: object): Promise<T | null> {
    setBusy(action); setErr(null);
    try {
      const r = await fetch(`/api/quran/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || L("صار خطأ، حاول مرة ثانية."));
      return d as T;
    } catch (e) { setErr((e as Error).message || L("صار خطأ، حاول مرة ثانية.")); return null; } finally { setBusy(null); }
  }

  async function uploadBg(file: File) {
    const kind = file.type.startsWith("video/") ? "video" : "image";
    setBusy("upload"); setErr(null);
    try {
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const sb = createClient();
      const up = await sb.storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      if (up.error) throw new Error(L("تعذّر رفع الخلفية."));
      const signed = await sb.storage.from("uploads").createSignedUrl(d.path, 60 * 60 * 6);
      setSpec((s) => ({ ...s, bg: { kind, url: signed.data?.signedUrl ?? "", path: d.path, bucket: "uploads" } }));
    } catch (e) { setErr((e as Error).message || L("تعذّر رفع الخلفية.")); } finally { setBusy(null); }
  }

  const frames = useMemo(() => qFrames(spec), [spec]);
  const seconds = frames / QFPS;
  const cost = Math.max(1, Math.ceil(seconds / 30)) * costPer30;
  const { width, height } = qDims(spec.aspect);
  const set = (p: Partial<QuranSpec>) => setSpec((s) => ({ ...s, ...p }));

  if (job) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        {job.status === "done" && job.url ? (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">{L("✓ الفيديو جاهز")}</h2>
            <video src={job.url} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
            <a href={job.url} download className="btn btn-gold w-full py-3.5">{L("⬇️ تحميل الفيديو")}</a>
            <button type="button" onClick={() => setJob(null)} className="btn border border-line bg-white px-6 py-3">{L("فيديو قرآني جديد")}</button>
          </>
        ) : job.status === "failed" ? (
          <>
            <h2 className="text-[20px] font-bold text-red-800">{L("ما ضبط التصدير، ورجّعنا لك الريش.")}</h2>
            <button type="button" onClick={() => setJob(null)} className="btn btn-primary px-6 py-3">{L("رجوع وحاول مرة ثانية")}</button>
          </>
        ) : (
          <>
            <h2 className="text-[20px] font-bold text-emerald-900">{L("جاري تجهيز الفيديو…")}</h2>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white"><div className="h-full bg-emerald-600 transition-all" style={{ width: `${Math.max(4, job.progress)}%` }} /></div>
            <p className="text-[14px] text-emerald-900/80">{L("تقدر تطلع من الصفحة، ويوصلك الفيديو في")} <Link href="/app/works" className="font-semibold underline">{L("أعمالي")}</Link>.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-[18px] font-bold text-navy-900">📖 {L("السورة والآيات")}</h2>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <label className="flex flex-col gap-1.5"><span className="label">{L("السورة")}</span>
              <select value={spec.surah} onChange={(e) => { const s = +e.target.value; set({ surah: s, from: 1, to: Math.min(SURAHS[s - 1][1], 7) }); }} className="field">
                {SURAHS.map(([n, c], i) => <option key={i} value={i + 1}>{i + 1}. {n} ({c})</option>)}
              </select></label>
            <label className="flex flex-col gap-1.5"><span className="label">{L("من آية")}</span>
              <input type="number" min={1} max={count} value={spec.from} onChange={(e) => { const f = Math.max(1, Math.min(count, +e.target.value || 1)); set({ from: f, to: Math.max(f, Math.min(spec.to, f + MAX_AYAT - 1, count)) }); }} className="field" /></label>
            <label className="flex flex-col gap-1.5"><span className="label">{L("إلى آية")}</span>
              <input type="number" min={spec.from} max={Math.min(count, spec.from + MAX_AYAT - 1)} value={spec.to} onChange={(e) => set({ to: Math.max(spec.from, Math.min(count, spec.from + MAX_AYAT - 1, +e.target.value || spec.from)) })} className="field" /></label>
          </div>
          <label className="flex flex-col gap-1.5"><span className="label">{L("القارئ")}</span>
            <select value={spec.reciter} onChange={(e) => set({ reciter: e.target.value })} className="field">
              {(reciters.length ? reciters : [{ id: spec.reciter, name: spec.reciterName, folder: "" }]).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></label>
          {spec.from === 1 && spec.surah !== 1 && spec.surah !== 9 && (
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={basmala} onChange={(e) => setBasmala(e.target.checked)} className="h-5 w-5" />{L("ابدأ بالبسملة")}</label>
          )}
          <p className="text-[12px] text-subtle">{LT(`لين ${MAX_AYAT} آية بالفيديو. النص من المصحف بالرسم العثماني (مصدر موثوق)، وما يقدر أحد يعدّله.`, `Up to ${MAX_AYAT} ayat. The text comes from the Uthmani mushaf (a trusted source) and can't be edited.`)}</p>
          {loading && <p className="text-[13px] text-subtle">{L("جاري جلب الآيات…")}</p>}
          {spec.ayahs.length > 0 && (
            <ol className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-xl bg-canvas p-3 text-[19px] leading-9 text-navy-900" style={{ fontFamily: '"Amiri Quran", Amiri, serif' }}>
              {spec.ayahs.map((a) => <li key={a.n}>{a.text} {a.n > 0 && <span className="text-[#9A7A35]">﴿{a.n}﴾</span>}</li>)}
            </ol>
          )}
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-[18px] font-bold text-navy-900">🌄 {L("الخلفية")}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={!spec.bg} onClick={() => set({ bg: null })} className="chip">{L("🌙 سماء ليلية (بدون صورة)")}</button>
            {BG_PRESETS.map(([q, l]) => <button key={q} type="button" disabled={!!busy} onClick={async () => { const d = await post<{ videos: BgHit[] }>("bg", { q }); if (d) setBgHits(d.videos); }} className="chip">{L(l)}</button>)}
          </div>
          {busy === "bg" && <p className="text-[13px] text-subtle">{L("جاري البحث…")}</p>}
          {bgHits && (bgHits.length ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {bgHits.map((h) => (
                <li key={h.id}>
                  <button type="button" disabled={!!busy} className="relative block w-full overflow-hidden rounded-lg border border-line" title={h.by}
                    onClick={async () => { const d = await post<{ path: string; url: string }>("bgadd", { url: h.full }); if (d) set({ bg: { kind: "video", url: d.url, path: d.path, bucket: "results" } }); }}>
                    {h.thumb
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={h.thumb} alt="" className="aspect-video w-full object-cover" loading="lazy" />
                      : <video src={h.preview} muted loop autoPlay playsInline className="aspect-video w-full object-cover" />}
                    <span className="absolute bottom-0 inset-x-0 bg-black/55 px-1 text-[10px] text-white" dir="ltr">{h.secs}s · {h.by}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-subtle">{L("ما لقينا خلفيات، جرّب نوع ثاني.")}</p>)}
          {busy === "bgadd" && <p className="text-[13px] text-subtle">{L("جاري تجهيز الخلفية…")}</p>}
          <label className={`btn btn-outline self-start px-4 py-2 text-sm ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            {busy === "upload" ? L("جاري الرفع…") : L("⬆️ أو ارفع صورة أو فيديو من جهازك")}
            <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ""; }} />
          </label>
          <p className="text-[11px] text-subtle">{L("خلفيات طبيعية هادئة من Pixabay (مجانية للاستخدام التجاري)، ونستبعد اللي فيها أشخاص. الفيديو بدون موسيقى.")}</p>
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-[18px] font-bold text-navy-900">🎨 {L("الشكل")}</h2>
          <div className="flex flex-wrap gap-2">{Q_STYLES.map(([v, l]) => <button key={v} type="button" aria-pressed={spec.style === v} onClick={() => set({ style: v })} className="chip">{L(l)}</button>)}</div>
          <div className="flex flex-wrap gap-2">{([["9:16", "طولي (ريلز)"], ["1:1", "مربع"], ["16:9", "عرضي (يوتيوب)"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={spec.aspect === v} onClick={() => set({ aspect: v })} className="chip">{L(l)}</button>)}</div>
          <div className="flex flex-col gap-1.5">
            <span className="label">{L("السكتة بين الآيات")}</span>
            <div className="flex flex-wrap gap-2">
              {([[1, "طبيعية مثل التلاوة"], [1.6, "أطول (هادئة)"], [0.5, "قصيرة"], [0.1, "بدون سكتات"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={spec.gap === v} onClick={() => set({ gap: v })} className="chip">{L(l)}</button>)}
            </div>
            <p className="text-[12px] text-subtle">{L("ملفات التلاوة مقصوصة آية آية، فنرجّع النَّفَس الطبيعي بين الآيات. «بدون سكتات» يخلّي الآيات ورا بعض على طول. الوقفات داخل الآية نفسها ما تنقص أبداً.")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><span className="label">{L("الخط")}</span>
              <select value={spec.font} onChange={(e) => set({ font: e.target.value })} className="field">{Q_FONTS.map(([v, l]) => <option key={v} value={v}>{L(l)}</option>)}</select></label>
            <label className="flex flex-col gap-1.5"><span className="label">{L("تعتيم الخلفية")}</span>
              <input type="range" dir="ltr" min={0} max={0.8} step={0.05} value={spec.dim} onChange={(e) => set({ dim: +e.target.value })} /></label>
            <label className="flex items-center gap-3"><span className="label">{L("لون الآيات")}</span><input type="color" value={spec.textColor} onChange={(e) => set({ textColor: e.target.value })} className="h-9 w-14 rounded" /></label>
            <label className="flex items-center gap-3"><span className="label">{L("لون الزخرفة")}</span><input type="color" value={spec.accent} onChange={(e) => set({ accent: e.target.value })} className="h-9 w-14 rounded" /></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["showSurah", "اسم السورة فوق"], ["showNumbers", "أرقام الآيات"], ["showReciter", "اسم القارئ تحت"], ["showTranslation", "الترجمة الإنجليزية تحت الآية"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2.5"><span className="font-semibold">{L(l)}</span>
                <input type="checkbox" checked={spec[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<QuranSpec>)} className="h-5 w-5" /></label>
            ))}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2.5 sm:col-span-2"><span className="font-semibold">{L("🎞 تصدير بجودة 4K")}</span>
              <input type="checkbox" checked={spec.quality === "4k"} onChange={(e) => set({ quality: e.target.checked ? "4k" : "1080" })} className="h-5 w-5" /></label>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {/* the player measures itself left-to-right: inside an Arabic (RTL) page it slid off-screen and looked black */}
        <div dir="ltr" className="mx-auto w-full overflow-hidden rounded-2xl bg-black shadow-lg" style={{ maxWidth: spec.aspect === "9:16" ? "min(100%, calc((100vh - 11rem) * 0.5625))" : "100%" }}>
          {spec.ayahs.length > 0 ? (
            <Player component={QuranVideo as unknown as React.FC<Record<string, unknown>>} inputProps={spec as unknown as Record<string, unknown>}
              durationInFrames={frames} fps={QFPS} compositionWidth={width} compositionHeight={height} controls acknowledgeRemotionLicense
              initialFrame={Math.round((1.4 + 0.6) * QFPS)} style={{ width: "100%" }} />
          ) : <div className="flex aspect-[9/16] items-center justify-center text-white/70">{loading ? L("جاري التجهيز…") : L("اختر السورة والآيات")}</div>}
        </div>
        <p className="text-[13px] text-subtle">{LT(`المدة تقريباً ${Math.round(seconds)} ثانية · التكلفة ${cost} ريشة · رصيدك ${balance}`, `About ${Math.round(seconds)}s · costs ${cost} credits · balance ${balance}`)}</p>
        {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{err}</p>}
        <button type="button" disabled={!spec.ayahs.length || loading || !!busy || balance < cost} className="btn btn-gold w-full py-4 text-[17px]"
          onClick={async () => { const d = await post<{ jobId: string }>("export", { spec }); if (d) setJob({ id: d.jobId, status: "queued", progress: 0 }); }}>
          {busy === "export" ? L("جاري الإرسال…") : LT(`صدّر الفيديو (${cost} ريشة)`, `Export video (${cost} credits)`)}
        </button>
        {balance < cost && <Link href="/app/account" className="text-center text-[13px] font-semibold text-navy-700 underline">{L("رصيدك ما يكفي — اشحن الريش")}</Link>}
      </aside>
    </div>
  );
}
