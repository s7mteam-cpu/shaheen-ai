"use client";
/* eslint-disable @next/next/no-img-element */
import { L, LT } from "@/lib/i18n/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/app/Collapse";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize, type LogoBox } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { FreeTimeline, type Trim } from "@/components/app/FreeTimeline";
import { MusicEditor } from "@/components/app/MusicEditor";
import { uploadImage } from "@/components/app/DesignStart";
import { applyEdits, applyFont, applyLogo, currentFont, extractColors, extractTexts } from "@/lib/htmlKit";
import { withClock } from "@/lib/gemClock";
import { ERR_SNIPPET } from "@/lib/freeErrSnippet";
import { ARAB_DIALECTS } from "@/lib/countries";
import { VOICE_TYPES } from "@/lib/voiceMatch";
import type { Music } from "@/remotion/montage";

type SavedMix = { voiceVol?: number; musicVol?: number; trim?: Trim; own?: (Music & { url: string }) | null };
export type GemData = {
  status: "gemini"; title: string; aspect: string; seconds: number; videoUrl: string; downloadUrl: string; htmlUrl: string; voiceUrl: string; musicUrl: string;
  hasVoice: boolean; scenes: string[] | null; dialect: string; musicOff: boolean; editCost: number; mix: SavedMix | null; logo: { path: string; url: string; box: LogoBox } | null;
};
const SIZES: Record<string, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** لوحة استوديو الفيديو الجاهز (محرك جيميناي): مشغّل واحد بإيقاف وتشغيل وشريط وقت، تعديل النصوص والألوان والخط والشعار فوريًا، مازج صوت (التعليق والموسيقى وصوتك)، وقص الفيديو. زر الحفظ يرسم فيديو جديد. */
export function GemStudio({ jobId, data, balance, onSent }: { jobId: string; data: GemData; balance: number; onSent: (newJob: string) => void }) {
  const seconds = Math.max(5, Math.round(data.seconds || 30));
  const saved = data.mix ?? {};
  const [raw, setRaw] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [hex, setHex] = useState<Record<string, string>>({});
  const [font, setFont] = useState("Cairo");
  const [logo, setLogo] = useState<{ path: string; url: string; box: LogoBox } | null>(data.logo);
  const [musicOff, setMusicOff] = useState(data.musicOff);
  const [voiceVol, setVoiceVol] = useState(saved.voiceVol ?? 1);
  const [musicVol, setMusicVol] = useState(saved.musicVol ?? 0.14);
  const [own, setOwn] = useState<Music | null>(saved.own ?? null);
  const [trim, setTrim] = useState<Trim>(saved.trim ?? { start: 0, end: seconds });
  const [instruction, setInstruction] = useState("");
  const [vOpen, setVOpen] = useState(false);
  const [lines, setLines] = useState<string[]>(data.scenes ?? []);
  const [dialect, setDialect] = useState("");
  const [vtype, setVtype] = useState("keep");
  const [rewrite, setRewrite] = useState(false);
  const [lang, setLang] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [startAt, setStartAt] = useState(Math.min(2, seconds));
  const [auto, setAuto] = useState(false);
  const [t, setT] = useState(Math.min(2, seconds));
  const [playing, setPlaying] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [PW, PH] = SIZES[data.aspect] ?? SIZES["9:16"];
  const tRef = useRef(t); tRef.current = t;
  const playingRef = useRef(playing); playingRef.current = playing;
  const urlRef = useRef(data.htmlUrl);
  const aV = useRef<HTMLAudioElement | null>(null), aM = useRef<HTMLAudioElement | null>(null), aO = useRef<HTMLAudioElement | null>(null);
  const [w, h] = useMemo(() => (data.aspect || "9:16").split(":").map((x) => Number(x) || 1), [data.aspect]);

  // the page is laid out at the real video size (exactly like the recorder) and only SHOWN smaller
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  // the saved page without any logo on it (the logo is drawn from the logo card, so it can be moved or removed)
  useEffect(() => {
    let dead = false;
    fetch(urlRef.current).then((r) => (r.ok ? r.text() : Promise.reject())).then((x) => { if (!dead) setRaw(applyLogo(x, null)); }).catch(() => { if (!dead) setLoadErr(true); });
    return () => { dead = true; };
  }, []);
  const fields = useMemo(() => (raw ? extractTexts(raw) : []), [raw]);
  const colors = useMemo(() => (raw ? extractColors(raw) : []), [raw]);
  const baseFont = useMemo(() => (raw ? currentFont(raw) : "Cairo"), [raw]);
  useEffect(() => { if (raw) { setVals(Object.fromEntries(fields.map((f) => [f.key, f.value]))); setHex(Object.fromEntries(colors.map((c) => [c, c]))); setFont(baseFont); } }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps

  // live page: edits rebuild it after a short pause and reopen it at the same second, in the same play / pause state
  useEffect(() => {
    if (raw === null) return;
    const id = setTimeout(() => {
      try {
        let p = applyEdits(raw, { texts: vals, hex });
        p = applyFont(p, font);
        p = applyLogo(p, logo ? { src: logo.url, ...logo.box } : null);
        setStartAt(tRef.current); setAuto(playingRef.current);
        setDoc(p.replace(/<head[^>]*>/i, (m) => m + ERR_SNIPPET)); setRev((x) => x + 1);
      } catch { setError(L("تعذّر تطبيق التعديل")); }
    }, 450);
    return () => clearTimeout(id);
  }, [raw, vals, hex, font, logo]);
  const srcDoc = useMemo(() => (doc ? withClock(doc, startAt, auto, seconds) : null), [doc, startAt, auto, seconds]);

  // preview sound: voice + music + the customer's own sound follow the page clock
  useEffect(() => {
    const mk = (u: string) => { if (!u) return null; const a = new Audio(u); a.preload = "auto"; return a; };
    aV.current = mk(data.voiceUrl); aM.current = mk(data.musicUrl);
    return () => { for (const a of [aV.current, aM.current]) a?.pause(); };
  }, [data.voiceUrl, data.musicUrl]);
  useEffect(() => { aO.current?.pause(); aO.current = own?.url ? new Audio(own.url) : null; return () => aO.current?.pause(); }, [own?.url]);
  useEffect(() => { if (aV.current) aV.current.volume = Math.min(1, voiceVol); }, [voiceVol, data.voiceUrl]);
  useEffect(() => { if (aM.current) { aM.current.volume = Math.min(1, musicVol); aM.current.muted = musicOff; } }, [musicVol, musicOff, data.musicUrl]);
  useEffect(() => { if (aO.current) aO.current.volume = own?.volume == null ? 0.6 : Math.min(1, own.volume); }, [own?.volume, own?.url]);
  const ownRef = useRef(own); ownRef.current = own;
  const sync = useCallback((time: number, play: boolean) => {
    const fit = (a: HTMLAudioElement | null, at: number) => { if (a && Math.abs(a.currentTime - at) > 0.35) a.currentTime = Math.max(0, at); };
    for (const a of [aV.current, aM.current]) { if (!a) continue; if (play && time < seconds) { fit(a, time); if (a.paused) a.play().catch(() => {}); } else a.pause(); }
    const o = ownRef.current, ao = aO.current;
    if (ao && o) {
      const rel = time - (o.at ?? 0), st = o.start ?? 0, clip = (o.end ?? o.dur ?? 9999) - st;
      if (play && rel >= 0 && rel < clip) { fit(ao, st + rel); if (ao.paused) ao.play().catch(() => {}); } else ao.pause();
    }
  }, [seconds]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      const m = (e.data ?? {}) as { type?: string; t?: number; playing?: boolean };
      if (typeof m.t === "number") setT(m.t);
      if (m.type === "state") { setPlaying(!!m.playing); sync(m.t ?? 0, !!m.playing); }
      else if (m.type === "gt" && playingRef.current) sync(m.t ?? 0, true);
      else if (m.type === "end") { setPlaying(false); sync(m.t ?? 0, false); }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [sync]);
  const post = (type: "play" | "pause") => iframe.current?.contentWindow?.postMessage({ type }, "*");
  const seek = (sec: number) => { const v = Math.max(0, Math.min(seconds - 0.1, sec)); setT(v); setStartAt(v); setAuto(playingRef.current); setRev((x) => x + 1); };
  const toggle = () => { if (playing) post("pause"); else if (t >= seconds - 0.2) seek(0); else post("play"); };
  useEffect(() => () => { for (const a of [aV.current, aM.current, aO.current]) a?.pause(); }, []);

  const ownPlain = (o: Music | null | undefined) => (o ? { path: o.path, name: o.name, dur: o.dur ?? null, start: o.start ?? 0, end: o.end ?? null, at: o.at ?? 0, volume: o.volume ?? null, fadeIn: o.fadeIn ?? 0, fadeOut: o.fadeOut ?? 0 } : null);
  const curMix = { voiceVol, musicVol, trim, own: ownPlain(own) };
  const savedKey = JSON.stringify({ voiceVol: saved.voiceVol ?? 1, musicVol: saved.musicVol ?? 0.14, trim: saved.trim ?? { start: 0, end: seconds }, own: ownPlain(saved.own) });
  const mixChanged = JSON.stringify(curMix) !== savedKey;
  const textsChanged = fields.some((f) => (vals[f.key] ?? f.value) !== f.value);
  const regen = vOpen && !!data.scenes;
  const changed = textsChanged || colors.some((c) => (hex[c] ?? c) !== c) || font !== baseFont || (logo?.path ?? "") !== (data.logo?.path ?? "") || JSON.stringify(logo?.box ?? null) !== JSON.stringify(data.logo?.box ?? null) || musicOff !== data.musicOff || instruction.trim().length > 2 || regen || mixChanged;
  const cost = data.editCost * (1 + (instruction.trim().length > 2 ? 1 : 0) + (regen ? 1 : 0));

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
      const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "gemedit", fromJob: jobId, texts, hex: hx, font, logo: logo ? { path: logo.path, box: logo.box } : null, musicOff, mix: curMix, instruction: instruction.trim(), ...(regen ? { voiceEdit: { mode: "regen", sentences: lines, dialect: dialect || undefined, vtype, rewrite, translateTo: lang || undefined } } : {}) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? L("صار خطأ، حاول مرة ثانية."));
      onSent(d.jobId);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  const capW = data.aspect === "9:16" ? "lg:max-w-[max(220px,calc((100vh-29rem)*0.5625))]" : "";
  return (
    <>
      {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadLogo(f); }} />}
      <div className={`grid grid-cols-1 gap-6 lg:items-start ${data.aspect === "9:16" ? "lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]"}`}>
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-navy-900">{L("معاينة مباشرة")}</h2>
            <span className="rounded-full bg-tint px-3 py-1 text-[13px] text-subtle">{seconds} {L("ثانية")}</span>
          </div>
          <div ref={box} dir="ltr" className={`relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg ${capW}`} style={{ aspectRatio: `${w} / ${h}` }}>
            {srcDoc && !loadErr ? <>
              <iframe key={`r${rev}`} ref={iframe} title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={srcDoc} className="absolute left-0 top-0 border-0" style={{ width: PW, height: PH, transform: `scale(${cw ? cw / PW : 0.3})`, transformOrigin: "0 0" }} />
              {logo && <div className="absolute inset-0"><LogoDrag box={logo.box} onChange={(b) => setLogo((p) => (p ? { ...p, box: b } : p))} /></div>}
            </> : <div className="grid h-full place-items-center p-6 text-center text-[14px] text-white/80">{loadErr ? L("تعذّر تحميل المعاينة. حدّث الصفحة.") : L("جاري تجهيز المعاينة…")}</div>}
          </div>
          <div dir="ltr" className="flex w-full items-center gap-3">
            <button type="button" onClick={toggle} className="btn btn-gold px-4 py-2 text-sm" aria-label={playing ? L("إيقاف") : L("تشغيل")}>{playing ? "⏸" : "▶"}</button>
            <input type="range" min={0} max={seconds} step={0.1} value={Math.min(t, seconds)} onChange={(e) => setT(Number(e.target.value))} onPointerUp={(e) => seek(Number((e.target as HTMLInputElement).value))} onKeyUp={(e) => seek(Number((e.target as HTMLInputElement).value))} className="flex-1" aria-label={L("الوقت")} />
            <span className="whitespace-nowrap text-end text-[13px] tabular-nums text-subtle">{fmt(t)} / {fmt(seconds)}</span>
          </div>
          <FreeTimeline total={seconds} playhead={t} trim={trim} onTrim={setTrim} disabled={busy}
            voice={data.hasVoice ? { at: 0, dur: seconds } : null} music={!musicOff && !!data.musicUrl}
            own={own ? { at: own.at ?? 0, len: Math.max(0.5, Math.min((own.end ?? own.dur ?? seconds) - (own.start ?? 0), seconds - (own.at ?? 0))), name: own.name } : null}
            onOwnMove={(at) => own && setOwn({ ...own, at: +at.toFixed(1) })} onSeek={seek} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title={L("الشعار")} icon="🏷️">
            <div className="flex flex-wrap items-center gap-3">
              {logo && <img src={logo.url} alt={L("الشعار")} className="h-12 max-w-[120px] rounded-lg bg-tint object-contain p-1" />}
              <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{logo ? L("تغيير الشعار") : L("⬆️ ارفع شعارك")}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} /></label>
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
                    <input type="color" value={hex[c] ?? c} onChange={(e) => setHex({ ...hex, [c]: e.target.value })} aria-label={c} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
                  </label>
                ))}
              </div>
            )}
            <Sub>{L("النصوص")}</Sub>
            <div className="flex flex-col gap-2.5">
              {fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-[12px] text-subtle">{f.label}</span>
                  <input dir="auto" value={vals[f.key] ?? f.value} maxLength={300} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="field" />
                </label>
              ))}
              {raw && fields.length === 0 && <p className="text-[13px] text-subtle">{L("ما لقينا نصوص قابلة للتعديل.")}</p>}
            </div>
            {textsChanged && data.hasVoice && !regen && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{L("تنبيه: التعليق الصوتي يبقى كما هو، وتغيير النص يغيّر المكتوب على الشاشة فقط. لتغيير الكلام المنطوق فعّل «تغيير الكلام» من بطاقة الصوت.")}</p>}
            <Sub>{L("الخط")}</Sub>
            <div className="flex flex-wrap gap-2">
              {FONTS.map((f) => (
                <button key={f} type="button" aria-pressed={font === f} onClick={() => setFont(f)} style={{ fontFamily: f }} className={`rounded-xl border px-4 py-2 text-[16px] ${font === f ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}>{f}</button>
              ))}
            </div>
          </Card>

          <Card title={L("الصوت")} icon="🎚️">
            {data.hasVoice && (
              <label className="flex flex-col gap-1 text-[13px]"><span className="flex justify-between font-semibold text-subtle"><span>{L("🎙️ علو التعليق الصوتي")}</span><span dir="ltr">{Math.round(voiceVol * 100)}%</span></span>
                <input type="range" dir="ltr" min={0} max={1.5} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} aria-label={L("علو التعليق")} /></label>
            )}
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!musicOff} onChange={(e) => setMusicOff(!e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("🎵 موسيقى خلفية")}</label>
            {!musicOff && (
              <label className="flex flex-col gap-1 text-[13px]"><span className="flex justify-between font-semibold text-subtle"><span>{L("علو الموسيقى")}</span><span dir="ltr">{Math.round(musicVol * 100)}%</span></span>
                <input type="range" dir="ltr" min={0} max={1} step={0.02} value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} aria-label={L("علو الموسيقى")} /></label>
            )}
            <p className="text-[12px] text-subtle">{L("المعاينة تشغّل الصوت حتى 100%، والرفع فوقه (حتى 150%) يظهر في الفيديو النهائي.")}</p>
            <Sub>{L("صوتك الخاص (يضاف فوق التعليق والموسيقى)")}</Sub>
            <MusicEditor music={own} onChange={setOwn} total={seconds} playhead={() => tRef.current} disabled={busy} />
          </Card>
          {data.hasVoice && (
            <Card more title={L("تغيير الكلام المنطوق")} icon="🎙️">
              {!data.scenes ? <p className="text-[13px] text-subtle">{L("هذا الفيديو صُمّم قبل تفعيل هذي الميزة. صمّم فيديو جديد وبيفعّل لك تعديل الكلام واللهجة والترجمة.")}</p> : (
                <>
                  <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={vOpen} onChange={(e) => setVOpen(e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("أبغى أغيّر الكلام أو اللهجة أو الصوت أو أترجم")}</label>
                  {vOpen && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[13px] text-subtle">{L("اكتب الجملة المنطوقة لكل مشهد. الجملة الأطول من وقت مشهدها تتسارع شوي، فاختصرها إذا طالت.")}</p>
                      {lines.map((x, i) => (
                        <label key={i} className="flex flex-col gap-1"><span className="text-[12px] text-subtle">{L("مشهد")} {i + 1}</span>
                          <textarea dir="auto" rows={2} maxLength={300} value={x} onChange={(e) => setLines(lines.map((y, k) => (k === i ? e.target.value : y)))} className="field" /></label>
                      ))}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-[13px]">{L("اللهجة")}
                          <select value={dialect} onChange={(e) => setDialect(e.target.value)} className="field"><option value="">{L("كما هي")}</option>{ARAB_DIALECTS.map(([v, ar]) => <option key={v} value={v}>{ar}</option>)}</select></label>
                        <label className="flex flex-col gap-1 text-[13px]">{L("نوع الصوت")}
                          <select value={vtype} onChange={(e) => setVtype(e.target.value)} className="field"><option value="keep">{L("كما هو")}</option>{VOICE_TYPES.map(([v, ar]) => <option key={v} value={v}>{ar}</option>)}</select></label>
                      </div>
                      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={rewrite} disabled={!!lang} onChange={(e) => setRewrite(e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("أعد صياغة الجمل باللهجة المختارة (بالذكاء)")}</label>
                      <label className="flex flex-col gap-1 text-[13px]">{L("ترجمة إلى لغة ثانية (الصوت والنصوص)")}
                        <select value={lang} onChange={(e) => setLang(e.target.value)} className="field"><option value="">{L("بدون ترجمة")}</option>{([["en", "English"], ["fr", "Français"], ["es", "Español"], ["tr", "Türkçe"], ["de", "Deutsch"], ["it", "Italiano"]] as const).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>
                      {lang && <p className="text-[12px] text-subtle">{L("بالترجمة تنقلب الشاشة لاتجاه اليسار، وممكن بعض العناصر تحتاج تعديل بالوصف.")}</p>}
                      <p className="text-[12px] text-subtle">{LT(`تغيير الكلام يكلّف ${data.editCost} ريشة إضافية.`, `A voice change costs ${data.editCost} extra credits.`)}</p>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          <Card more title={L("تعديل بالوصف (بالذكاء)")} icon="✨">
            <p className="text-[13px] text-subtle">{L("اوصف اللي تبغاه بكلامك: الخلفية، مكان النص وحركته، إضافة أيقونة، تأثير... والذكاء يعدّل التصميم. توقيت المشاهد والصوت يبقون كما هم.")}</p>
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} maxLength={500} className="field" placeholder={L("مثال: خلّ الخلفية فاتحة، وحرّك العنوان من فوق، وزيد أيقونة واتساب بجنب الرقم")} />
            {instruction.trim().length > 2 && <p className="text-[12px] text-subtle">{LT(`التعديل بالوصف يكلّف ${data.editCost} ريشة إضافية، وممكن ما ينفّذ كل شي بالضبط.`, `AI edit costs ${data.editCost} extra credits and may not match exactly.`)}</p>}
          </Card>


        <div className="flex flex-col gap-3">
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
          <button type="button" disabled={busy || !changed || balance < cost} onClick={save} className="btn btn-gold sticky bottom-3 z-30 w-full py-4 text-[17px] shadow-lg disabled:opacity-60">
            {busy ? L("جاري الإرسال…") : LT(`🎞 احفظ التعديل كفيديو جديد (${cost} ريشة)`, `🎞 Save as a new video (${cost} credits)`)}
          </button>
          <p className="text-center text-[12px] text-subtle">{balance < cost ? L("رصيدك ما يكفي للتعديل.") : L("الفيديو المعدّل يستغرق من 7 إلى 10 دقائق، ويضاف لأعمالك والأصلي يبقى.")}</p>
          <div className="flex flex-wrap gap-2">
            <a href={data.downloadUrl} download className="btn btn-gold px-5 py-2.5">⬇ {L("نزّل الفيديو الجاهز")}</a>
            <Link href="/app/tools/free-motion" className="btn btn-outline px-5 py-2.5">{L("تصميم جديد")}</Link>
          </div>
          <details className="rounded-xl border border-line p-3 text-[13px]"><summary className="cursor-pointer font-semibold text-subtle">{L("الفيديو المرسوم (آخر نسخة محفوظة)")}</summary><video src={data.videoUrl} controls playsInline className="mx-auto mt-3 max-h-[60vh] w-full max-w-sm rounded-xl bg-black" /></details>
        </div>
        </div>
      </div>
    </>
  );
}
