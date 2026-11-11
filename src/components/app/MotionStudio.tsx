"use client";
import { L, LT } from "@/lib/i18n/ui";
/* eslint-disable @next/next/no-img-element */
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import { Player } from "@remotion/player";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MotionVideo } from "@/remotion/MotionVideo";
import { Progress } from "@/components/app/Progress";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { uploadImage } from "@/components/app/DesignStart";
import { COLOR_LABELS, FONTS, FPS, dimensions, narration, setText, textFields, type Colors, type MotionSpec } from "@/remotion/spec";

type Track = { name: string; mood?: string; url: string };
type Voice = { id: string; name: string; note?: string };

const Card = ({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) => (
  <section className="card flex flex-col gap-4 p-5">
    <h2 className="flex items-center gap-2 text-[18px] font-bold text-navy-900">{icon && <span aria-hidden>{icon}</span>}{title}</h2>
    {children}
  </section>
);
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;

export function MotionStudio({ jobId, initial, editCost, tracks, voices, demo = false, kitLogo }: {
  jobId: string; initial: MotionSpec; editCost: number; tracks: Track[]; voices: Voice[]; demo?: boolean; kitLogo?: { path: string; url: string } | null;
}) {
  const [spec, setSpec] = useState<MotionSpec>(initial);
  const [tab, setTab] = useState<"lib" | "ai">(tracks.length ? "lib" : "ai");
  const [advOpen, setAdvOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [voiceText, setVoiceText] = useState(() => initial.voice?.text ?? narration(initial));
  const [voiceId, setVoiceId] = useState(voices[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [render, setRender] = useState<{ status: string; progress: number; url?: string }>({ status: "queued", progress: 0 });
  useEffect(() => {
    if (!sent || render.status === "done" || render.status === "failed") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/jobs/${jobId}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json();
      setRender({ status: d.status, progress: d.progress ?? 0, url: d.files?.[0]?.url });
    }, 3000);
    return () => clearInterval(t);
  }, [sent, render.status, jobId]);
  const preview = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  async function uploadLogo(f: File) {
    setBusy("logo"); setError(null);
    try { const u = await uploadImage(f); setSpec((p) => ({ ...p, logo: { path: u.path, url: u.preview, on: true, box: p.logo?.box ?? DEFAULT_LOGO_BOX } })); }
    catch (err) { setError((err as Error).message); } finally { setBusy(null); }
  }
  useEffect(() => setMounted(true), []);

  // Keep the draft between visits.
  const key = `motion:${jobId}`;
  useEffect(() => { try { const s = localStorage.getItem(key); if (s) { const d = JSON.parse(s) as MotionSpec; setSpec(d.logo && kitLogo && d.logo.path === kitLogo.path ? { ...d, logo: { ...d.logo, url: kitLogo.url } } : d); } } catch {} }, [key, kitLogo]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(spec)); } catch {} }, [key, spec]);

  const { width, height } = dimensions(spec.aspect);
  const fields = useMemo(() => textFields(spec), [spec]);

  async function call<T>(path: string, body: object, label: string): Promise<T | null> {
    if (demo) { setError(L("هذي معاينة تجريبية.")); return null; }
    setBusy(label); setError(null);
    try {
      const r = await fetch(`/api/motion/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? L("صار خطأ، حاول مرة ثانية."));
      return d as T;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }

  const setColor = (k: keyof Colors, v: string) => setSpec({ ...spec, colors: { ...spec.colors, [k]: v } });

  function togglePreview(url: string) {
    preview.current?.pause();
    if (playing === url) { setPlaying(null); return; }
    preview.current = new Audio(url); preview.current.play().catch(() => {}); setPlaying(url);
    preview.current.onended = () => setPlaying(null);
  }
  useEffect(() => () => preview.current?.pause(), []);

  if (sent) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        {render.status === "done" && render.url ? (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">{L("✓ الفيديو جاهز")}</h2>
            <video src={render.url} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
            <a href={render.url} download className="btn btn-gold w-full py-3.5">{L("⬇️ تحميل الفيديو")}</a>
          </>
        ) : render.status === "failed" ? (
          <p className="font-semibold text-red-800">{L("ما نجح التصدير، ورجّعنا لك الريش. حاول مرة ثانية.")}</p>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">{L("✓ تم إرسال الفيديو للمعالجة")}</h2>
            <Progress value={render.progress} label={render.status === "queued" && !render.progress ? L("في الطابور…") : L("جاري تجهيز الفيديو…")} />
            <p className="text-[14px] text-emerald-900/80">{L("تقدر تطلع من الصفحة، وبيوصلك الفيديو في «أعمالي» أول ما يخلص.")}</p>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/app/works" className="btn btn-primary px-6 py-3">{L("روح لأعمالي")}</Link>
          <Link href="/app/tools/motion-video" className="btn border border-line bg-white px-6 py-3">{L("إنشاء فيديو جديد")}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
    {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadLogo(f); }} />}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start">
      {/* Live preview */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-900">{L("معاينة مباشرة")}</h2>
          <span className="rounded-full bg-tint px-3 py-1 text-[13px] text-subtle">{spec.seconds} {L("ثانية")}</span>
        </div>
        <div dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-3xl bg-navy-900 shadow-lg" style={{ maxWidth: spec.aspect === "9:16" ? "min(100%, calc((100vh - 11rem) * 0.5625))" : "100%" }}>
          {mounted ? <Player
            component={MotionVideo}
            inputProps={spec}
            durationInFrames={Math.round(spec.seconds * FPS)}
            fps={FPS}
            compositionWidth={width}
            compositionHeight={height}
            style={{ width: "100%" }}
            controls
            loop
            autoPlay
            acknowledgeRemotionLicense
          /> : <div style={{ aspectRatio: `${width} / ${height}` }} />}
          {spec.logo?.on && (
            <div className="pointer-events-none absolute inset-x-0 top-0" style={{ aspectRatio: `${width} / ${height}` }}>
              <LogoDrag box={spec.logo.box} onChange={(b) => setSpec((p) => (p.logo ? { ...p, logo: { ...p.logo, box: b } } : p))} />
            </div>
          )}
        </div>
        <p className="text-center text-[13px] text-subtle">{L("أي تعديل تسويه يبان بالفيديو على طول.")}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card title={L("الشعار")} icon="🏷️">
          <div className="flex flex-wrap items-center gap-3">
            {spec.logo?.url && <img src={spec.logo.url} alt={L("الشعار")} className="h-12 max-w-[120px] rounded-lg bg-tint object-contain p-1" />}
            <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{spec.logo ? L("تغيير الشعار") : L("⬆️ ارفع شعارك")}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} /></label>
            {!spec.logo && kitLogo && <button type="button" onClick={() => setSpec({ ...spec, logo: { ...kitLogo, on: true, box: DEFAULT_LOGO_BOX } })} className="btn btn-outline px-4 py-2 text-sm">{L("✨ استخدم شعار هويتي")}</button>}
            {spec.logo && <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={spec.logo.on} onChange={(e) => setSpec({ ...spec, logo: { ...spec.logo!, on: e.target.checked } })} className="h-4 w-4 accent-navy-700" />{L("اعرض الشعار")}</label>}
          </div>
          {spec.logo?.on && <LogoSize box={spec.logo.box} onChange={(b) => setSpec({ ...spec, logo: { ...spec.logo!, box: b } })} />}
          {busy === "logo" && <p className="text-[14px] text-subtle">{L("جاري الرفع…")}</p>}
        </Card>

        <Card title={L("تعديلات سريعة")} icon="✏️">
          <Sub>{L("الألوان")}</Sub>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(Object.keys(COLOR_LABELS) as (keyof Colors)[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                {COLOR_LABELS[k]}
                <input type="color" value={spec.colors[k]} onChange={(e) => setColor(k, e.target.value)} aria-label={COLOR_LABELS[k]} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
              </label>
            ))}
          </div>

          <Sub>{L("النصوص")}</Sub>
          <div className="flex flex-col gap-2.5">
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="text-[12px] text-subtle">{f.label}</span>
                <input value={f.value} onChange={(e) => setSpec(setText(spec, f.key, e.target.value))} className="field" />
              </label>
            ))}
          </div>

          <Sub>{L("الخط")}</Sub>
          <div className="flex flex-wrap gap-2">
            {FONTS.map((f) => (
              <button key={f.id} type="button" aria-pressed={spec.font === f.id} onClick={() => setSpec({ ...spec, font: f.id })} style={{ fontFamily: f.id }}
                className={`rounded-xl border px-4 py-2 text-[16px] ${spec.font === f.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}>{f.label}</button>
            ))}
          </div>
        </Card>

        <section className="card p-5">
          <button type="button" aria-expanded={advOpen} onClick={() => setAdvOpen(!advOpen)} className="flex w-full items-center justify-between text-[16px] font-bold text-navy-900">
            <span>{L("✨ تعديل متقدّم (بالوصف)")}</span><span aria-hidden className={advOpen ? "rotate-180" : ""}>⌄</span>
          </button>
          {advOpen && (
            <div className="mt-4 flex flex-col gap-3">
              <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} className="field" placeholder={L("مثال: خلّ الألوان أهدى، وزيد مشهد عن السكر قبل الأخير")} />
              <button type="button" disabled={!instruction.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
                onClick={async () => { const d = await call<{ spec: MotionSpec }>("revise", { spec, instruction }, "revise"); if (d) { setSpec(d.spec); setInstruction(""); } }}>
                {busy === "revise" ? L("جاري التعديل…") : LT(`طبّق التعديل (${editCost} ريشة)`, `Apply edit (${editCost} credits)`)}
              </button>
            </div>
          )}
        </section>

        <Card title={L("موسيقى خلفية")} icon="🎵">
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("lib")} className={`rounded-xl px-4 py-2 text-[14px] font-semibold ${tab === "lib" ? "bg-navy-800 text-white" : "text-muted"}`}>{L("المكتبة")}</button>
            <button type="button" onClick={() => setTab("ai")} className={`rounded-xl px-4 py-2 text-[14px] font-semibold ${tab === "ai" ? "bg-navy-800 text-white" : "text-muted"}`}>{L("✨ إنشاء بالذكاء")}</button>
          </div>
          {tab === "lib" ? (
            tracks.length ? (
              <ul className="flex flex-col gap-2">
                {tracks.map((t) => {
                  const chosen = spec.music?.url === t.url;
                  return (
                    <li key={t.url} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${chosen ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
                      <button type="button" onClick={() => togglePreview(t.url)} aria-label={LT(`استماع ${t.name}`, `Listen to ${L(t.name)}`)} className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-navy-800">{playing === t.url ? "❚❚" : "▶"}</button>
                      <span className="flex flex-1 flex-col"><span className="font-semibold">{t.name}</span>{t.mood && <span className="text-[12px] text-subtle" dir="ltr">{t.mood}</span>}</span>
                      <button type="button" onClick={() => setSpec({ ...spec, music: chosen ? null : { url: t.url, name: t.name } })} className={`rounded-lg px-3.5 py-1.5 text-[14px] font-semibold ${chosen ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-white"}`}>{chosen ? L("مختارة ✓") : L("اختر")}</button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-[14px] text-subtle">{L("المكتبة فاضية حالياً. جرّب «إنشاء بالذكاء».")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              <input value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} className="field" placeholder={L("مثال: موسيقى هادئة ملهمة بدون غناء")} />
              <button type="button" disabled={!musicPrompt.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
                onClick={async () => { const d = await call<{ url: string }>("music", { prompt: musicPrompt, seconds: spec.seconds }, "music"); if (d) setSpec({ ...spec, music: { url: d.url, name: musicPrompt } }); }}>
                {busy === "music" ? L("جاري التأليف…") : LT(`ألّف المقطوعة (${editCost} ريشة)`, `Compose the track (${editCost} credits)`)}
              </button>
            </div>
          )}
          {spec.music && <p className="text-[13px] text-subtle">{L("الموسيقى الحالية:")} {spec.music.name} · <button type="button" className="text-red-700 underline" onClick={() => setSpec({ ...spec, music: null })}>{L("إزالة")}</button></p>}
        </Card>

        <Card title={L("تعليق صوتي")} icon="🎙️">
          <label className="flex flex-col gap-1"><span className="text-[12px] text-subtle">{L("نص التعليق")}</span>
            <textarea value={voiceText} onChange={(e) => setVoiceText(e.target.value)} rows={4} className="field" /></label>
          {voices.length > 0 && (
            <label className="flex flex-col gap-1"><span className="text-[12px] text-subtle">{L("الصوت")}</span>
              <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="field">{voices.map((v) => <option key={v.id} value={v.id}>{v.name}{v.note ? ` · ${v.note}` : ""}</option>)}</select></label>
          )}
          <button type="button" disabled={!voiceText.trim() || !!busy} className="btn btn-primary px-5 py-3"
            onClick={async () => { const d = await call<{ url: string }>("voice", { text: voiceText, voice: voiceId }, "voice"); if (d) setSpec({ ...spec, voice: { url: d.url, text: voiceText } }); }}>
            {busy === "voice" ? L("جاري التسجيل…") : spec.voice ? L("🎙️ أعد تسجيل التعليق") : LT(`🎙️ إضافة تعليق صوتي (${editCost} ريشة)`, `🎙️ Add voiceover (${editCost} credits)`)}
          </button>
          {spec.voice && <p className="text-[13px] text-subtle">{L("✓ التعليق مضاف للفيديو ·")} <button type="button" className="text-red-700 underline" onClick={() => setSpec({ ...spec, voice: null })}>{L("إزالة")}</button></p>}
        </Card>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}

        <button type="button" disabled={!!busy} className="btn btn-gold w-full py-4 text-[17px]"
          onClick={async () => { const d = await call<{ ok: true }>("export", { spec }, "export"); if (d) { try { localStorage.removeItem(key); } catch {} setSent(true); } }}>
          {busy === "export" ? L("جاري الإرسال…") : L("⬇️ تصدير الفيديو (MP4)")}
        </button>
      </div>
    </div>
    </>
  );
}
