"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyEdits, applyEls, applyFont, applyLogo, currentFont, extractColors, extractTexts } from "@/lib/htmlKit";
import { withClock } from "@/lib/gemClock";
import { fontCssFor } from "@/lib/iframeFonts";
import { LogoDrag, LogoSize, type LogoBox } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { uploadImage } from "@/components/app/DesignStart";
import { FontPicker } from "./FontPicker";
import { RetentionNote } from "@/components/app/RetentionNote";

type El = { hide?: boolean; s: number; x: number; y: number };
export type PostData = {
  status: "done"; title: string; aspect: string; editCost: number; slides: number; htmlUrl: string; savesLeft: number;
  images: { url: string; download: string }[];
  edits: { texts: Record<string, string>; hex: Record<string, string>; font: string | null; els: ({ sel: string } & El)[] } | null;
  logo: { path: string; url: string; box: LogoBox } | null;
};
/** the page is laid out in these CSS sizes and drawn at full resolution by the video worker (same rule as worker/postflow.mjs → cssSize) */
const CSS_SIZE: Record<string, [number, number]> = { "4:5": [432, 540], "1:1": [540, 540], "9:16": [432, 768], "16:9": [960, 540] };
/** a still post never needs code: scripts and inline handlers are dropped before the page is shown (the worker does the same before drawing) */
const noScripts = (h: string) => h.replace(/<script\b[\s\S]*?<\/script\s*>/gi, "").replace(/<script\b[^>]*>/gi, "").replace(/\son[a-z]{3,20}\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/javascript\s*:/gi, "");
const slideCss = (i: number, W: number, H: number) => `<style>html,body{margin:0!important;padding:0!important;width:${W}px!important;height:${H}px!important;overflow:hidden!important;background:#fff}section.slide:not([data-slide="${i}"]){display:none!important}section.slide[data-slide="${i}"]{position:fixed!important;left:0!important;top:0!important;width:${W}px!important;height:${H}px!important;margin:0!important}*,*::before,*::after{animation:none!important;transition:none!important}</style>`;
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[15px] font-bold text-navy-900">{children}</h3>;

/** «استوديو البوست المبتكر»: edit the texts, colours and font, put / move the logo, move / resize / hide any element by hand. Saving is free: the same design is drawn again. */
export function PostStudio({ jobId, data, balance, onQueued, onNew }: { jobId: string; data: PostData; balance: number; onQueued: (job: string) => void; onNew: () => void }) {
  const [PW, PH] = CSS_SIZE[data.aspect] ?? CSS_SIZE["4:5"];
  const iframe = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [raw, setRaw] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [hex, setHex] = useState<Record<string, string>>({});
  const [font, setFont] = useState("Cairo");
  const [els, setEls] = useState<Record<string, El>>({});
  const [logo, setLogo] = useState<{ path: string; url: string; box: LogoBox } | null>(data.logo);
  const [logoData, setLogoData] = useState<{ url: string; src: string } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [slide, setSlide] = useState(1);
  const [pick, setPick] = useState(false);
  const [selEl, setSelEl] = useState<{ sel: string; text: string } | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [front, setFront] = useState(0); // the page on screen; a newer one loads behind it and takes its place when ready
  const [pages, setPages] = useState<{ rev: number; html: string }[]>([]);
  const [fontCss, setFontCss] = useState<Record<string, string>>({});
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const touch = () => setDirty(true);

  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); setCw(el.clientWidth); return () => ro.disconnect(); }, []);
  useEffect(() => {
    let dead = false;
    if (!data.htmlUrl) { setLoadErr(true); return; }
    fetch(data.htmlUrl).then((r) => (r.ok ? r.text() : Promise.reject())).then((x) => { if (!dead) setRaw(applyLogo(noScripts(x), null)); }).catch(() => { if (!dead) setLoadErr(true); });
    return () => { dead = true; };
  }, [data.htmlUrl]);
  const fields = useMemo(() => (raw ? extractTexts(raw, 200) : []), [raw]);
  // the texts of the slide on screen only (editing a text of another slide would change nothing you can see)
  const slideFields = useMemo(() => {
    if (!raw || data.slides <= 1) return fields;
    const starts = [...raw.matchAll(/<section\b[^>]*\bdata-slide\s*=\s*["']?(\d{1,2})/gi)].map((m) => ({ n: Number(m[1]), at: m.index ?? 0 })).sort((a, b) => a.at - b.at);
    const i = starts.findIndex((x) => x.n === slide);
    if (i < 0) return fields;
    const here = new Set(extractTexts(raw.slice(starts[i].at, starts[i + 1]?.at ?? raw.length), 200).map((f) => f.value));
    return fields.filter((f) => here.has(f.value));
  }, [raw, fields, slide, data.slides]);
  const colors = useMemo(() => (raw ? extractColors(raw) : []), [raw]);
  // start from the design as it was last saved (texts, colours, font, moved elements)
  useEffect(() => {
    if (!raw) return;
    const e = data.edits;
    setVals(Object.fromEntries(fields.map((f) => [f.key, typeof e?.texts?.[f.key] === "string" ? e.texts[f.key] : f.value])));
    setHex(Object.fromEntries(colors.map((c) => [c, /^#[0-9a-f]{6}$/i.test(String(e?.hex?.[c])) ? String(e!.hex[c]) : c])));
    setFont(e?.font || currentFont(raw));
    setEls(Object.fromEntries((e?.els ?? []).map((x) => [x.sel, { hide: x.hide, s: x.s ?? 1, x: x.x ?? 0, y: x.y ?? 0 }])));
  }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { let dead = false; fontCssFor(font).then((css) => { if (!dead && css) setFontCss((p) => (p[font] === css ? p : { ...p, [font]: css })); }); return () => { dead = true; }; }, [font]);
  // the sealed preview cannot open a signed link, so it gets the logo picture itself (data:)
  useEffect(() => {
    if (!logo?.url || logo.url.startsWith("data:") || logoData?.url === logo.url) return;
    let dead = false;
    fetch(logo.url).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => new Promise<string>((ok, no) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.onerror = () => no(f.error); f.readAsDataURL(b); }))
      .then((d) => { if (!dead) setLogoData({ url: logo.url, src: d }); }).catch(() => {});
    return () => { dead = true; };
  }, [logo?.url, logoData?.url]);
  const logoSrc = logo ? (logo.url.startsWith("data:") ? logo.url : logoData?.url === logo.url ? logoData.src : "") : "";
  const elList = useMemo(() => Object.entries(els).filter(([, e]) => e.hide || e.s !== 1 || e.x !== 0 || e.y !== 0).map(([sel, e]) => ({ sel, ...e })), [els]);

  // live page: every edit rebuilds it after a short pause
  useEffect(() => {
    if (raw === null) return;
    const id = setTimeout(() => {
      try {
        let p = applyEdits(raw, { texts: vals, hex });
        p = applyFont(p, font);
        p = applyEls(p, elList);
        p = applyLogo(p, logo && logoSrc ? { src: logoSrc, ...logo.box } : null);
        const extra = (fontCss[font] ? `<style>${fontCss[font]}</style>` : "") + slideCss(slide, PW, PH);
        setDoc(/<\/head>/i.test(p) ? p.replace(/<\/head>/i, extra + "</head>") : extra + p); setRev((x) => x + 1);
      } catch { setError(L("تعذّر تطبيق التعديل")); }
    }, 180);
    return () => clearTimeout(id);
  }, [raw, vals, hex, font, logo, logoSrc, fontCss, elList, slide, PW, PH]);
  useEffect(() => { if (doc) setPages((p) => [...p.filter((x) => x.rev === front), { rev, html: withClock(doc, 0, false, 1) }].slice(-2)); }, [doc, rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = (r: number, el: HTMLIFrameElement | null) => { if (r === (front || pages[0]?.rev)) iframe.current = el ?? iframe.current; };
  const ready = (r: number, el: HTMLIFrameElement) => { if (r < front) return; iframe.current = el; setFront(r); setPages((p) => p.filter((x) => x.rev >= r)); setTimeout(() => sendPickRef.current(), 0); };

  // choosing and dragging an element inside the sealed preview
  const pickRef = useRef({ pick, els, sel: selEl?.sel ?? "" }); pickRef.current = { pick, els, sel: selEl?.sel ?? "" };
  const sendPick = useCallback(() => { const p = pickRef.current; iframe.current?.contentWindow?.postMessage({ type: "pick", on: p.pick, sel: p.sel, bases: Object.fromEntries(Object.entries(p.els).map(([k, e]) => [k, { x: e.x, y: e.y }])) }, "*"); }, []);
  const sendPickRef = useRef(sendPick); sendPickRef.current = sendPick;
  useEffect(() => { sendPick(); }, [pick, selEl?.sel, sendPick]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      const m = (e.data ?? {}) as { type?: string; sel?: string; text?: string; x?: number; y?: number };
      if (!m || typeof m !== "object") return;
      if (m.type === "ready") { sendPick(); return; }
      if (m.type === "picked" && typeof m.sel === "string") { setSelEl({ sel: m.sel, text: String(m.text ?? "") }); return; }
      if (m.type === "moved" && typeof m.sel === "string") { const k = m.sel, x = Math.round(Number(m.x) || 0), y = Math.round(Number(m.y) || 0); setEls((p) => ({ ...p, [k]: { ...(p[k] ?? { s: 1 }), x, y } })); touch(); }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [sendPick]);
  const editEl = (fn: (e: El) => El) => { if (selEl) { setEls((p) => ({ ...p, [selEl.sel]: fn(p[selEl.sel] ?? { s: 1, x: 0, y: 0 }) })); touch(); } };

  async function uploadLogo(f: File) {
    setBusy(true); setError("");
    try { const u = await uploadImage(f); setLogo({ path: u.path, url: u.preview, box: logo?.box ?? { x: 0.14, y: 0.09, w: 0.18 } }); touch(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function post(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/free-post", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jobId) throw new Error(d.error || "تعذّر إرسال الطلب.");
      setDirty(false); setInstruction("");
      onQueued(String(d.jobId));
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر إرسال الطلب."); }
    finally { setBusy(false); }
  }
  const save = () => post({ from: jobId, apply: { texts: vals, hex, font, els: elList, logo: logo ? { on: true, path: logo.path, box: logo.box } : { on: false } } });
  const scale = cw ? cw / PW : 0.3;

  return (
    <div className="flex flex-col gap-5">
      {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); uploadLogo(f); }} />}
      <div className={`grid grid-cols-1 gap-6 lg:items-start ${data.aspect === "16:9" ? "lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]"}`}>
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          {data.slides > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={L("الشرائح")}>
              {Array.from({ length: data.slides }, (_, i) => <button key={i} type="button" aria-pressed={slide === i + 1} onClick={() => { setSlide(i + 1); setSelEl(null); }} className="chip">{LT(`شريحة ${i + 1}`, `Slide ${i + 1}`)}</button>)}
            </div>
          )}
          <div ref={box} dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lg" style={{ aspectRatio: `${PW} / ${PH}` }}>
            {pages.length && !loadErr ? <>
              {pages.map((pg) => <iframe key={pg.rev} ref={(el) => shown(pg.rev, el)} onLoad={(e) => ready(pg.rev, e.currentTarget)} title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={pg.html} className="absolute left-0 top-0 border-0" style={{ width: PW, height: PH, transform: `scale(${scale})`, transformOrigin: "0 0", zIndex: pg.rev === (front || pages[0].rev) ? 2 : 1, visibility: pg.rev === (front || pages[0].rev) || pages.length === 1 ? "visible" : "hidden" }} />)}
              {logo && !pick && <div className="absolute inset-0 z-10"><LogoDrag box={logo.box} onChange={(b) => { setLogo((p) => (p ? { ...p, box: b } : p)); touch(); }} /></div>}
            </> : <div className="grid h-full place-items-center p-6 text-center text-[14px] text-subtle">{loadErr ? L("تعذّر تحميل المعاينة. حدّث الصفحة.") : L("جاري تجهيز المعاينة…")}</div>}
          </div>
          <div className={`rounded-2xl border p-3 ${pick ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" aria-pressed={pick} onClick={() => { if (pick) setSelEl(null); setPick(!pick); }} className={`btn px-4 py-2 text-[14px] ${pick ? "btn-gold" : "btn-outline"}`}>{pick ? L("✓ خلصت تحريك العناصر") : L("✋ حرّك أو كبّر أو امسح عنصر")}</button>
              {elList.length > 0 && <button type="button" className="text-[13px] text-red-700 underline" onClick={() => { setEls({}); setSelEl(null); touch(); }}>{L("رجّع كل العناصر لأصلها")} ({elList.length})</button>}
            </div>
            {pick && (
              <div className="mt-3 flex flex-col gap-2">
                {!selEl ? <p className="text-[13px] text-subtle">{L("اضغط على أي نص أو شكل داخل التصميم لتحديده، واسحبه بالماوس أو الإصبع لتغيير مكانه.")}</p> : (
                  <>
                    <p className="truncate text-[13px] text-navy-900">{L("العنصر المحدد")}: <b>{selEl.text || L("شكل بدون نص")}</b> · {Math.round((els[selEl.sel] ?? { s: 1 }).s * 100)}%</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="chip" onClick={() => editEl((e) => ({ ...e, s: Math.min(3, +(e.s + 0.1).toFixed(2)) }))}>{L("➕ كبّر")}</button>
                      <button type="button" className="chip" onClick={() => editEl((e) => ({ ...e, s: Math.max(0.3, +(e.s - 0.1).toFixed(2)) }))}>{L("➖ صغّر")}</button>
                      <button type="button" className="chip" onClick={() => editEl((e) => ({ ...e, hide: !e.hide }))}>{(els[selEl.sel] ?? { s: 1, x: 0, y: 0 }).hide ? L("👁 رجّعه") : L("🗑 امسحه")}</button>
                      <button type="button" className="chip" disabled={selEl.sel.split(" > ").length <= 2} onClick={() => setSelEl({ sel: selEl.sel.split(" > ").slice(0, -1).join(" > "), text: "" })}>{L("⬆ حدّد المجموعة الأكبر")}</button>
                      <button type="button" className="chip" onClick={() => editEl(() => ({ s: 1, x: 0, y: 0 }))}>{L("↺ أصله")}</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
          <button type="button" disabled={busy || !dirty || data.savesLeft <= 0} onClick={save} className="btn btn-gold w-full py-3.5 disabled:opacity-50">{busy ? L("جاري الإرسال…") : dirty ? L("💾 احفظ التعديلات وحدّث الصور (مجاناً)") : L("ما في تعديلات جديدة")}</button>
          <p className="text-center text-[12.5px] leading-6 text-subtle">{L("المعاينة فورية. الحفظ يرسم الصور النهائية من جديد بدقة كاملة، وياخذ أقل من دقيقة.")}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section className="card flex flex-col gap-3 p-5">
            <Sub>{L("النصوص")}</Sub>
            {data.slides > 1 && <p className="text-[12.5px] text-subtle">{LT(`نصوص الشريحة ${slide}. بدّل الشريحة من فوق المعاينة لتعديل غيرها.`, `Texts of slide ${slide}. Switch slides above the preview to edit the others.`)}</p>}
            {slideFields.length === 0 && <p className="text-[13px] text-subtle">{L("ما لقينا نصوص قابلة للتعديل.")}</p>}
            {slideFields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                {(vals[f.key] ?? f.value).length > 60
                  ? <textarea value={vals[f.key] ?? ""} maxLength={300} rows={2} onChange={(e) => { setVals((p) => ({ ...p, [f.key]: e.target.value })); touch(); }} className="field" aria-label={f.label} />
                  : <input value={vals[f.key] ?? ""} maxLength={300} onChange={(e) => { setVals((p) => ({ ...p, [f.key]: e.target.value })); touch(); }} className="field" aria-label={f.label} />}
              </div>
            ))}
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <Sub>{L("الألوان")}</Sub>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => (
                <label key={c} className="flex items-center gap-2 rounded-xl border border-line px-2 py-1.5 text-[12px] text-subtle" dir="ltr">
                  <input type="color" value={hex[c] ?? c} onChange={(e) => { setHex((p) => ({ ...p, [c]: e.target.value })); touch(); }} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={`${L("لون")} ${c}`} />
                  {(hex[c] ?? c).toUpperCase()}
                </label>
              ))}
            </div>
            {colors.some((c) => (hex[c] ?? c).toLowerCase() !== c) && <button type="button" className="w-fit text-[13px] font-semibold text-navy-700 underline" onClick={() => { setHex(Object.fromEntries(colors.map((c) => [c, c]))); touch(); }}>{L("رجّع الألوان الأصلية")}</button>}
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <Sub>{L("الخط")}</Sub>
            <FontPicker value={font} onChange={(id) => { setFont(id); touch(); }} />
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <Sub>{L("الشعار")}</Sub>
            <div className="flex flex-wrap items-center gap-2">
              <label className="btn btn-outline cursor-pointer px-4 py-2 text-[14px]">{logo ? L("غيّر الشعار") : L("ارفع شعارك")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setCropFile(f); }} /></label>
              {logo && <button type="button" className="btn btn-outline px-4 py-2 text-[14px] text-red-700" onClick={() => { setLogo(null); touch(); }}>{L("شيل الشعار")}</button>}
            </div>
            {logo ? <>
              <LogoSize box={logo.box} onChange={(b) => { setLogo((p) => (p ? { ...p, box: b } : p)); touch(); }} />
              <p className="text-[12.5px] leading-6 text-subtle">{L("اسحب الشعار داخل المعاينة لتغيير مكانه (لما يكون زر تحريك العناصر مطفي). الشعار يظهر بنفس المكان بكل الشرائح.")}</p>
            </> : <p className="text-[12.5px] text-subtle">{L("PNG بخلفية شفافة يطلع أحلى.")}</p>}
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <Sub>{L("عدّل بالكلام (بالذكاء الاصطناعي)")}</Sub>
            <p className="text-[13px] leading-6 text-subtle">{L("للتغييرات الكبيرة اللي ما تنعمل باليد (غيّر التكوين، أضف رسمة، خل الأسلوب أفخم). يطلع تصميم جديد والأصلي يبقى.")}</p>
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={600} rows={3} className="field" placeholder={L("اكتب التعديل هنا…")} />
            {dirty && <p className="text-[12.5px] text-red-700">{L("عندك تعديلات يدوية ما انحفظت. احفظها أول عشان تدخل في التصميم الجديد.")}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy || instruction.trim().length < 3 || balance < data.editCost} onClick={() => post({ from: jobId, instruction })} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">{LT(`✨ عدّل بالذكاء الاصطناعي (${data.editCost} ريشة)`, `✨ AI edit (${data.editCost} credits)`)}</button>
              <button type="button" onClick={onNew} className="btn btn-outline px-5 py-2.5">{L("تصميم جديد")}</button>
            </div>
            {balance < data.editCost && <p className="text-[12.5px] text-subtle">{L("رصيدك ما يكفي للتعديل.")}</p>}
          </section>
        </div>
      </div>

      <section className="card flex flex-col gap-3 p-5">
        <Sub>{L("الصور الجاهزة للتحميل")}</Sub>
        {dirty && <p className="text-[13px] text-red-700">{L("هذي الصور قبل تعديلاتك الأخيرة. اضغط «احفظ التعديلات» لتحديثها.")}</p>}
        <div className={`grid gap-4 ${data.images.length > 1 ? "grid-cols-2 md:grid-cols-4" : "max-w-xs"}`}>
          {data.images.map((im, i) => (
            <figure key={i} className="overflow-hidden rounded-xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="w-full" />
              <a href={im.download} download className="btn btn-primary m-2 block py-2 text-center text-[13px]">⬇️ {data.images.length > 1 ? LT(`الشريحة ${i + 1}`, `Slide ${i + 1}`) : L("تحميل")}</a>
            </figure>
          ))}
        </div>
        <RetentionNote />
      </section>
    </div>
  );
}
