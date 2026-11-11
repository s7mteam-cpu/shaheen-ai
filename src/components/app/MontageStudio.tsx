"use client";
import { L, LT } from "@/lib/i18n/ui";
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import { Player, type PlayerRef } from "@remotion/player";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MontageVideo } from "@/remotion/MontageVideo";
import { CAPTION_STYLES, GRAPHIC_KINDS, LAYOUTS, TRANSITIONS, TITLE_STYLES, EMOJIS, GRADES, MFPS, SUB_LANGS, dimensions, introFrames, montageTexts, setMontageText, totalFrames, videoSeconds, type CaptionPos, type CaptionStyle, type Corner, type GraphicKind, type MontageSpec, type Transition } from "@/remotion/montage";
import { FONTS } from "@/remotion/spec";
import { Progress } from "@/components/app/Progress";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { createClient } from "@/lib/supabase/client";

type Track = { name: string; mood?: string; url: string };

const Card = ({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) => (
  <section className="card flex flex-col gap-4 p-5">
    <h2 className="flex items-center gap-2 text-[18px] font-bold text-navy-900">{icon && <span aria-hidden>{icon}</span>}{title}</h2>
    {children}
  </section>
);
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;
const styles: [CaptionStyle, string][] = CAPTION_STYLES;
const positions: [CaptionPos, string][] = [["bottom", "تحت"], ["middle", "بالوسط"], ["top", "فوق"]];
const transitions: [Transition, string][] = TRANSITIONS;
const corners: [Corner, string][] = [["tl", "فوق يسار"], ["tr", "فوق يمين"], ["bl", "تحت يسار"], ["br", "تحت يمين"]];
const colorLabels = { text: "لون النص", accent: "اللون المميز", bg: "لون البطاقات" } as const;

type Kit = { colors: string[]; font: string | null; handle: string | null; name: string | null } | null;

export function MontageStudio({ jobId, initial, editCost, tracks, kit = null, voices = [] }: { jobId: string; initial: MontageSpec; editCost: number; tracks: Track[]; kit?: Kit; voices?: { id: string; name: string; note?: string }[] }) {
  const key = `montage:${jobId}`;
  const [spec, setSpec] = useState<MontageSpec>(initial);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [sent, setSent] = useState(false);
  const [render, setRender] = useState<{ status: string; progress: number; url?: string }>({ status: "queued", progress: 0 });
  const player = useRef<PlayerRef>(null);

  // Keep the draft between visits (the video link is always the fresh one from the server).
  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem(key);
      if (s) {
        const d = JSON.parse(s) as MontageSpec;
        const urls = new Map((initial.broll ?? []).map((b) => [b.path, b.url]));
        // links expire: take fresh ones from the server, keep the customer's edits
        setSpec({ ...d, src: initial.src, logo: d.logo ? (initial.logo && initial.logo.path === d.logo.path ? { ...d.logo, url: initial.logo.url } : d.logo) : initial.logo, broll: (d.broll ?? []).map((b) => ({ ...b, url: urls.get(b.path) ?? b.url })), vo: initial.vo ? { ...initial.vo, on: d.vo?.on ?? initial.vo.on } : null, music: d.music?.path && initial.music?.path === d.music.path ? initial.music : d.music });
      }
    } catch {}
  }, [key, initial.src, initial.logo, initial.broll, initial.music, initial.vo]);
  // local design preview only: lets test scripts seek the player
  useEffect(() => { if (jobId === "demo") (window as unknown as { __mp?: unknown }).__mp = player.current; });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ ...spec, src: "" })); } catch {} }, [key, spec]);
  const [lang, setLang] = useState(initial.subs2?.lang ?? "en");
  const [uploading, setUploading] = useState(false);
  const [voText, setVoText] = useState(initial.vo?.text ?? "");
  const [voVoice, setVoVoice] = useState(initial.vo?.voice || voices[0]?.id || "");
  const voAudio = useRef<HTMLAudioElement | null>(null);
  const [voPlaying, setVoPlaying] = useState(false);
  const voName = voices.find((v) => v.id === spec.vo?.voice)?.name ?? L("تعليق صوتي");
  const voSecs = spec.vo?.words.length ? spec.vo.words[spec.vo.words.length - 1].e : 0;
  function toggleVo() {
    if (!spec.vo?.url) return;
    if (voPlaying) { voAudio.current?.pause(); setVoPlaying(false); return; }
    voAudio.current?.pause();
    voAudio.current = new Audio(spec.vo.url);
    voAudio.current.onended = () => setVoPlaying(false);
    voAudio.current.play().then(() => setVoPlaying(true)).catch(() => {});
  }
  /** ✕ on the voice bar: remove the voice-over; captions go back to the original speech. */
  function removeVo() {
    voAudio.current?.pause(); setVoPlaying(false);
    setSpec((sp) => ({ ...sp, vo: null, videoVolume: 1 }));
  }
  useEffect(() => () => voAudio.current?.pause(), []);

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

  const { width, height } = dimensions(spec.aspect);
  const texts = useMemo(() => montageTexts(spec), [spec]);
  const seconds = Math.round(totalFrames(spec) / MFPS);

  async function call<T>(action: string, body: object): Promise<T | null> {
    setBusy(action); setError(null);
    try {
      const r = await fetch(`/api/montage/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? L("صار خطأ، حاول مرة ثانية."));
      return d as T;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }

  /** Adds a title at the moment the player is paused on. */
  /** A ready-to-edit graphic of the chosen kind at the playhead. */
  function addGraphic(kind: GraphicKind) {
    const f = player.current?.getCurrentFrame() ?? 0;
    const at = +Math.max(0, Math.min(videoSeconds(spec) - 1, (f - introFrames(spec)) / MFPS)).toFixed(2);
    const base = { kind, at, dur: 3 };
    const g = kind === "timer" ? { ...base, text: L("في أقل من دقيقة"), hl: L("دقيقة") }
      : kind === "counter" ? { ...base, value: 100, suffix: "٪", text: L("نتيجة مضمونة") }
      : kind === "steps" ? { ...base, text: L("الخطوات"), items: [{ label: L("الخطوة الأولى") }, { label: L("الخطوة الثانية") }, { label: L("الخطوة الثالثة") }] }
      : kind === "checklist" ? { ...base, text: L("تحتاج"), items: [{ label: L("فكرة واضحة") }, { label: L("أداة مناسبة") }] }
      : kind === "compare" ? { ...base, bad: L("الطريقة القديمة"), good: L("الطريقة الصح") }
      : kind === "icon" ? { ...base, icon: "bulb" as const, text: L("فكرة ذكية") }
      : kind === "bars" ? { ...base, text: L("المبيعات"), items: [{ label: L("قبل"), value: 40 }, { label: L("بعد"), value: 95 }] }
      : kind === "donut" ? { ...base, value: 75, text: L("من العملاء راضين") }
      : kind === "line" ? { ...base, text: L("نمو مستمر"), values: [2, 3, 2.6, 4, 5.2, 7] }
      : kind === "quote" ? { ...base, text: L("الجودة ما تحتاج إعلان"), sub: L("اسمك") }
      : kind === "arrow" ? { ...base, text: L("الرابط تحت"), fx: "underline" as const, hl: L("تحت") }
      : kind === "flow" ? { ...base, items: [{ icon: "bulb" as const, label: L("فكرتك") }, { icon: "sparkle" as const, label: L("شاهين") }, { icon: "video" as const, label: L("فيديو") }] }
      : { ...base, text: L("عنوان كبير") };
    setSpec({ ...spec, graphics: [...(spec.graphics ?? []), g].sort((a, b) => a.at - b.at) });
  }

  function addTitle() {
    const f = player.current?.getCurrentFrame() ?? 0;
    const at = Math.max(0, Math.min(videoSeconds(spec) - 1, (f - introFrames(spec)) / MFPS));
    setSpec({ ...spec, titles: [...spec.titles, { text: L("عنوان جديد"), at: +at.toFixed(2), dur: 2.5, pos: "top" as const }].sort((a, b) => a.at - b.at) });
  }
  const removeTitle = (i: number) => setSpec({ ...spec, titles: spec.titles.filter((_, j) => j !== i) });
  const nowAt = () => Math.max(0, Math.min(videoSeconds(spec) - 0.5, ((player.current?.getCurrentFrame() ?? 0) - introFrames(spec)) / MFPS));
  const addEmoji = (e: string) => setSpec({ ...spec, emojis: [...(spec.emojis ?? []), { e, at: +nowAt().toFixed(2), dur: 1.5 }].sort((a, b) => a.at - b.at) });
  const removeEmoji = (i: number) => setSpec({ ...spec, emojis: (spec.emojis ?? []).filter((_, j) => j !== i) });
  /** Brand kit → colours, font and contact line. */
  function applyBrand() {
    if (!kit) return;
    const hex = kit.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
    const sat = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255]; return Math.max(...c) - Math.min(...c); };
    const accent = [...hex].sort((a, b) => sat(b) - sat(a))[0] ?? spec.colors.accent;
    const bg = [...hex].sort((a, b) => lum(a) - lum(b))[0] ?? spec.colors.bg;
    setSpec({
      ...spec, colors: { ...spec.colors, accent, bg }, font: kit.font || spec.font,
      intro: { ...spec.intro, title: spec.intro.title || kit.name || "" },
      outro: { ...spec.outro, on: true, subtitle: kit.handle || spec.outro.subtitle },
      logo: spec.logo ? { ...spec.logo, on: true } : spec.logo,
    });
  }
  const removeBroll = (i: number) => setSpec({ ...spec, broll: (spec.broll ?? []).filter((_, j) => j !== i) });

  const [cropFile, setCropFile] = useState<File | null>(null);
  /** The customer's logo, added or replaced right here. */
  async function addLogo(file: File) {
    setUploading(true); setError(null);
    try {
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const supabase = createClient();
      const up = await supabase.storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      if (up.error) throw new Error(L("تعذّر رفع الشعار."));
      const signed = await supabase.storage.from("uploads").createSignedUrl(d.path, 60 * 60 * 6);
      setSpec((sp) => ({ ...sp, logo: { path: d.path, url: signed.data?.signedUrl ?? "", on: true, pos: sp.logo?.pos ?? "tr", box: sp.logo?.box ?? DEFAULT_LOGO_BOX } }));
    } catch (e) { setError((e as Error).message || L("تعذّر رفع الشعار.")); } finally { setUploading(false); }
  }

  /** Upload a photo and show it at the moment the player is paused on. */
  async function addBroll(file: File) {
    setUploading(true); setError(null);
    try {
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const supabase = createClient();
      const up = await supabase.storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      if (up.error) throw new Error(L("تعذّر رفع الصورة."));
      const signed = await supabase.storage.from("uploads").createSignedUrl(d.path, 60 * 60 * 6);
      const at = +nowAt().toFixed(2);
      setSpec((sp) => ({ ...sp, broll: [...(sp.broll ?? []), { path: d.path, url: signed.data?.signedUrl ?? "", at, dur: 2.5 }].sort((a, b) => a.at - b.at) }));
    } catch (e) { setError((e as Error).message || L("تعذّر رفع الصورة.")); } finally { setUploading(false); }
  }

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
          <Link href="/app/tools/video-editing" className="btn border border-line bg-white px-6 py-3">{L("مونتاج جديد")}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
    {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); addLogo(f); }} />}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-900">{L("معاينة مباشرة")}</h2>
          <span className="rounded-full bg-tint px-3 py-1 text-[13px] text-subtle">{seconds} {L("ثانية")}</span>
        </div>
        <div dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg" style={{ maxWidth: spec.aspect === "9:16" ? "min(100%, calc((100vh - 11rem) * 0.5625))" : "100%" }}>
          {mounted ? (
            <Player ref={player} component={MontageVideo} inputProps={spec} durationInFrames={totalFrames(spec)} fps={MFPS}
              compositionWidth={width} compositionHeight={height} style={{ width: "100%" }} controls acknowledgeRemotionLicense />
          ) : <div style={{ aspectRatio: `${width} / ${height}` }} />}
          {spec.logo?.on && spec.logo.box && (
            <div className="pointer-events-none absolute inset-x-0 top-0" style={{ aspectRatio: `${width} / ${height}` }}>
              <LogoDrag box={spec.logo.box} onChange={(b) => setSpec((p) => (p.logo ? { ...p, logo: { ...p.logo, box: b } } : p))} />
            </div>
          )}
        </div>
        <p className="text-center text-[13px] text-subtle">{L("شاهين قصّ الفيديو وحط الهوك والعناوين. عدّل اللي تبيه وشوف التغيير على طول.")}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card title={L("الترجمة")} icon="💬">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="font-semibold">{L("إظهار الترجمة على الفيديو")}</span>
            <input type="checkbox" checked={spec.captions.on} onChange={(e) => setSpec({ ...spec, captions: { ...spec.captions, on: e.target.checked } })} className="h-5 w-5" />
          </label>
          {spec.captions.on && <>
            <Sub>{L("مكان الترجمة")}</Sub>
            <div className="flex flex-wrap gap-2">{positions.map(([p, l]) => <button key={p} type="button" aria-pressed={(spec.captions.pos ?? "bottom") === p} onClick={() => setSpec({ ...spec, captions: { ...spec.captions, pos: p } })} className="chip">{L(l)}</button>)}</div>
            <Sub>{L("شكل الترجمة")}</Sub>
          </>}
          {spec.captions.on && <div className="flex flex-wrap gap-2">{styles.map(([s, l]) => <button key={s} type="button" aria-pressed={spec.captions.style === s} onClick={() => setSpec({ ...spec, captions: { ...spec.captions, style: s } })} className="chip">{L(l)}</button>)}</div>}
        </Card>

        <Card title={L("تعديلات سريعة")} icon="✏️">
          <Sub>{L("الألوان")}</Sub>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(Object.keys(colorLabels) as (keyof typeof colorLabels)[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                {colorLabels[k]}
                <input type="color" value={spec.colors[k]} onChange={(e) => setSpec({ ...spec, colors: { ...spec.colors, [k]: e.target.value } })} aria-label={colorLabels[k]} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
              </label>
            ))}
          </div>

          <Sub>{L("النصوص")}</Sub>
          <div className="flex flex-col gap-2.5">
            {texts.map((f) => (
              <div key={f.key} className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[12px] text-subtle">{L(f.label)}</span>
                  <input value={f.value} onChange={(e) => setSpec(setMontageText(spec, f.key, e.target.value))} className="field" />
                </label>
                {f.key.startsWith("titles.") && <button type="button" onClick={() => removeTitle(Number(f.key.split(".")[1]))} aria-label={LT(`حذف ${L(f.label)}`, `Delete ${L(f.label)}`)} className="mb-1 rounded-lg px-3 py-2 text-red-700 hover:bg-red-50">{L("حذف")}</button>}
              </div>
            ))}
            <button type="button" onClick={addTitle} className="btn border border-dashed border-field bg-white py-2.5 text-[14px]">{L("＋ أضف عنوان متحرك عند اللحظة اللي واقف عليها بالفيديو")}</button>
          </div>

          <Sub>{L("البداية والنهاية")}</Sub>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={spec.intro.on} onClick={() => setSpec({ ...spec, intro: { ...spec.intro, on: !spec.intro.on, title: spec.intro.title || L("اسم نشاطك") } })} className="chip">{L("بطاقة البداية")}</button>
            <button type="button" aria-pressed={spec.outro.on} onClick={() => setSpec({ ...spec, outro: { ...spec.outro, on: !spec.outro.on, title: spec.outro.title || L("تابعنا للمزيد") } })} className="chip">{L("بطاقة النهاية")}</button>
          </div>

          <Sub>{L("الخط")}</Sub>
          <div className="flex flex-wrap gap-2">
            {FONTS.map((f) => (
              <button key={f.id} type="button" aria-pressed={spec.font === f.id} onClick={() => setSpec({ ...spec, font: f.id })} style={{ fontFamily: f.id }}
                className={`rounded-xl border px-4 py-2 text-[16px] ${spec.font === f.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}>{L(f.label)}</button>
            ))}
          </div>
        </Card>

        <Card title={L("الرسوم المتحركة والشاشة المقسومة")} icon="✨">
          <Sub>{L("شكل الفيديو")}</Sub>
          <div className="flex flex-wrap gap-2">
            {LAYOUTS.map(([v, l]) => <button key={v} type="button" aria-pressed={(spec.layout ?? "full") === v} onClick={() => setSpec({ ...spec, layout: v })} className="chip">{L(l)}</button>)}
          </div>
          {spec.layout && spec.layout !== "full" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={(spec.panel ?? "light") === "light"} onClick={() => setSpec({ ...spec, panel: "light" })} className="chip">{L("لوحة فاتحة")}</button>
              <button type="button" aria-pressed={spec.panel === "dark"} onClick={() => setSpec({ ...spec, panel: "dark" })} className="chip">{L("لوحة داكنة")}</button>
            </div>
          )}
          <p className="text-[13px] leading-6 text-subtle">{L("المشاهد تطلع مع كلامك بالضبط. تقدر تكتب لشاهين تحت مثلاً: «لما أقول دقيقة حط ساعة فوق»، أو تضيفها بنفسك عند اللحظة اللي واقف عليها بالفيديو.")}</p>
          <Sub>{L("المشاهد المتحركة")}</Sub>
          <div className="flex flex-col gap-2">
            {(spec.graphics ?? []).length === 0 && <p className="text-[13px] text-subtle">{L("ما فيه مشاهد للحين.")}</p>}
            {(spec.graphics ?? []).map((g, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[14px]">
                <button type="button" onClick={() => player.current?.seekTo(introFrames(spec) + Math.round(g.at * MFPS))} className="shrink-0 rounded-lg bg-tint px-2 py-1 font-mono text-[12px]" dir="ltr">{g.at.toFixed(1)}s</button>
                <span className="shrink-0 font-semibold">{L(GRAPHIC_KINDS.find((k) => k[0] === g.kind)?.[1] ?? "")}</span>
                <span className="min-w-0 flex-1 truncate text-subtle">{g.text ?? g.items?.map((x) => x.label).join(" · ") ?? g.good ?? ""}</span>
                {(g.kind === "headline" || g.kind === "quote" || g.kind === "arrow") && (
                  <select value={g.fx ?? ""} onChange={(e) => setSpec({ ...spec, graphics: (spec.graphics ?? []).map((x, j) => (j === i ? { ...x, fx: (e.target.value || undefined) as typeof x.fx, hl: x.hl || x.text?.split(/\s+/).slice(-1)[0] } : x)) })} aria-label={L("تأثير الكلمة")} className="shrink-0 rounded-lg border border-line bg-white px-1 py-1 text-[12px]">
                    <option value="">{L("بدون تأثير")}</option><option value="marker">{L("تظليل")}</option><option value="circle">{L("دائرة")}</option><option value="underline">{L("خط تحت")}</option><option value="typewriter">{L("آلة كاتبة")}</option>
                  </select>
                )}
                <button type="button" onClick={() => setSpec({ ...spec, graphics: (spec.graphics ?? []).filter((_, j) => j !== i) })} className="shrink-0 rounded-lg px-2 py-1 text-red-700 hover:bg-red-50">{L("حذف")}</button>
              </div>
            ))}
          </div>
          <span className="text-[13px] font-semibold text-navy-800">{L("＋ أضف مشهد عند اللحظة اللي واقف عليها:")}</span>
          <div className="flex flex-wrap gap-2">{GRAPHIC_KINDS.map(([k, l]) => <button key={k} type="button" onClick={() => addGraphic(k)} className="chip">{L(l)}</button>)}</div>
        </Card>

        <Card title={L("لمسات احترافية")} icon="🎬">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">{L("🔊 مؤثرات صوتية")}</span>
              <input type="checkbox" checked={!!spec.sfx} onChange={(e) => setSpec({ ...spec, sfx: e.target.checked })} className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">{L("📊 شريط تقدّم فوق")}</span>
              <input type="checkbox" checked={!!spec.progress} onChange={(e) => setSpec({ ...spec, progress: e.target.checked })} className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 sm:col-span-2">
              <span className="font-semibold">{L("🎞 تصدير بجودة 4K (ليوتيوب، يتأخر أكثر)")}</span>
              <input type="checkbox" checked={spec.quality === "4k"} onChange={(e) => setSpec({ ...spec, quality: e.target.checked ? "4k" : "1080" })} className="h-5 w-5" />
            </label>
          </div>

          <Sub>{L("الانتقال عند كل قطع")}</Sub>
          <div className="flex flex-wrap gap-2">{transitions.map(([v, l]) => <button key={v} type="button" aria-pressed={(spec.transition ?? "none") === v} onClick={() => setSpec({ ...spec, transition: v })} className="chip">{L(l)}</button>)}</div>

          <Sub>{L("ستايل النصوص على الفيديو")}</Sub>
          <div className="flex flex-wrap gap-2">{TITLE_STYLES.map(([v, l]) => <button key={v} type="button" aria-pressed={spec.titles.length > 0 && spec.titles.every((t) => (t.style ?? "pill") === v)} onClick={() => setSpec({ ...spec, titles: spec.titles.map((t) => ({ ...t, style: v })) })} className="chip">{L(l)}</button>)}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"><span className="font-semibold">{L("حركة سينمائية بطيئة")}</span>
              <input type="checkbox" checked={!!spec.drift} onChange={(e) => setSpec({ ...spec, drift: e.target.checked })} className="h-5 w-5" /></label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"><span className="font-semibold">{L("حواف داكنة (فينييت)")}</span>
              <input type="checkbox" checked={!!spec.vignette} onChange={(e) => setSpec({ ...spec, vignette: e.target.checked })} className="h-5 w-5" /></label>
          </div>

          <Sub>{L("شعار نشاطك")}</Sub>
          {spec.logo ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <span className="font-semibold">{L("إظهار الشعار بالزاوية")}</span>
                <input type="checkbox" checked={spec.logo.on} onChange={(e) => setSpec({ ...spec, logo: { ...spec.logo!, on: e.target.checked } })} className="h-5 w-5" />
              </label>
              {spec.logo.on && <div className="flex flex-wrap gap-2">
                {corners.map(([c, l]) => <button key={c} type="button" aria-pressed={!spec.logo!.box && spec.logo!.pos === c} onClick={() => setSpec({ ...spec, logo: { ...spec.logo!, pos: c, box: null } })} className="chip">{L(l)}</button>)}
                <button type="button" aria-pressed={!!spec.logo.box} onClick={() => setSpec({ ...spec, logo: { ...spec.logo!, box: spec.logo!.box ?? DEFAULT_LOGO_BOX } })} className="chip">{L("✋ تحريك وتكبير حر")}</button>
              </div>}
              {spec.logo.on && spec.logo.box && <LogoSize box={spec.logo.box} onChange={(b) => setSpec({ ...spec, logo: { ...spec.logo!, box: b } })} />}
              <label className="btn btn-outline cursor-pointer self-start px-4 py-2 text-sm">{L("تغيير الشعار")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} /></label>
            </>
          ) : (
            <label className="btn btn-outline cursor-pointer self-start px-4 py-2 text-sm">{L("⬆️ ارفع شعارك")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} /></label>
          )}

          <Sub>{L("إيموجي")}</Sub>
          {(spec.emojis ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {(spec.emojis ?? []).map((x, i) => (
                <li key={i} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pe-1 ps-3 text-[14px]">
                  <span className="text-[18px]">{x.e}</span><span className="text-subtle" dir="ltr">{x.at.toFixed(1)}s</span>
                  <button type="button" onClick={() => removeEmoji(i)} aria-label={LT(`حذف ${x.e}`, `Delete ${x.e}`)} className="rounded-full px-2 text-red-700 hover:bg-red-50">×</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] text-subtle">{L("وقّف الفيديو عند اللحظة اللي تبيها، واضغط على إيموجي لإضافته.")}</p>
          <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => addEmoji(e)} aria-label={LT(`أضف ${e}`, `Add ${e}`)} className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-[20px] hover:border-gold-500">{e}</button>)}</div>
        </Card>

        <Card title={L("الصورة والصوت")} icon="🎨">
          <Sub>{L("ستايل الألوان والإضاءة")} {spec.autoBright && spec.autoBright > 1 ? L("(صحّحنا إضاءة الفيديو الغامق تلقائياً)") : ""}</Sub>
          <div className="flex flex-wrap gap-2">{GRADES.map(([g, l]) => <button key={g} type="button" aria-pressed={(spec.grade ?? "none") === g} onClick={() => setSpec({ ...spec, grade: g })} className="chip">{L(l)}</button>)}</div>
          {(spec.face ?? []).length > 0 && (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">{L("🎯 تتبّع الوجه (القص يلحق الشخص)")}</span>
              <input type="checkbox" checked={!!spec.track} onChange={(e) => setSpec({ ...spec, track: e.target.checked })} className="h-5 w-5" />
            </label>
          )}
          <Sub>{L("صوت الفيديو الأصلي")}</Sub>
          <div className="flex flex-wrap gap-2">
            {([[1, L("كامل")], [0.25, L("منخفض")], [0, L("صامت")]] as const).map(([v, l]) => <button key={l} type="button" aria-pressed={Math.abs((spec.videoVolume ?? 1) - v) < 0.14} onClick={() => setSpec({ ...spec, videoVolume: v })} className="chip">{L(l)}</button>)}
          </div>
          {kit && <button type="button" onClick={applyBrand} className="btn border border-gold-500 bg-gold-500/10 py-2.5 text-[14px] font-semibold text-navy-900">{L("🏷️ طبّق هويتي التجارية (الألوان، الخط، الشعار، الحساب)")}</button>}
        </Card>

        <Card title={L("التعليق الصوتي")} icon="🎙️">
          {spec.vo ? (
            /* the voice track: play it, or ✕ to delete and record a new one */
            <div className="flex items-center gap-3 rounded-2xl border border-navy-800/15 bg-navy-800 px-3 py-3 text-white">
              <button type="button" onClick={toggleVo} aria-label={voPlaying ? L("إيقاف") : L("تشغيل الصوت")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-navy-900">{voPlaying ? "❚❚" : "▶"}</button>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-[14px] font-semibold">🎙️ {voName}</span>
                <span aria-hidden className="flex h-5 items-center gap-[3px] overflow-hidden">
                  {Array.from({ length: 34 }, (_, i) => <span key={i} className="w-[3px] rounded-full bg-gold-500/80" style={{ height: `${25 + Math.abs(Math.sin(i * 1.7) * 75)}%` }} />)}
                </span>
              </div>
              <span className="shrink-0 text-[12px] text-white/70" dir="ltr">{voSecs.toFixed(0)}s</span>
              <button type="button" onClick={removeVo} aria-label={L("حذف التعليق الصوتي")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[18px] hover:bg-red-600">✕</button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-subtle">{L("اكتب الكلام واختر الصوت، وبيتسجّل فوق الفيديو والترجمة تمشي معه.")}</p>
              <textarea value={voText} onChange={(e) => setVoText(e.target.value)} rows={5} maxLength={1500} className="field" placeholder={L("اكتب الكلام اللي تبي ينقال…")} />
              {voices.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Sub>{L("اختر الصوت")}</Sub>
                  {voices.map((v) => (
                    <button key={v.id} type="button" aria-pressed={voVoice === v.id} onClick={() => setVoVoice(v.id)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start ${voVoice === v.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white"}`}>
                      <span aria-hidden>🎙️</span><span className="flex-1 font-semibold">{v.name}</span>{voVoice === v.id && <span aria-hidden>✓</span>}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" disabled={!voText.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
                onClick={async () => {
                  const d = await call<{ spec: MontageSpec; url: string; text: string }>("voice", { spec: { ...spec, src: "", words: [], face: [] }, text: voText, voice: voVoice });
                  if (d) { setSpec((sp) => ({ ...sp, segments: d.spec.segments, videoVolume: d.spec.videoVolume, vo: { ...d.spec.vo!, url: d.url } })); setVoText(d.text); }
                }}>
                {busy === "voice" ? L("جاري التسجيل…") : LT(`🎙️ سجّل الصوت (${editCost} ريشة)`, `🎙️ Record voice (${editCost} credits)`)}
              </button>
            </div>
          )}
        </Card>

        <Card title={L("صور إضافية فوق الكلام")} icon="🖼️">
          {(spec.broll ?? []).length > 0 ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {(spec.broll ?? []).map((b, i) => (
                <li key={b.path + i} className="relative overflow-hidden rounded-xl border border-line bg-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.url && <img src={b.url} alt="" className="aspect-square w-full object-cover" />}
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 text-[11px] text-white" dir="ltr">{b.at.toFixed(1)}s</span>
                  <button type="button" onClick={() => removeBroll(i)} aria-label={L("حذف الصورة")} className="absolute left-1 top-1 rounded-full bg-white/90 px-2 text-red-700">×</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-subtle">{L("ما فيه صور إضافية. أضف صور منتجاتك أو محلك وبتطلع فوق الكلام.")}</p>}
          <label className={`btn border border-dashed border-field bg-white py-2.5 text-[14px] ${uploading ? "opacity-60" : "cursor-pointer"}`}>
            {uploading ? L("جاري رفع الصورة…") : L("＋ أضف صورة عند اللحظة اللي واقف عليها بالفيديو")}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) addBroll(f); e.target.value = ""; }} />
          </label>
        </Card>

        <Card title={L("ترجمة بلغة ثانية")} icon="🌍">
          {spec.subs2 ? (
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">{L("إظهار ترجمة")} {SUB_LANGS.find((l) => l.id === spec.subs2!.lang)?.label} {L("تحت الكلام")}</span>
              <input type="checkbox" checked={spec.subs2.on} onChange={(e) => setSpec({ ...spec, subs2: { ...spec.subs2!, on: e.target.checked } })} className="h-5 w-5" />
            </label>
          ) : <p className="text-[13px] text-subtle">{L("أضف ترجمة تحت الكلام العربي، توصل لجمهور أكبر.")}</p>}
          <div className="flex flex-wrap gap-2">{SUB_LANGS.map((l) => <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)} className="chip">{L(l.label)}</button>)}</div>
          <button type="button" disabled={!!busy} className="btn btn-primary self-start px-5 py-2.5"
            onClick={async () => { const d = await call<{ subs2: NonNullable<MontageSpec["subs2"]> }>("translate", { spec: { ...spec, src: "" }, lang }); if (d) setSpec((sp) => ({ ...sp, subs2: d.subs2 })); }}>
            {busy === "translate" ? L("جاري الترجمة…") : LT(`ترجم الكلام (${editCost} ريشة)`, `Translate speech (${editCost} credits)`)}
          </button>
        </Card>

        <Card title={L("تعديل متقدّم (بالوصف)")} icon="✨">
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} className="field" placeholder={L("مثال: زيد عناوين للأفكار الأساسية، وكبّر أكثر على الجمل القوية، وخلّ الألوان أحمر وأسود")} />
          <button type="button" disabled={!instruction.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
            onClick={async () => { const d = await call<{ spec: MontageSpec }>("revise", { spec: { ...spec, src: "", words: [], face: [] }, instruction }); if (d) { const urls = new Map((spec.broll ?? []).map((b) => [b.path, b.url])); setSpec({ ...d.spec, src: spec.src, words: spec.words, segments: spec.segments, face: spec.face, logo: d.spec.logo ? { ...d.spec.logo, url: spec.logo?.url ?? "" } : null, broll: (d.spec.broll ?? []).map((b) => ({ ...b, url: urls.get(b.path) ?? "" })), subs2: spec.subs2, vo: spec.vo, music: d.spec.music?.path && spec.music?.path === d.spec.music.path ? spec.music : d.spec.music }); setInstruction(""); } }}>
            {busy === "revise" ? L("جاري التعديل…") : LT(`طبّق التعديل (${editCost} ريشة)`, `Apply edit (${editCost} credits)`)}
          </button>
          <p className="text-[12px] text-subtle">{L("يعدّل العناوين والتكبير والإيموجي والانتقالات والمؤثرات والألوان والخط والبطاقات ومكان الترجمة. القصّ نفسه يبقى مثل ما هو.")}</p>
        </Card>

        <Card title={L("موسيقى خلفية")} icon="🎵">
          {tracks.length > 0 && (
            <ul className="flex flex-col gap-2">
              {tracks.map((t) => {
                const chosen = spec.music?.url === t.url;
                return (
                  <li key={t.url} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${chosen ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
                    <span className="flex flex-1 flex-col"><span className="font-semibold">{t.name}</span>{t.mood && <span className="text-[12px] text-subtle" dir="ltr">{t.mood}</span>}</span>
                    <button type="button" onClick={() => setSpec({ ...spec, music: chosen ? null : { url: t.url, name: t.name } })} className={`rounded-lg px-3.5 py-1.5 text-[14px] font-semibold ${chosen ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-white"}`}>{chosen ? L("مختارة ✓") : L("اختر")}</button>
                  </li>
                );
              })}
            </ul>
          )}
          <input value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} className="field" placeholder={L("مثال: موسيقى هادئة ملهمة خفيفة تحت الكلام")} />
          <button type="button" disabled={!musicPrompt.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
            onClick={async () => { const d = await call<{ url: string }>("music", { prompt: musicPrompt, seconds }); if (d) setSpec({ ...spec, music: { url: d.url, name: musicPrompt } }); }}>
            {busy === "music" ? L("جاري التأليف…") : LT(`✨ ألّف موسيقى (${editCost} ريشة)`, `✨ Compose music (${editCost} credits)`)}
          </button>
          {spec.music && <p className="text-[13px] text-subtle">{L("الموسيقى الحالية:")} {L(spec.music.name)} · <button type="button" className="text-red-700 underline" onClick={() => setSpec({ ...spec, music: null })}>{L("إزالة")}</button></p>}
        </Card>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}

        <button type="button" disabled={!!busy} className="btn btn-gold w-full py-4 text-[17px]"
          onClick={async () => { const d = await call<{ ok: true }>("export", { spec: { ...spec, src: "" } }); if (d) { try { localStorage.removeItem(key); } catch {} setSent(true); } }}>
          {busy === "export" ? L("جاري الإرسال…") : L("⬇️ تصدير الفيديو (MP4)")}
        </button>
      </div>
    </div>
    </>
  );
}
