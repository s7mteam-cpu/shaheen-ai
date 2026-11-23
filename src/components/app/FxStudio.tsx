"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { withClock } from "@/lib/gemClock";
import { fontCssFor } from "@/lib/iframeFonts";
import { applyEdits, applyEls, extractColors, extractTexts, type ElEdit } from "@/lib/htmlKit";
import { captionLayer, withCaps, injectPhotos, FX_EMPTY, FX_FILLER, type FxWord } from "@/lib/fxCaps";

type Page = { a: number; b: number; html: string; els: ElEdit[] };
type Data = { title: string; aspect: string; seconds: number; srcUrl: string; pages: Page[]; words: FxWord[]; captions: boolean; accent: string; editCost: number; photos?: Record<string, string> };
type ElMap = Record<string, { s: number; x: number; y: number; hide?: boolean }>;
const SIZES: Record<string, [number, number]> = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const TABS = [["els", "🖐️", "العناصر"], ["texts", "✏️", "النصوص"], ["colors", "🎨", "الألوان"], ["caps", "💬", "الترجمة"], ["ask", "✨", "عدّل بالوصف"]] as const;

/** «استوديو المونتاج المبتكر»: the customer's own video plays under the saved graphics pages; he moves, resizes or removes any element, rewrites texts, changes colours, corrects the caption words, or asks for a change in words. Exporting makes a new video (a new job); the original montage stays. */
export function FxStudio({ jobId, balance }: { jobId: string; balance: number }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [texts, setTexts] = useState<Record<number, Record<string, string>>>({});
  const [hex, setHex] = useState<Record<string, string>>({});
  const [els, setEls] = useState<Record<number, ElMap>>({});
  const [wordEdits, setWordEdits] = useState<Record<number, string>>({});
  const [captions, setCaptions] = useState(true);
  const [ask, setAsk] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("els");
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pick, setPick] = useState(false);
  const [selEl, setSelEl] = useState<{ sel: string; text: string } | null>(null);
  const [fontCss, setFontCss] = useState("");
  const [doc, setDoc] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(0);
  const [rev, setRev] = useState(0);
  const [cw, setCw] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [dirty, setDirty] = useState(false);
  const video = useRef<HTMLVideoElement>(null), iframe = useRef<HTMLIFrameElement>(null), box = useRef<HTMLDivElement>(null);
  const ready = useRef(false), sent = useRef(0), idxRef = useRef(0), lastOpen = useRef(0), tShown = useRef(0);

  useEffect(() => {
    let dead = false;
    fetch(`/api/free-montage?job=${jobId}&studio=1`, { cache: "no-store" }).then(async (r) => {
      const d = await r.json().catch(() => null);
      if (dead) return;
      if (!r.ok || d?.status !== "studio") { setLoadErr(L(d?.error ?? "تعذّر فتح الاستوديو.")); return; }
      setData(d as Data); setCaptions(d.captions !== false);
      setEls(Object.fromEntries((d.pages as Page[]).map((p, i) => [i, Object.fromEntries((p.els ?? []).map((e) => [e.sel, { s: e.s ?? 1, x: e.x ?? 0, y: e.y ?? 0, hide: !!e.hide }]))])));
    }).catch(() => { if (!dead) setLoadErr(L("تعذّر فتح الاستوديو.")); });
    fontCssFor("Cairo").then((css) => { if (!dead && css) setFontCss(css); });
    return () => { dead = true; };
  }, [jobId]);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setCw(el.clientWidth)); ro.observe(el); setCw(el.clientWidth); return () => ro.disconnect(); }, [data]);

  const [VW, VH] = SIZES[data?.aspect ?? "9:16"] ?? SIZES["9:16"];
  const PW = VH > VW ? 432 : VH === VW ? 540 : 960, PH = Math.round(VH / (VW / PW)); // the recorder's own layout size: element moves are saved in these pixels
  const tall = (data?.aspect ?? "9:16") !== "16:9";
  const seconds = data?.seconds ?? 1;
  const pages = useMemo(() => data?.pages ?? [], [data]);
  const words = useMemo(() => (data?.words ?? []).map((w, i) => (typeof wordEdits[i] === "string" ? { ...w, t: wordEdits[i] } : w)), [data, wordEdits]);
  const chunkAt = useCallback((sec: number) => { const i = pages.findIndex((p) => sec >= p.a && sec < p.b); return i >= 0 ? i : Math.max(0, pages.length - 1); }, [pages]);
  const page = pages[idx];
  const elList = useCallback((i: number): ElEdit[] => Object.entries(els[i] ?? {}).map(([sel, e]) => ({ sel, ...e })), [els]);

  // the page of the current piece with every edit on it (rebuilt a moment after the last change)
  useEffect(() => {
    if (!page) return;
    const id = setTimeout(() => {
      let p = page.html || FX_EMPTY;
      try { p = applyEdits(p, { texts: texts[idx] ?? {}, hex }); p = applyEls(p, elList(idx)); } catch { /* keep the page as it is */ }
      p = injectPhotos(p, data?.photos);
      p = withCaps(p, captions ? captionLayer(words, page.a, page.b, { tall, accent: data?.accent }) : "");
      const extra = `<style>${fontCss}html,body{margin:0;overflow:hidden;background:transparent!important}</style>`;
      const cur = Math.min(video.current?.currentTime ?? 0, seconds - 0.01);
      ready.current = false; sent.current = cur; lastOpen.current = Date.now();
      setStartAt(Math.max(0, cur - page.a));
      setDoc(/<head[^>]*>/i.test(p) ? p.replace(/<head[^>]*>/i, (m) => m + extra) : extra + p); setRev((x) => x + 1);
    }, 350);
    return () => clearTimeout(id);
  }, [page, idx, texts, hex, elList, captions, words, tall, fontCss, data?.accent, data?.photos, seconds]);
  const srcDoc = useMemo(() => (doc && page ? withClock(doc, startAt, false, Math.max(1, page.b - page.a)) : null), [doc, startAt, page]);

  const pickRef = useRef({ pick, sel: selEl?.sel ?? null as string | null, bases: {} as Record<string, { x: number; y: number }> });
  pickRef.current = { pick, sel: selEl?.sel ?? null, bases: Object.fromEntries(Object.entries(els[idx] ?? {}).map(([k, e]) => [k, { x: e.x, y: e.y }])) };
  const sendPick = useCallback(() => { const p = pickRef.current; iframe.current?.contentWindow?.postMessage({ type: "pick", on: p.pick, sel: p.sel, bases: p.bases }, "*"); }, []);
  useEffect(() => { sendPick(); }, [pick, selEl, sendPick]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      const m = (e.data ?? {}) as { type?: string; sel?: string; text?: string; x?: number; y?: number };
      if (m.type === "ready") { ready.current = true; sendPick(); return; }
      if (m.type === "picked" && typeof m.sel === "string") { setSelEl({ sel: m.sel, text: String(m.text ?? "") }); return; }
      if (m.type === "moved" && typeof m.sel === "string") { const k = m.sel, x = Math.round(Number(m.x) || 0), y = Math.round(Number(m.y) || 0), i = idxRef.current; setEls((p) => ({ ...p, [i]: { ...(p[i] ?? {}), [k]: { ...(p[i]?.[k] ?? { s: 1 }), x, y } } })); setDirty(true); }
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [sendPick]);

  // the customer's video is the clock: the graphics page is stepped to the video's own second on every frame
  useEffect(() => {
    if (!pages.length) return;
    let raf = 0;
    const tick = () => {
      const v = video.current;
      if (v) {
        const cur = Math.min(v.currentTime, seconds - 0.01), i = chunkAt(cur);
        if (i !== idxRef.current || cur < sent.current - 0.08) { // another piece, or the customer went back: the page is opened again at that second
          if (Date.now() - lastOpen.current > 250) { lastOpen.current = Date.now(); ready.current = false; sent.current = cur; if (i !== idxRef.current) { idxRef.current = i; setIdx(i); setSelEl(null); } else { setStartAt(Math.max(0, cur - pages[i].a)); setRev((x) => x + 1); } }
        } else if (ready.current && cur > sent.current + 0.001) { iframe.current?.contentWindow?.postMessage({ type: "to", t: cur - pages[i].a }, "*"); sent.current = cur; }
        if (Math.abs(cur - tShown.current) > 0.05) { tShown.current = cur; setT(cur); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pages, seconds, chunkAt]);

  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) { setPick(false); void v.play(); } else v.pause(); };
  const seek = (sec: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(seconds - 0.05, sec)); };
  const setEl = (fn: (e: { s: number; x: number; y: number; hide?: boolean }) => { s: number; x: number; y: number; hide?: boolean } | null) => {
    if (!selEl) return;
    const k = selEl.sel;
    setEls((p) => { const cur = { ...(p[idx] ?? {}) }, next = fn(cur[k] ?? { s: 1, x: 0, y: 0 }); if (next) cur[k] = next; else delete cur[k]; return { ...p, [idx]: cur }; });
    setDirty(true);
  };

  const fields = useMemo(() => (page?.html ? extractTexts(page.html, 60) : []), [page]);
  const colors = useMemo(() => { const n = new Map<string, number>(); for (const p of pages) for (const [i, c] of extractColors(p.html || "", 8).entries()) n.set(c, (n.get(c) ?? 0) + (8 - i)); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c); }, [pages]);
  const capWords = useMemo(() => (data?.words ?? []).map((w, i) => ({ w, i })).filter(({ w }) => page && w.s >= page.a - 0.01 && w.s < page.b), [data, page]);
  const hidden = Object.entries(els[idx] ?? {}).filter(([, e]) => e.hide);

  async function exportNow() {
    if (!data || busy) return;
    setBusy(true); setErr(""); video.current?.pause();
    const chunks = Object.fromEntries(pages.map((_, i) => [i, { texts: texts[i] ?? {}, hex, els: elList(i) }]));
    const body = { job: jobId, edit: { chunks, words: wordEdits, captions }, ...(ask.trim().length >= 4 ? { ask: { chunk: idx, text: ask.trim() } } : {}) };
    const r = await fetch("/api/free-montage", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (!r || !r.ok || !d?.jobId) { setErr(L(d?.error ?? "تعذّر بدء التصدير.")); return; }
    router.push(`/app/tools/free-montage?job=${d.jobId}`); router.refresh();
  }

  if (loadErr) return <div className="card max-w-2xl p-6"><p className="font-semibold text-red-700">{loadErr}</p><Link href={`/app/tools/free-montage?job=${jobId}`} className="btn btn-outline mt-4 inline-flex px-5 py-2.5">{L("رجوع")}</Link></div>;
  if (!data) return <div className="card max-w-2xl p-6 text-[15px] text-muted">{L("يفتح الاستوديو…")}</div>;
  const [w, h] = data.aspect.split(":").map((x) => Number(x) || 1);
  const cur = selEl ? els[idx]?.[selEl.sel] : undefined;
  const hasAsk = ask.trim().length >= 4;
  const canExport = (dirty || hasAsk) && !busy && (!hasAsk || balance >= data.editCost);

  return (
    <div className={`grid grid-cols-1 gap-6 lg:items-start ${tall ? "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]"}`}>
      <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
        <div ref={box} dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-3xl bg-black shadow-lg" style={{ aspectRatio: `${w} / ${h}`, maxWidth: tall ? "min(100%, calc((100vh - 16rem) * 0.5625))" : undefined }} onClick={() => { if (!pick) toggle(); }}>
          <video ref={video} src={data.srcUrl} playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
          {srcDoc && <iframe key={`r${rev}`} ref={iframe} title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={srcDoc} className="absolute left-0 top-0 border-0" style={{ width: PW, height: PH, transform: `scale(${cw ? cw / PW : 0.3})`, transformOrigin: "0 0", background: "transparent", pointerEvents: pick ? "auto" : "none" }} />}
          {!playing && !pick && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[54px] text-white/85 drop-shadow">▶</span>}
        </div>
        <div className="flex items-center gap-3" dir="ltr">
          <button type="button" onClick={toggle} className="btn btn-outline px-4 py-2 text-[15px]">{playing ? "⏸" : "▶"}</button>
          <input type="range" min={0} max={seconds} step={0.05} value={t} onChange={(e) => seek(Number(e.target.value))} className="min-w-0 flex-1" aria-label={L("موضع الفيديو")} />
          <span className="w-[86px] text-end text-[13px] tabular-nums text-subtle">{mmss(t)} / {mmss(seconds)}</span>
        </div>
        {pages.length > 1 && <div className="flex flex-wrap gap-1.5">{pages.map((p, i) => <button key={i} type="button" onClick={() => seek(p.a + 0.05)} className={`rounded-lg border px-2.5 py-1 text-[12px] ${i === idx ? "border-gold-500 bg-gold-500/10 font-semibold" : "border-line bg-white"}`}>{L("مقطع")} {i + 1} · <span dir="ltr">{mmss(p.a)}</span></button>)}</div>}
        <p className="text-[12px] text-subtle">{L("المعاينة تقريبية؛ الفيديو المصدَّر هو المرجع. التعديل على المقطع الظاهر الآن.")}</p>
      </div>

      <div className="card flex min-w-0 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">{TABS.map(([id, icon, name]) => <button key={id} type="button" onClick={() => { setTab(id); if (id !== "els") setPick(false); }} className={`rounded-xl border px-3 py-2 text-[14px] ${tab === id ? "border-gold-500 bg-gold-500/10 font-semibold text-navy-900" : "border-line bg-white"}`}>{icon} {L(name)}</button>)}</div>

        {tab === "els" && <div className="flex flex-col gap-3">
          <button type="button" onClick={() => { video.current?.pause(); setPick((x) => !x); if (pick) setSelEl(null); }} className={`btn px-4 py-2.5 text-[15px] ${pick ? "btn-gold" : "btn-outline"}`}>{pick ? `✅ ${L("خلصت التحريك")}` : `🖐️ ${L("اختر وحرّك عنصر")}`}</button>
          <p className="text-[13px] text-subtle">{L("وقّف الفيديو عند العنصر، فعّل الزر، ثم اضغط العنصر بالمعاينة واسحبه لمكانه. اضغط مرة ثانية داخله لاختيار جزء منه.")}</p>
          {selEl && <div className="rounded-xl border border-line bg-tint p-3">
            <p className="truncate text-[14px] font-semibold text-navy-900">{selEl.text || L("عنصر مرسوم")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline px-3 py-1.5 text-[14px]" onClick={() => setEl((e) => ({ ...e, hide: false, s: Math.min(3, Math.round((e.s + 0.1) * 100) / 100) }))}>➕ {L("كبّر")}</button>
              <button type="button" className="btn btn-outline px-3 py-1.5 text-[14px]" onClick={() => setEl((e) => ({ ...e, hide: false, s: Math.max(0.3, Math.round((e.s - 0.1) * 100) / 100) }))}>➖ {L("صغّر")}</button>
              <button type="button" className="btn btn-outline px-3 py-1.5 text-[14px] text-red-700" onClick={() => setEl((e) => ({ ...e, hide: true }))}>🗑️ {L("احذف")}</button>
              <button type="button" className="btn btn-outline px-3 py-1.5 text-[14px]" onClick={() => setEl(() => null)}>↩️ {L("رجّعه مثل ما كان")}</button>
            </div>
            {cur && !cur.hide && <p className="mt-2 text-[12px] text-subtle" dir="ltr">{Math.round(cur.s * 100)}%</p>}
          </div>}
          {hidden.length > 0 && <div className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold">{L("عناصر محذوفة بهذا المقطع")}</span>{hidden.map(([sel], n) => <button key={sel} type="button" className="rounded-lg border border-line bg-white px-3 py-1.5 text-start text-[13px]" onClick={() => { setEls((p) => { const c = { ...(p[idx] ?? {}) }; delete c[sel]; return { ...p, [idx]: c }; }); setDirty(true); }}>↩️ {L("رجّع العنصر")} {n + 1}</button>)}</div>}
        </div>}

        {tab === "texts" && <div className="flex flex-col gap-2.5">
          {fields.length === 0 && <p className="text-[14px] text-subtle">{L("ما في نصوص بهذا المقطع.")}</p>}
          {fields.map((f) => <label key={f.key} className="flex flex-col gap-1"><input className="field" value={texts[idx]?.[f.key] ?? f.value} maxLength={300} onChange={(e) => { const v = e.target.value; setTexts((p) => ({ ...p, [idx]: { ...(p[idx] ?? {}), [f.key]: v } })); setDirty(true); }} /></label>)}
          {fields.length > 0 && <p className="text-[12px] text-subtle">{L("هذي نصوص الغرافيكس بالمقطع الظاهر. كلام الترجمة يتعدّل من تبويب «الترجمة».")}</p>}
        </div>}

        {tab === "colors" && <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-3">{colors.map((c) => <label key={c} className="flex flex-col items-center gap-1 text-[12px] text-subtle"><input type="color" value={hex[c] ?? c} onChange={(e) => { const v = e.target.value; setHex((p) => ({ ...p, [c]: v })); setDirty(true); }} className="h-11 w-full cursor-pointer rounded-lg border border-line" /><span dir="ltr">{hex[c] ?? c}</span></label>)}</div>
          <p className="text-[12px] text-subtle">{L("تغيير اللون يطبّق على كل مقاطع الفيديو.")}</p>
          {Object.keys(hex).length > 0 && <button type="button" className="btn btn-outline self-start px-3 py-1.5 text-[14px]" onClick={() => setHex({})}>↩️ {L("رجّع الألوان الأصلية")}</button>}
        </div>}

        {tab === "caps" && <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3"><input type="checkbox" checked={captions} onChange={(e) => { setCaptions(e.target.checked); setDirty(true); }} className="h-5 w-5" /><span className="text-[15px]">{L("ترجمة كلمة كلمة")}</span></label>
          {captions && <>
            <p className="text-[13px] text-subtle">{L("صحّح أي كلمة غلط فيها التفريغ (اسم، آية، مصطلح). امسح الكلمة عشان ما تطلع. التوقيت ما يتغير.")}</p>
            <div className="flex flex-wrap gap-1.5" dir="rtl">{capWords.map(({ w: x, i }) => { const v = wordEdits[i] ?? x.t; return <input key={i} value={v} maxLength={40} onFocus={() => seek(Math.max(0, x.s - 0.2))} onChange={(e) => { const nv = e.target.value; setWordEdits((p) => ({ ...p, [i]: nv })); setDirty(true); }} className={`rounded-lg border px-2 py-1 text-center text-[14px] ${FX_FILLER.test(v.trim()) || !v.trim() ? "border-dashed border-line text-subtle line-through" : "border-line bg-white"}`} style={{ width: `${Math.max(3, v.length + 2)}ch` }} />; })}</div>
          </>}
        </div>}

        {tab === "ask" && <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">{L("اطلب تعديل على المقطع الظاهر")} ({L("مقطع")} {idx + 1})</span>
          <textarea value={ask} onChange={(e) => setAsk(e.target.value)} maxLength={600} rows={4} className="field" placeholder={L("مثال: ضيف سهم ذهبي يأشّر على الرقم، وخل بطاقة الاقتباس أكبر وتدخل من اليمين.")} />
          <p className="text-[12px] text-subtle">{L("المصمم يعيد كتابة هذا المقطع حسب طلبك، فتحريكك للعناصر فيه يرجع لمكانه الأصلي. التكلفة")}: {data.editCost} {L("ريشة")}. {L("لا صور أو وجوه أشخاص حقيقيين ولا شعارات حقيقية.")}</p>
          {hasAsk && balance < data.editCost && <p className="text-[13px] text-red-700">{L("رصيدك ما يكفي.")}</p>}
        </div>}

        {err && <p className="text-[14px] text-red-700">{err}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <button type="button" disabled={!canExport} onClick={exportNow} className="btn btn-gold px-6 py-3 text-[15px]">{busy ? L("لحظات…") : `🎬 ${L("صدّر الفيديو بالتعديلات")}${hasAsk ? ` (${data.editCost} ${L("ريشة")})` : ` (${L("مجاناً")})`}`}</button>
          <Link href={`/app/tools/free-montage?job=${jobId}`} className="btn btn-outline px-4 py-3 text-[14px]">{L("رجوع")}</Link>
        </div>
        <p className="text-[12px] text-subtle">{L("التصدير يطلع فيديو جديد بـ«أعمالي»، والمونتاج الأصلي يبقى كما هو.")}</p>
      </div>
    </div>
  );
}
