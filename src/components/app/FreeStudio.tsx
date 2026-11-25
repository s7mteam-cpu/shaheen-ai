"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { BRANDS, type BrandId } from "@/remotion/brandIcons";
import { GULF_DIALECTS } from "@/lib/countries";
import type { VoiceItem } from "@/lib/voiceMatch";
import { VoicePick } from "@/components/app/VoicePick";
import { Card } from "@/components/app/Collapse";
import { FreeTimeline, type Trim } from "@/components/app/FreeTimeline";
import { MusicEditor } from "@/components/app/MusicEditor";
import type { Music } from "@/remotion/montage";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize, type LogoBox } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { uploadImage } from "@/components/app/DesignStart";
import { ERR_SNIPPET } from "@/lib/freeErrSnippet";
import { FONT_LIBRARY } from "@/lib/fonts";

export type Field = { key: string; label: string; value: string };
export type Contact = { icon: BrandId; handle: string };
export type Colors = { bg: string; accent: string; text: string };
export type StudioData = {
  status: "studio"; busy: { kind: "export" | "revoice"; progress: number } | null; title: string; aspect: string; cseconds: number; idea: string; brand: string;
  voiceover: boolean; narration: string[]; beats: { text: string; start: number; end: number }[]; dialect: string;
  fields: Field[]; colors: Colors; font: string; contact: Contact[]; musicOn: boolean; musicVol: number;
  logoOn: boolean; logoBox: LogoBox; logoPath: string; logo: string; trim?: Trim | null; ownAudio?: Music | null; assets?: Record<string, unknown>;
  previewUrl: string; voiceUrl: string; musicUrl: string; exportUrl: string; editError: string; locked?: boolean;
};
const OFFSET = 0.4;
const social = Object.keys(BRANDS) as BrandId[];
const card = "card flex flex-col gap-3 p-4";

/** «تصميم مبتكر»: the finished design plays LIVE inside a sandboxed frame; every edit shows at once. The mp4 is drawn only on export. */
/** Put in front of the sandboxed page: tells this page the first error that happens inside it (so a blank picture shows its cause). */
export function FreeStudio({ jobId, data, busy, kitLogo, editCost, balance, onRefresh, onSimilar, voices = [] }: {
  voices?: VoiceItem[]; jobId: string; data: StudioData; busy: StudioData["busy"]; kitLogo?: { path: string; url: string } | null; editCost: number; balance: number;
  onRefresh: (kind: "export" | "revoice") => void; onSimilar: (idea: string, opts: { dialect: string; vtype: string; music: boolean }) => Promise<string | null>;
}) {
  const router = useRouter();
  const [fields, setFields] = useState(data.fields);
  const [colors, setColors] = useState(data.colors);
  const [font, setFont] = useState(data.font);
  const [contact, setContact] = useState(data.contact);
  const [musicOn, setMusicOn] = useState(data.musicOn);
  const [musicVol, setMusicVol] = useState(data.musicVol);
  const [logo, setLogo] = useState<{ path: string; url: string; on: boolean; box: LogoBox; frameUrl?: string }>({ path: data.logoPath, url: data.logo, on: data.logoOn, box: data.logoBox ?? DEFAULT_LOGO_BOX });
  // a logo that comes as a web link (brand kit, saved work) is turned into the picture itself: the sandboxed preview then never has to fetch it
  useEffect(() => {
    if (!logo.url || logo.frameUrl || !/^https?:/.test(logo.url)) return;
    let dead = false;
    fetch(logo.url).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => new Promise<string>((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = () => no(f.error); f.readAsDataURL(b); }))
      .then((d) => { if (!dead) setLogo((p) => (p.url === logo.url ? { ...p, frameUrl: d } : p)); }).catch(() => {});
    return () => { dead = true; };
  }, [logo.url, logo.frameUrl]);
  const [trim, setTrim] = useState<Trim>(data.trim ?? { start: 0, end: data.cseconds });
  const [own, setOwn] = useState<Music | null>(data.ownAudio ?? null);
  const [narr, setNarr] = useState(data.narration);
  const [dialect, setDialect] = useState(data.dialect);
  const [vtype, setVtype] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [simIdea, setSimIdea] = useState(data.idea);
  const [html, setHtml] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [ready, setReady] = useState(false);
  const [runErr, setRunErr] = useState("");
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [msg, setMsg] = useState<string | null>(data.editError || null);
  const [err, setErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [saving, setSaving] = useState<"" | "saving" | "saved">("");
  const iframe = useRef<HTMLIFrameElement>(null);
  const voice = useRef<HTMLAudioElement>(null);
  const music = useRef<HTMLAudioElement>(null);
  const ownRef = useRef<HTMLAudioElement>(null);
  const trimRef = useRef(trim);
  trimRef.current = trim;
  const playingRef = useRef(false);
  const dirty = useRef(false);
  const total = Math.max(30, Math.round(data.cseconds * 30));

  // new narration after a re-recording
  const narrKey = data.narration.join("|");
  useEffect(() => { setNarr(data.narration); }, [narrKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // the sandboxed page (one HTML file made by the worker)
  useEffect(() => {
    let dead = false;
    setHtml(null); setLoadErr(false);
    fetch(data.previewUrl).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => { if (!dead) setHtml(t.replace(/<head>/i, (m) => m + ERR_SNIPPET)); }).catch(() => { if (!dead) setLoadErr(true); });
    return () => { dead = true; };
  }, [data.previewUrl]);

  const props = useMemo(() => ({
    assets: data.assets ?? {}, t: Object.fromEntries(fields.map((f) => [f.key, f.value])), colors, font, contact: contact.filter((c) => c.handle.trim()), logo: logo.frameUrl ?? logo.url, logoOn: logo.on && !!logo.url, logoBox: logo.box, beats: data.beats, seconds: data.cseconds,
  }), [fields, colors, font, contact, logo, data.beats, data.cseconds, data.assets]);
  const send = useCallback((m: unknown) => { iframe.current?.contentWindow?.postMessage(m, "*"); }, []);
  useEffect(() => { if (ready) send({ type: "props", props }); }, [props, ready, send]);

  const syncAudio = useCallback((t: number, force = false) => {
    const v = voice.current, m = music.current;
    if (v && data.voiceUrl) {
      const want = t - OFFSET;
      if (want < 0) { if (!v.paused) v.pause(); if (force) v.currentTime = 0; }
      else { if (force || Math.abs(v.currentTime - want) > 0.35) v.currentTime = Math.min(want, v.duration || want); if (v.paused && playingRef.current) v.play().catch(() => {}); }
    }
    const o = ownRef.current;
    if (o && own?.url) {
      const at = own.at ?? 0, st = own.start ?? 0, len = (own.end ?? own.dur ?? 0) - st;
      const want = t - at + st;
      if (t < at || (len > 0 && t > at + len)) { if (!o.paused) o.pause(); }
      else { if (force || Math.abs(o.currentTime - want) > 0.35) o.currentTime = Math.max(0, want); if (o.paused && playingRef.current) o.play().catch(() => {}); }
    }
    if (m && data.musicUrl && musicOn) {
      if (force || Math.abs(m.currentTime - t) > 0.5) m.currentTime = Math.min(t, m.duration || t);
      if (m.paused && playingRef.current) m.play().catch(() => {});
    }
  }, [data.voiceUrl, data.musicUrl, musicOn, own]);
  useEffect(() => { if (music.current) music.current.volume = Math.min(1, musicVol * 2.2); if (music.current && !musicOn) music.current.pause(); }, [musicVol, musicOn]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      const m = e.data as { type?: string; frame?: number; playing?: boolean };
      if (m.type === "ready") setReady(true);
      else if (m.type === "err") setRunErr(String((m as { message?: string }).message ?? "").slice(0, 300));
      else if (m.type === "frame" && typeof m.frame === "number") {
        if (playingRef.current && m.frame >= trimRef.current.end * 30 - 1) { playingRef.current = false; iframe.current?.contentWindow?.postMessage({ type: "pause" }, "*"); iframe.current?.contentWindow?.postMessage({ type: "seek", frame: Math.round(trimRef.current.start * 30) }, "*"); setFrame(Math.round(trimRef.current.start * 30)); return; }
        setFrame(m.frame); if (playingRef.current) syncAudio(m.frame / 30);
      }
      else if (m.type === "state") {
        playingRef.current = !!m.playing; setPlaying(!!m.playing);
        if (!m.playing) { voice.current?.pause(); music.current?.pause(); ownRef.current?.pause(); }
      }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [syncAudio]);
  const [reloads, setReloads] = useState(0);
  const readyRef = useRef(false);
  readyRef.current = ready;
  useEffect(() => {
    setReady(false); playingRef.current = false; setPlaying(false);
    // if the page inside never says "ready" (a load that went wrong), load it again by itself instead of waiting for a manual refresh
    if (!html) return;
    const t = setTimeout(() => { if (!readyRef.current) setReloads((r) => r + 1); }, 5000);
    return () => clearTimeout(t);
  }, [html, reloads]);

  function toggle() {
    if (playingRef.current) { send({ type: "pause" }); return; }
    let f = frame; if (f < trim.start * 30 || f >= trim.end * 30 - 2) { f = Math.round(trim.start * 30); setFrame(f); send({ type: "seek", frame: f }); }
    playingRef.current = true; setPlaying(true);
    send({ type: "play" }); syncAudio(f / 30, true);
  }
  function seek(f: number) { setFrame(f); send({ type: "seek", frame: f }); syncAudio(f / 30, true); }

  // everything is saved by itself a moment after the last change
  const body = useCallback(() => ({ job: jobId, fields, colors, font, contact: contact.filter((c) => c.handle.trim()), musicOn, musicVol, logoPath: logo.path, logoOn: logo.on, logoBox: logo.box, trim, ownAudio: own ? { ...own, url: "" } : null }), [jobId, fields, colors, font, contact, musicOn, musicVol, logo, trim, own]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (busy) return; // the panel is locked while the video is being made
    dirty.current = true; setSaving("saving");
    const t = setTimeout(async () => {
      const r = await fetch("/api/free-motion/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body(), action: "save" }) }).catch(() => null);
      dirty.current = !r?.ok; setSaving(r?.ok ? "saved" : "");
    }, 1200);
    return () => clearTimeout(t);
  }, [body, busy]);

  async function act(action: "revoice" | "export") {
    setErr(null); setMsg(null);
    const r = await fetch("/api/free-motion/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body(), action, narration: narr, dialect, ...(voiceId ? { voice: voiceId } : {}) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? L("تعذّر البدء.")); return; }
    send({ type: "pause" });
    onRefresh(action);
  }
  async function uploadLogo(f: File) {
    setUpBusy(true); setErr(null);
    try {
      // a blob: link made in this page cannot be opened inside the sandboxed preview, so the preview gets the picture itself (data:)
      const frameUrl = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
      const u = await uploadImage(f); setLogo((p) => ({ path: u.path, url: u.preview, on: true, box: p.box, frameUrl }));
    }
    catch { setErr(L("صار خطأ، حاول مرة ثانية.")); }
    setUpBusy(false);
  }

  const [aw, ah] = data.aspect.split(":").map(Number);
  const boxStyle: React.CSSProperties = ah > aw ? { height: 540, aspectRatio: `${aw} / ${ah}`, maxWidth: "100%" } : { width: "100%", maxWidth: 560, aspectRatio: `${aw} / ${ah}` };
  const mm = (f: number) => { const s = Math.floor(f / 30); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadLogo(f); }} />}
      <div className="flex flex-col items-center gap-3 lg:sticky lg:top-4 lg:self-start">
        <div className="text-[13px] text-subtle">{L("معاينة مباشرة")} · {L("أي تعديل تسويه يبان بالفيديو على طول.")}</div>
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-md" style={boxStyle}>
          {html && !loadErr ? <iframe key={reloads} ref={iframe} allow="autoplay" title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={html} className="absolute inset-0 h-full w-full border-0" /> : <div className="grid h-full place-items-center p-6 text-center text-[14px] text-white/80">{loadErr ? L("تعذّر تحميل المعاينة. حدّث الصفحة.") : L("جاري تجهيز المعاينة…")}</div>}
          {logo.on && logo.url && <LogoDrag box={logo.box} onChange={(b) => setLogo((p) => ({ ...p, box: b }))} />}
        </div>
        {runErr && <p dir="ltr" role="alert" className="w-full max-w-[360px] rounded-lg bg-red-50 p-2 text-start text-[12px] text-red-800">⚠️ {L("خطأ داخل التصميم")}: {runErr}</p>}
        <div className="flex w-full max-w-[360px] items-center gap-3">
          <button type="button" onClick={toggle} disabled={!ready} className="btn btn-gold h-11 w-11 shrink-0 rounded-full p-0 text-lg" aria-label={playing ? L("إيقاف") : L("تشغيل")}>{playing ? "❚❚" : "▶"}</button>
          <input type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-navy-700" aria-label={L("الوقت")} />
          <span dir="ltr" className="w-[84px] text-end text-[12px] text-subtle">{mm(frame)} / {mm(total)}</span>
        </div>
        {data.voiceUrl && <audio ref={voice} src={data.voiceUrl} preload="auto" />}
        {data.musicUrl && <audio ref={music} src={data.musicUrl} preload="auto" loop />}
        {own?.url && <audio ref={ownRef} src={own.url} preload="auto" />}
        <FreeTimeline total={data.cseconds} playhead={frame / 30} trim={trim} onTrim={setTrim} disabled={!!busy}
          voice={data.voiceUrl ? { at: OFFSET, dur: Math.max(1, data.cseconds - OFFSET - 1.2) } : null} music={!!data.musicUrl && musicOn}
          own={own ? { at: own.at ?? 0, len: (own.end ?? own.dur ?? 3) - (own.start ?? 0), name: own.name } : null}
          onOwnMove={(at) => setOwn((p) => (p ? { ...p, at: +at.toFixed(2) } : p))} onSeek={(sec) => seek(Math.round(sec * 30))} />
        <p className="text-[12px] text-subtle">{saving === "saving" ? L("جاري الحفظ…") : saving === "saved" ? L("✓ محفوظ") : ""}</p>
      </div>

      <div className="flex flex-col gap-4">
        {busy && <div className="card p-4"><Progress value={busy.progress || 5} label={busy.kind === "export" ? L("جاري تجهيز الفيديو…") : L("جاري التسجيل…")} /></div>}
        {msg && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">{L(msg)}</p>}
        {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{err}</p>}
        {busy && busy.kind === "export" && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">{L("الفيديو يتجهز بآخر تعديلاتك لحظة الضغط. اللوحة مقفلة لين يخلص، وبعدها تقدر تعدّل وتصدّر من جديد.")}</p>}
        <fieldset disabled={!!busy} className={`m-0 flex min-w-0 flex-col gap-4 border-0 p-0 ${busy ? "pointer-events-none opacity-60" : ""}`}>

        <Card more title={L("النصوص")} icon="✍️">
          {fields.map((f, i) => <label key={f.key} className="flex flex-col gap-1 text-[13px] text-subtle">{f.label}<input value={f.value} maxLength={200} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="field text-[15px] text-ink" /></label>)}
        </Card>

        {data.voiceover && (
          <Card more title={L("تعليق صوتي")} icon="🎙️">
            {narr.map((n, i) => <textarea key={i} rows={2} maxLength={220} value={n} onChange={(e) => setNarr(narr.map((x, j) => (j === i ? e.target.value : x)))} className="field text-[14px]" aria-label={`${L("نص التعليق")} ${i + 1}`} />)}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[14px]">{L("اللهجة")}<select value={dialect} onChange={(e) => setDialect(e.target.value)} className="field w-44">{GULF_DIALECTS.map(([v, ar]) => <option key={v} value={v}>{L(ar)}</option>)}</select></label>
              {voices.length > 0 && <VoicePick voices={voices} value={voiceId} onChange={setVoiceId} auto="نفس الصوت الحالي" />}
            </div>
            <button type="button" disabled={!!busy} onClick={() => act("revoice")} className="btn btn-outline self-start px-4 py-2 text-[14px]">🎙️ {L("أعد تسجيل التعليق")}</button>
            <span className="text-[12px] text-subtle">{L("إذا غيّرت جملة أو الصوت، التسجيل ياخذ دقيقة تقريباً. عدد الجمل ثابت عشان الصورة تمشي مع الصوت.")}</span>
          </Card>
        )}

        {data.voiceover && (
          <Card more title={L("موسيقى خلفية")} icon="🎵">
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={musicOn} onChange={(e) => setMusicOn(e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("موسيقى هادية بالخلفية")}</label>
            {musicOn && <label className="flex items-center gap-3 text-[14px]">{L("الصوت")}<input type="range" min={0} max={0.5} step={0.02} value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} className="flex-1 accent-navy-700" /></label>}
          </Card>
        )}

        <Card more title={L("الألوان")} icon="🎨">
          <div className="flex flex-wrap gap-4">
            {([["bg", "الخلفية"], ["accent", "اللون المميّز"], ["text", "الخط"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-[14px]"><input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="h-9 w-12 cursor-pointer rounded border" />{L(l)}</label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[14px]">{L("الخط")}<select value={font} onChange={(e) => setFont(e.target.value)} className="field w-40">{FONT_LIBRARY.map((f) => <option key={f.id} value={f.id}>{L(f.label)}</option>)}</select></label>
        </Card>

        <Card more title={L("صوتك من جهازك")} icon="🎧">
          <p className="text-[13px] text-subtle">{L("ارفع صوت أو موسيقى، وقصّه وحدد مكانه ومستواه. يظهر بالخط الزمني تحت الفيديو.")}</p>
          <MusicEditor music={own} onChange={setOwn} total={data.cseconds} playhead={() => frame / 30} disabled={!!busy} />
        </Card>

        <Card more title={L("الشعار")} icon="🏷️">
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo.url && <img src={logo.url} alt={L("الشعار")} className="h-12 max-w-[120px] rounded-lg bg-tint object-contain p-1" />}
            <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{logo.url ? L("تغيير الشعار") : L("⬆️ ارفع شعارك")}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setCropFile(f); }} /></label>
            {!logo.url && kitLogo && <button type="button" onClick={() => setLogo({ path: kitLogo.path, url: kitLogo.url, on: true, box: DEFAULT_LOGO_BOX })} className="btn btn-outline px-4 py-2 text-sm">{L("✨ استخدم شعار هويتي")}</button>}
            {logo.url && <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={logo.on} onChange={(e) => setLogo({ ...logo, on: e.target.checked })} className="h-4 w-4 accent-navy-700" />{L("اعرض الشعار")}</label>}
          </div>
          {logo.on && logo.url && <LogoSize box={logo.box} onChange={(b) => setLogo({ ...logo, box: b })} />}
          {upBusy && <p className="text-[14px] text-subtle">{L("جاري الرفع…")}</p>}
        </Card>

        <Card more title={L("حسابات التواصل")} icon="📱">
          {contact.map((c, i) => (
            <div key={i} className="flex gap-2">
              <select value={c.icon} onChange={(e) => setContact(contact.map((x, j) => (j === i ? { ...x, icon: e.target.value as BrandId } : x)))} className="field w-36">{social.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              <input dir="ltr" value={c.handle} maxLength={40} onChange={(e) => setContact(contact.map((x, j) => (j === i ? { ...x, handle: e.target.value } : x)))} className="field flex-1 text-start" placeholder="@username" />
              <button type="button" onClick={() => setContact(contact.filter((_, j) => j !== i))} className="btn btn-outline px-3" aria-label={L("حذف")}>✕</button>
            </div>
          ))}
          {contact.length < 6 && <button type="button" onClick={() => setContact([...contact, { icon: "instagram", handle: "" }])} className="btn btn-outline self-start px-4 py-2 text-[14px]">+ {L("أضف حساب")}</button>}
        </Card>

        <section className={card}>
          <h3 className="font-bold text-navy-900">{L("⬇️ تصدير الفيديو (MP4)")}</h3>
          {data.exportUrl && !busy && <><p className="text-[14px] text-emerald-800">{L("✓ الفيديو جاهز")}</p><a href={data.exportUrl} download className="btn btn-gold py-3 text-center">{L("⬇️ تحميل الفيديو")}</a></>}
          <button type="button" disabled={!!busy} onClick={() => act("export")} className="btn btn-outline py-3">{data.exportUrl ? L("صدّر من جديد بآخر تعديلاتك") : L("⬇️ تصدير الفيديو (MP4)")}</button>
          <span className="text-[12px] text-subtle">{L("التصدير مجاني، ياخذ دقيقة إلى ثلاث. بعد التصدير تطلع لك شاشة الفيديو، والتعديل عليه بعدها يكلّف ريش.")}</span>
          <button type="button" onClick={() => router.push("/app/works")} className="btn btn-outline self-start px-4 py-2 text-sm">{L("روح لأعمالي")}</button>
        </section>

        <Card more title={L("سوّ مثله بفكرة جديدة")} icon="✨">
          <p className="text-[13px] text-subtle">{L("نفس التصميم والحركات، بس بالكلام والمعلومات الجديدة.")}</p>
          <textarea minLength={10} maxLength={1500} rows={3} value={simIdea} onChange={(e) => setSimIdea(e.target.value)} className="field" />
          <button type="button" disabled={simIdea.trim().length < 10 || balance < editCost || !!busy} onClick={async () => { const e = await onSimilar(simIdea, { dialect, vtype, music: musicOn }); if (e) setErr(e); }} className="btn btn-gold py-3">{L("سوّ مثله")} ({editCost} {L("ريشة")})</button>
        </Card>
        </fieldset>
      </div>
    </div>
  );
}
