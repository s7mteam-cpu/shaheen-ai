"use client";
/* eslint-disable @next/next/no-img-element */
import { L, LT } from "@/lib/i18n/ui";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/app/Collapse";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize, type LogoBox } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { uploadImage } from "@/components/app/DesignStart";
import { applyEdits, applyFont, applyLogo, currentFont, extractColors, extractTexts } from "@/lib/htmlKit";
import { ERR_SNIPPET } from "@/lib/freeErrSnippet";

export type GemData = { status: "gemini"; title: string; aspect: string; videoUrl: string; downloadUrl: string; htmlUrl: string; hasVoice: boolean; musicOff: boolean; editCost: number; logo: { path: string; url: string; box: LogoBox } | null };
const FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;

/** لوحة تعديل الفيديو الجاهز (محرك جيميناي): نفس شكل لوحة الموشن جرافيك. النصوص والألوان والخط والشعار تتغيّر بالمعاينة فورًا، وزر الحفظ يرسم فيديو جديد بنفس الصوت والموسيقى. */
export function GemStudio({ jobId, data, balance, onSent }: { jobId: string; data: GemData; balance: number; onSent: (newJob: string) => void }) {
  const [raw, setRaw] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [hex, setHex] = useState<Record<string, string>>({});
  const [font, setFont] = useState("Cairo");
  const [logo, setLogo] = useState<{ path: string; url: string; box: LogoBox } | null>(data.logo);
  const [musicOff, setMusicOff] = useState(data.musicOff);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [view, setView] = useState<"video" | "edit">("video");
  const urlRef = useRef(data.htmlUrl);
  const [w, h] = useMemo(() => (data.aspect || "9:16").split(":").map((x) => Number(x) || 1), [data.aspect]);

  // the saved page without any logo on it (the logo is drawn from the logo card, so it can be moved or removed)
  useEffect(() => {
    let dead = false;
    fetch(urlRef.current).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => { if (!dead) setRaw(applyLogo(t, null)); }).catch(() => { if (!dead) setLoadErr(true); });
    return () => { dead = true; };
  }, []);
  const fields = useMemo(() => (raw ? extractTexts(raw) : []), [raw]);
  const colors = useMemo(() => (raw ? extractColors(raw) : []), [raw]);
  const baseFont = useMemo(() => (raw ? currentFont(raw) : "Cairo"), [raw]);
  useEffect(() => { if (raw) { setVals(Object.fromEntries(fields.map((f) => [f.key, f.value]))); setHex(Object.fromEntries(colors.map((c) => [c, c]))); setFont(baseFont); } }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps

  // live preview: the page itself plays; edits rebuild it after a short pause
  useEffect(() => {
    if (raw === null || view !== "edit") return;
    const t = setTimeout(() => {
      try {
        let p = applyEdits(raw, { texts: vals, hex });
        p = applyFont(p, font);
        p = applyLogo(p, logo ? { src: logo.url, ...logo.box } : null);
        setDoc(p.replace(/<head[^>]*>/i, (m) => m + ERR_SNIPPET)); setRev((x) => x + 1);
      } catch { setError(L("تعذّر تطبيق التعديل")); }
    }, 450);
    return () => clearTimeout(t);
  }, [raw, vals, hex, font, logo, view]);

  const changed = useMemo(() => fields.some((f) => (vals[f.key] ?? f.value) !== f.value) || colors.some((c) => (hex[c] ?? c) !== c) || font !== baseFont || (logo?.path ?? "") !== (data.logo?.path ?? "") || JSON.stringify(logo?.box ?? null) !== JSON.stringify(data.logo?.box ?? null) || musicOff !== data.musicOff, [fields, colors, vals, hex, font, baseFont, logo, data.logo, musicOff, data.musicOff]);
  const textsChanged = fields.some((f) => (vals[f.key] ?? f.value) !== f.value);

  async function uploadLogo(f: File) {
    setBusy(true); setError("");
    try { const u = await uploadImage(f); setLogo({ path: u.path, url: u.preview, box: logo?.box ?? DEFAULT_LOGO_BOX }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const texts = Object.fromEntries(fields.filter((f) => (vals[f.key] ?? f.value) !== f.value).map((f) => [f.key, vals[f.key]]));
      const hx = Object.fromEntries(colors.filter((c) => (hex[c] ?? c) !== c).map((c) => [c, hex[c]]));
      const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "gemedit", fromJob: jobId, texts, hex: hx, font, logo: logo ? { path: logo.path, box: logo.box } : null, musicOff }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? L("صار خطأ، حاول مرة ثانية."));
      onSent(d.jobId);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <>
      {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadLogo(f); }} />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-navy-900">{view === "video" ? data.title : L("معاينة مباشرة")}</h2>
            <div className="flex gap-1 rounded-full bg-tint p-1 text-[13px]">
              <button type="button" onClick={() => setView("video")} className={`rounded-full px-3 py-1 ${view === "video" ? "bg-navy-800 text-white" : "text-muted"}`}>{L("الفيديو")}</button>
              <button type="button" onClick={() => setView("edit")} className={`rounded-full px-3 py-1 ${view === "edit" ? "bg-navy-800 text-white" : "text-muted"}`}>{L("معاينة التعديل")}</button>
            </div>
          </div>
          <div dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg" style={{ aspectRatio: `${w} / ${h}`, maxWidth: data.aspect === "9:16" ? "min(100%, calc((100vh - 11rem) * 0.5625))" : "100%" }}>
            {view === "video" ? <video src={data.videoUrl} controls playsInline className="absolute inset-0 h-full w-full" />
              : doc && !loadErr ? <><iframe key={`r${rev}`} allow="autoplay" title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={doc} className="absolute inset-0 h-full w-full border-0" />
                {logo && <div className="absolute inset-0"><LogoDrag box={logo.box} onChange={(b) => setLogo((p) => (p ? { ...p, box: b } : p))} /></div>}</>
              : <div className="grid h-full place-items-center p-6 text-center text-[14px] text-white/80">{loadErr ? L("تعذّر تحميل المعاينة. حدّث الصفحة.") : L("جاري تجهيز المعاينة…")}</div>}
          </div>
          {view === "edit" && <button type="button" className="btn btn-outline px-4 py-2 text-sm" onClick={() => setRev((x) => x + 1)}>↻ {L("أعد التشغيل من البداية")}</button>}
          <div className="flex flex-wrap gap-2">
            <a href={data.downloadUrl} download className="btn btn-gold px-5 py-2.5">⬇ {L("نزّل الفيديو")}</a>
            <Link href="/app/tools/free-motion" className="btn btn-outline px-5 py-2.5">{L("تصميم جديد")}</Link>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title={L("الشعار")} icon="🏷️">
            <div className="flex flex-wrap items-center gap-3">
              {logo && <img src={logo.url} alt={L("الشعار")} className="h-12 max-w-[120px] rounded-lg bg-tint object-contain p-1" />}
              <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{logo ? L("تغيير الشعار") : L("⬆️ ارفع شعارك")}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCropFile(f); setView("edit"); } e.target.value = ""; }} /></label>
              {logo && <button type="button" className="text-[14px] text-red-700 underline" onClick={() => setLogo(null)}>{L("إزالة الشعار")}</button>}
            </div>
            {logo && <LogoSize box={logo.box} onChange={(b) => setLogo({ ...logo, box: b })} />}
          </Card>

          <Card title={L("تعديلات سريعة")} icon="✏️">
            <Sub>{L("الألوان")}</Sub>
            {colors.length === 0 ? <p className="text-[13px] text-subtle">{L("ما لقينا ألوان قابلة للتعديل بهذا التصميم.")}</p> : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {colors.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                    <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 rounded border" style={{ background: c }} />→</span>
                    <input type="color" value={hex[c] ?? c} onChange={(e) => { setHex({ ...hex, [c]: e.target.value }); setView("edit"); }} aria-label={c} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                  </label>
                ))}
              </div>
            )}
            <Sub>{L("النصوص")}</Sub>
            <div className="flex flex-col gap-2.5">
              {fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[12px] text-subtle">{f.label}</span>
                  <input dir="auto" value={vals[f.key] ?? f.value} maxLength={300} onChange={(e) => { setVals({ ...vals, [f.key]: e.target.value }); setView("edit"); }} className="field" />
                </label>
              ))}
              {raw && fields.length === 0 && <p className="text-[13px] text-subtle">{L("ما لقينا نصوص قابلة للتعديل.")}</p>}
            </div>
            {textsChanged && data.hasVoice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{L("تنبيه: التعليق الصوتي يبقى كما هو. تغيير النص يغيّر المكتوب على الشاشة فقط. لتغيير الكلام المنطوق، صمّم فيديو جديد بالنص الجديد.")}</p>}
            <Sub>{L("الخط")}</Sub>
            <div className="flex flex-wrap gap-2">
              {FONTS.map((f) => (
                <button key={f} type="button" aria-pressed={font === f} onClick={() => { setFont(f); setView("edit"); }} style={{ fontFamily: f }} className={`rounded-xl border px-4 py-2 text-[16px] ${font === f ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}>{f}</button>
              ))}
            </div>
          </Card>

          {data.hasVoice && (
            <Card more title={L("الصوت والموسيقى")} icon="🎵">
              <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!musicOff} onChange={(e) => setMusicOff(!e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("موسيقى خلفية")}</label>
              <p className="text-[13px] text-subtle">{L("التعليق الصوتي ثابت بهالنسخة. تغيير الصوت أو رفع صوتك من جهازك بيجي بتحديث لاحق.")}</p>
            </Card>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
          <button type="button" disabled={busy || !changed || balance < data.editCost} onClick={save} className="btn btn-gold sticky bottom-3 z-30 w-full py-4 text-[17px] shadow-lg disabled:opacity-60">
            {busy ? L("جاري الإرسال…") : LT(`🎞 احفظ التعديل كفيديو جديد (${data.editCost} ريشة)`, `🎞 Save as a new video (${data.editCost} credits)`)}
          </button>
          <p className="text-center text-[12px] text-subtle">{balance < data.editCost ? L("رصيدك ما يكفي للتعديل.") : L("الفيديو المعدّل يستغرق من 7 إلى 10 دقائق، ويضاف لأعمالك والأصلي يبقى.")}</p>
        </div>
      </div>
    </>
  );
}
