"use client";
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
import { EMOJIS, MFPS, dimensions, introFrames, montageTexts, setMontageText, totalFrames, videoSeconds, type CaptionPos, type CaptionStyle, type Corner, type MontageSpec, type Transition } from "@/remotion/montage";
import { FONTS } from "@/remotion/spec";
import { Progress } from "@/components/app/Progress";

type Track = { name: string; mood?: string; url: string };

const Card = ({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) => (
  <section className="card flex flex-col gap-4 p-5">
    <h2 className="flex items-center gap-2 text-[18px] font-bold text-navy-900">{icon && <span aria-hidden>{icon}</span>}{title}</h2>
    {children}
  </section>
);
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;
const styles: [CaptionStyle, string][] = [["karaoke", "كلمة كلمة ملوّنة"], ["box", "داخل صندوق"], ["minimal", "بسيطة"]];
const positions: [CaptionPos, string][] = [["bottom", "تحت"], ["middle", "بالوسط"], ["top", "فوق"]];
const transitions: [Transition, string][] = [["none", "بدون"], ["zoom", "زووم سريع"], ["flash", "وميض أبيض"]];
const corners: [Corner, string][] = [["tl", "فوق يسار"], ["tr", "فوق يمين"], ["bl", "تحت يسار"], ["br", "تحت يمين"]];
const colorLabels = { text: "لون النص", accent: "اللون المميز", bg: "لون البطاقات" } as const;

export function MontageStudio({ jobId, initial, editCost, tracks }: { jobId: string; initial: MontageSpec; editCost: number; tracks: Track[] }) {
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
    try { const s = localStorage.getItem(key); if (s) { const d = JSON.parse(s); setSpec({ ...d, src: initial.src, logo: d.logo && initial.logo ? { ...d.logo, url: initial.logo.url } : initial.logo }); } } catch {}
  }, [key, initial.src, initial.logo]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ ...spec, src: "" })); } catch {} }, [key, spec]);

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
      if (!r.ok) throw new Error(d.error ?? "صار خطأ، حاول مرة ثانية.");
      return d as T;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }

  /** Adds a title at the moment the player is paused on. */
  function addTitle() {
    const f = player.current?.getCurrentFrame() ?? 0;
    const at = Math.max(0, Math.min(videoSeconds(spec) - 1, (f - introFrames(spec)) / MFPS));
    setSpec({ ...spec, titles: [...spec.titles, { text: "عنوان جديد", at: +at.toFixed(2), dur: 2.5, pos: "top" as const }].sort((a, b) => a.at - b.at) });
  }
  const removeTitle = (i: number) => setSpec({ ...spec, titles: spec.titles.filter((_, j) => j !== i) });
  const nowAt = () => Math.max(0, Math.min(videoSeconds(spec) - 0.5, ((player.current?.getCurrentFrame() ?? 0) - introFrames(spec)) / MFPS));
  const addEmoji = (e: string) => setSpec({ ...spec, emojis: [...(spec.emojis ?? []), { e, at: +nowAt().toFixed(2), dur: 1.5 }].sort((a, b) => a.at - b.at) });
  const removeEmoji = (i: number) => setSpec({ ...spec, emojis: (spec.emojis ?? []).filter((_, j) => j !== i) });

  if (sent) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        {render.status === "done" && render.url ? (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">✓ الفيديو جاهز</h2>
            <video src={render.url} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
            <a href={render.url} download className="btn btn-gold w-full py-3.5">⬇️ تحميل الفيديو</a>
          </>
        ) : render.status === "failed" ? (
          <p className="font-semibold text-red-800">ما نجح التصدير، ورجّعنا لك الريش. حاول مرة ثانية.</p>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">✓ تم إرسال الفيديو للمعالجة</h2>
            <Progress value={render.progress} label={render.status === "queued" && !render.progress ? "في الطابور…" : "جاري تجهيز الفيديو…"} />
            <p className="text-[14px] text-emerald-900/80">تقدر تطلع من الصفحة، وبيوصلك الفيديو في «أعمالي» أول ما يخلص.</p>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/app/works" className="btn btn-primary px-6 py-3">روح لأعمالي</Link>
          <Link href="/app/tools/video-editing" className="btn border border-line bg-white px-6 py-3">مونتاج جديد</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-900">معاينة مباشرة</h2>
          <span className="rounded-full bg-tint px-3 py-1 text-[13px] text-subtle">{seconds} ثانية</span>
        </div>
        <div dir="ltr" className="mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg" style={{ maxWidth: spec.aspect === "9:16" ? 380 : "100%" }}>
          {mounted ? (
            <Player ref={player} component={MontageVideo} inputProps={spec} durationInFrames={totalFrames(spec)} fps={MFPS}
              compositionWidth={width} compositionHeight={height} style={{ width: "100%" }} controls acknowledgeRemotionLicense />
          ) : <div style={{ aspectRatio: `${width} / ${height}` }} />}
        </div>
        <p className="text-center text-[13px] text-subtle">شاهين قصّ الفيديو وحط الهوك والعناوين. عدّل اللي تبيه وشوف التغيير على طول.</p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card title="الترجمة" icon="💬">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <span className="font-semibold">إظهار الترجمة على الفيديو</span>
            <input type="checkbox" checked={spec.captions.on} onChange={(e) => setSpec({ ...spec, captions: { ...spec.captions, on: e.target.checked } })} className="h-5 w-5" />
          </label>
          {spec.captions.on && <>
            <Sub>مكان الترجمة</Sub>
            <div className="flex flex-wrap gap-2">{positions.map(([p, l]) => <button key={p} type="button" aria-pressed={(spec.captions.pos ?? "bottom") === p} onClick={() => setSpec({ ...spec, captions: { ...spec.captions, pos: p } })} className="chip">{l}</button>)}</div>
            <Sub>شكل الترجمة</Sub>
          </>}
          {spec.captions.on && <div className="flex flex-wrap gap-2">{styles.map(([s, l]) => <button key={s} type="button" aria-pressed={spec.captions.style === s} onClick={() => setSpec({ ...spec, captions: { ...spec.captions, style: s } })} className="chip">{l}</button>)}</div>}
        </Card>

        <Card title="تعديلات سريعة" icon="✏️">
          <Sub>الألوان</Sub>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(Object.keys(colorLabels) as (keyof typeof colorLabels)[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                {colorLabels[k]}
                <input type="color" value={spec.colors[k]} onChange={(e) => setSpec({ ...spec, colors: { ...spec.colors, [k]: e.target.value } })} aria-label={colorLabels[k]} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
              </label>
            ))}
          </div>

          <Sub>النصوص</Sub>
          <div className="flex flex-col gap-2.5">
            {texts.map((f) => (
              <div key={f.key} className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[12px] text-subtle">{f.label}</span>
                  <input value={f.value} onChange={(e) => setSpec(setMontageText(spec, f.key, e.target.value))} className="field" />
                </label>
                {f.key.startsWith("titles.") && <button type="button" onClick={() => removeTitle(Number(f.key.split(".")[1]))} aria-label={`حذف ${f.label}`} className="mb-1 rounded-lg px-3 py-2 text-red-700 hover:bg-red-50">حذف</button>}
              </div>
            ))}
            <button type="button" onClick={addTitle} className="btn border border-dashed border-field bg-white py-2.5 text-[14px]">＋ أضف عنوان متحرك عند اللحظة اللي واقف عليها بالفيديو</button>
          </div>

          <Sub>البداية والنهاية</Sub>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={spec.intro.on} onClick={() => setSpec({ ...spec, intro: { ...spec.intro, on: !spec.intro.on, title: spec.intro.title || "اسم نشاطك" } })} className="chip">بطاقة البداية</button>
            <button type="button" aria-pressed={spec.outro.on} onClick={() => setSpec({ ...spec, outro: { ...spec.outro, on: !spec.outro.on, title: spec.outro.title || "تابعنا للمزيد" } })} className="chip">بطاقة النهاية</button>
          </div>

          <Sub>الخط</Sub>
          <div className="flex flex-wrap gap-2">
            {FONTS.map((f) => (
              <button key={f.id} type="button" aria-pressed={spec.font === f.id} onClick={() => setSpec({ ...spec, font: f.id })} style={{ fontFamily: f.id }}
                className={`rounded-xl border px-4 py-2 text-[16px] ${spec.font === f.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`}>{f.label}</button>
            ))}
          </div>
        </Card>

        <Card title="لمسات احترافية" icon="🎬">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">🔊 مؤثرات صوتية</span>
              <input type="checkbox" checked={!!spec.sfx} onChange={(e) => setSpec({ ...spec, sfx: e.target.checked })} className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <span className="font-semibold">📊 شريط تقدّم فوق</span>
              <input type="checkbox" checked={!!spec.progress} onChange={(e) => setSpec({ ...spec, progress: e.target.checked })} className="h-5 w-5" />
            </label>
          </div>

          <Sub>الانتقال عند كل قطع</Sub>
          <div className="flex flex-wrap gap-2">{transitions.map(([v, l]) => <button key={v} type="button" aria-pressed={(spec.transition ?? "none") === v} onClick={() => setSpec({ ...spec, transition: v })} className="chip">{l}</button>)}</div>

          <Sub>شعار نشاطك</Sub>
          {spec.logo ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <span className="font-semibold">إظهار الشعار بالزاوية</span>
                <input type="checkbox" checked={spec.logo.on} onChange={(e) => setSpec({ ...spec, logo: { ...spec.logo!, on: e.target.checked } })} className="h-5 w-5" />
              </label>
              {spec.logo.on && <div className="flex flex-wrap gap-2">{corners.map(([c, l]) => <button key={c} type="button" aria-pressed={spec.logo!.pos === c} onClick={() => setSpec({ ...spec, logo: { ...spec.logo!, pos: c } })} className="chip">{l}</button>)}</div>}
            </>
          ) : <p className="text-[13px] text-subtle">ارفع شعارك من <Link href="/app/brand" className="font-semibold text-navy-700 underline">هويتي التجارية</Link> وبيطلع بالمونتاجات الجاية.</p>}

          <Sub>إيموجي</Sub>
          {(spec.emojis ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {(spec.emojis ?? []).map((x, i) => (
                <li key={i} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pe-1 ps-3 text-[14px]">
                  <span className="text-[18px]">{x.e}</span><span className="text-subtle" dir="ltr">{x.at.toFixed(1)}s</span>
                  <button type="button" onClick={() => removeEmoji(i)} aria-label={`حذف ${x.e}`} className="rounded-full px-2 text-red-700 hover:bg-red-50">×</button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] text-subtle">وقّف الفيديو عند اللحظة اللي تبيها، واضغط على إيموجي لإضافته.</p>
          <div className="flex flex-wrap gap-1.5">{EMOJIS.map((e) => <button key={e} type="button" onClick={() => addEmoji(e)} aria-label={`أضف ${e}`} className="rounded-xl border border-line bg-white px-2.5 py-1.5 text-[20px] hover:border-gold-500">{e}</button>)}</div>
        </Card>

        <Card title="تعديل متقدّم (بالوصف)" icon="✨">
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} className="field" placeholder="مثال: زيد عناوين للأفكار الأساسية، وكبّر أكثر على الجمل القوية، وخلّ الألوان أحمر وأسود" />
          <button type="button" disabled={!instruction.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
            onClick={async () => { const d = await call<{ spec: MontageSpec }>("revise", { spec: { ...spec, src: "", words: [] }, instruction }); if (d) { setSpec({ ...d.spec, src: spec.src, words: spec.words, segments: spec.segments, logo: d.spec.logo ? { ...d.spec.logo, url: spec.logo?.url ?? "" } : null }); setInstruction(""); } }}>
            {busy === "revise" ? "جاري التعديل…" : `طبّق التعديل (${editCost} ريشة)`}
          </button>
          <p className="text-[12px] text-subtle">يعدّل العناوين والتكبير والإيموجي والانتقالات والمؤثرات والألوان والخط والبطاقات ومكان الترجمة. القصّ نفسه يبقى مثل ما هو.</p>
        </Card>

        <Card title="موسيقى خلفية" icon="🎵">
          {tracks.length > 0 && (
            <ul className="flex flex-col gap-2">
              {tracks.map((t) => {
                const chosen = spec.music?.url === t.url;
                return (
                  <li key={t.url} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${chosen ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
                    <span className="flex flex-1 flex-col"><span className="font-semibold">{t.name}</span>{t.mood && <span className="text-[12px] text-subtle" dir="ltr">{t.mood}</span>}</span>
                    <button type="button" onClick={() => setSpec({ ...spec, music: chosen ? null : { url: t.url, name: t.name } })} className={`rounded-lg px-3.5 py-1.5 text-[14px] font-semibold ${chosen ? "bg-gold-500 text-navy-900" : "bg-navy-800 text-white"}`}>{chosen ? "مختارة ✓" : "اختر"}</button>
                  </li>
                );
              })}
            </ul>
          )}
          <input value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} className="field" placeholder="مثال: موسيقى هادئة ملهمة خفيفة تحت الكلام" />
          <button type="button" disabled={!musicPrompt.trim() || !!busy} className="btn btn-primary self-start px-5 py-2.5"
            onClick={async () => { const d = await call<{ url: string }>("music", { prompt: musicPrompt, seconds }); if (d) setSpec({ ...spec, music: { url: d.url, name: musicPrompt } }); }}>
            {busy === "music" ? "جاري التأليف…" : `✨ ألّف موسيقى (${editCost} ريشة)`}
          </button>
          {spec.music && <p className="text-[13px] text-subtle">الموسيقى الحالية: {spec.music.name} · <button type="button" className="text-red-700 underline" onClick={() => setSpec({ ...spec, music: null })}>إزالة</button></p>}
        </Card>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}

        <button type="button" disabled={!!busy} className="btn btn-gold w-full py-4 text-[17px]"
          onClick={async () => { const d = await call<{ ok: true }>("export", { spec: { ...spec, src: "" } }); if (d) { try { localStorage.removeItem(key); } catch {} setSent(true); } }}>
          {busy === "export" ? "جاري الإرسال…" : "⬇️ تصدير الفيديو (MP4)"}
        </button>
      </div>
    </div>
  );
}
