"use client";
import { L } from "@/lib/i18n/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renderTemplate } from "../actions";
import { applyEdits } from "@/lib/htmlKit";
import { ERR_SNIPPET } from "@/lib/freeErrSnippet";

export type TField = { key: string; label: string; value: string };
const FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const DEFAULT_COLORS = { bg: "#0B2A4A", accent: "#E8B44C", text: "#FFFFFF" };
const card = "card flex flex-col gap-3 p-4";

/** معاينة حية لقالب من المكتبة: نفس المشغّل ونفس الصفحة المعزولة (sandbox) اللي يشوفها العميل. النصوص والألوان تتحدّث فورًا. */
export function TemplateTry({ kind, colorList, id, aspect, fields: initial, previewUrl, videoUrl, videoErr, rendering }: { kind: "html" | "remotion"; colorList: string[]; id: string; name: string; aspect: string; fields: TField[]; previewUrl: string; videoUrl: string; videoErr: string; rendering: boolean }) {
  const router = useRouter();
  const [asked, setAsked] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [ready, setReady] = useState(false);
  const [runErr, setRunErr] = useState("");
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(initial.map((f) => [f.key, f.value])));
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [font, setFont] = useState("Cairo");
  const [seconds, setSeconds] = useState(kind === "html" ? 30 : 35);
  const [contact, setContact] = useState("");
  const isHtml = kind === "html";
  const [hex, setHex] = useState<Record<string, string>>(() => Object.fromEntries(colorList.map((c) => [c, c])));
  const [raw, setRaw] = useState<string | null>(null);
  const [doc, setDoc] = useState<string | null>(null);
  const [rev, setRev] = useState(0);
  const [w, h] = useMemo(() => (aspect || "9:16").split(":").map((x) => Number(x) || 1), [aspect]);

  useEffect(() => { if (!rendering) setAsked(false); }, [rendering]);
  useEffect(() => {
    let dead = false;
    fetch(previewUrl).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => { if (!dead) { setHtml(t.replace(/<head>/i, (m) => m + ERR_SNIPPET)); setRaw(t); } }).catch(() => { if (!dead) setLoadErr(true); });
    return () => { dead = true; };
  }, [previewUrl]);

  // original-HTML templates: the page plays by itself exactly like in Gemini; edits rebuild the page (after a short pause)
  useEffect(() => {
    if (!isHtml || raw === null) return;
    const id2 = setTimeout(() => { try { setDoc(applyEdits(raw, { texts: vals, hex }).replace(/<head[^>]*>/i, (m) => m + ERR_SNIPPET)); setRev((x) => x + 1); } catch { setRunErr("تعذّر تطبيق التعديل"); } }, 500);
    return () => clearTimeout(id2);
  }, [isHtml, raw, vals, hex]);
  const props = useMemo(() => ({ assets: {}, t: vals, colors, font, contact: contact.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6), logo: "", logoOn: false, beats: [], seconds }), [vals, colors, font, contact, seconds]);
  const send = useCallback((m: unknown) => { iframe.current?.contentWindow?.postMessage(m, "*"); }, []);
  useEffect(() => { if (ready) send({ type: "props", props }); }, [props, ready, send]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== iframe.current?.contentWindow) return;
      const m = (e.data ?? {}) as { type?: string; frame?: number; playing?: boolean; message?: string };
      if (m.type === "ready") { setReady(true); send({ type: "props", props }); send({ type: "play" }); }
      else if (m.type === "frame") setFrame(Math.round(Number(m.frame) || 0));
      else if (m.type === "state") setPlaying(!!m.playing);
      else if (m.type === "err") setRunErr(String(m.message ?? "").slice(0, 300));
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [props, send]);

  const total = Math.max(30, Math.round(seconds * 30));
  const reset = () => { setVals(Object.fromEntries(initial.map((f) => [f.key, f.value]))); setColors(DEFAULT_COLORS); setFont("Cairo"); setSeconds(isHtml ? 30 : 35); setHex(Object.fromEntries(colorList.map((c) => [c, c]))); setContact(""); setRunErr(""); };
  const key = previewUrl;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,420px)_1fr]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-full overflow-hidden rounded-2xl border bg-black" style={{ aspectRatio: `${w} / ${h}`, maxHeight: "78vh", maxWidth: `calc(78vh * ${w} / ${h})` }}>
          {html && !loadErr ? <iframe key={isHtml ? `h${rev}` : key} ref={iframe} allow="autoplay" title={L("معاينة مباشرة")} sandbox="allow-scripts" srcDoc={isHtml ? doc ?? html : html} className="absolute inset-0 h-full w-full border-0" /> : <div className="grid h-full place-items-center p-6 text-center text-[14px] text-white/80">{loadErr ? L("تعذّر تحميل المعاينة. حدّث الصفحة.") : L("جاري تجهيز المعاينة…")}</div>}
        </div>
        {runErr && <p dir="auto" className="w-full rounded-lg bg-red-50 p-2 text-[12px] text-red-800">⚠️ {L("خطأ داخل التصميم")}: {runErr}</p>}
        {isHtml && <button className="btn btn-gold w-full px-5 py-2.5" onClick={() => setRev((x) => x + 1)}>↻ {L("أعد التشغيل من البداية")}</button>}
        {!isHtml && <div className="flex w-full items-center gap-3">
          <button className="btn btn-gold px-5 py-2.5" onClick={() => send({ type: playing ? "pause" : "play" })}>{playing ? `⏸ ${L("إيقاف")}` : `▶ ${L("تشغيل")}`}</button>
          <input type="range" min={0} max={total - 1} value={Math.min(frame, total - 1)} onChange={(e) => { setFrame(Number(e.target.value)); send({ type: "pause" }); send({ type: "seek", frame: Number(e.target.value) }); }} className="flex-1" aria-label={L("الوقت")} />
          <span className="w-14 text-[13px] tabular-nums text-subtle">{(frame / 30).toFixed(1)}s</span>
        </div>}
      </div>
      <div className="flex flex-col gap-3">
        <div className={card}>
          {isHtml ? (
            <div className="flex flex-wrap items-center gap-4">
              {colorList.length === 0 && <p className="text-[12px] text-subtle">{L("ما لقينا ألوان بصيغة #rrggbb بالكود. تعديل الألوان غير متاح لهذا التصميم.")}</p>}
              {colorList.map((c) => <label key={c} className="flex items-center gap-2 text-[13px]"><span className="inline-block h-4 w-4 rounded border" style={{ background: c }} />→<input type="color" value={hex[c] ?? c} onChange={(e) => setHex({ ...hex, [c]: e.target.value })} className="h-9 w-12 cursor-pointer rounded border" /></label>)}
            </div>
          ) : null}
          {!isHtml && <div className="flex flex-wrap items-center gap-4">
            {(["bg", "accent", "text"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 text-[13px]">{L(k === "bg" ? "الخلفية" : k === "accent" ? "اللون الرئيسي" : "لون النص")}
                <input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="h-9 w-12 cursor-pointer rounded border" />
              </label>
            ))}
            <label className="flex items-center gap-2 text-[13px]">{L("الخط")}
              <select value={font} onChange={(e) => setFont(e.target.value)} className="field py-1.5">{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
            </label>
          </div>}
          <label className="flex items-center gap-3 text-[13px]">{L("المدة")}: <b className="tabular-nums">{seconds}s</b>
            <input type="range" min={15} max={120} step={5} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="flex-1" />
          </label>
          {!isHtml && <div className="flex flex-col gap-1">
            <label className="label">{L("معلومات التواصل (سطر لكل واحدة، تظهر لو القالب يدعمها)")}</label>
            <textarea rows={2} dir="auto" value={contact} onChange={(e) => setContact(e.target.value)} className="field" placeholder="@s7m_team" />
          </div>}
          <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
            <button className="btn btn-gold w-fit px-5 py-2.5 disabled:opacity-60" disabled={asked || rendering} onClick={async () => { setAsked(true); await renderTemplate(id, { t: vals, colors, font, seconds, contact: props.contact, hex }); router.refresh(); }}>🎞 {rendering || asked ? L("جاري رسم الفيديو… (دقيقة إلى ثلاث)") : L("حمّل كفيديو MP4 بهالتعديلات")}</button>
            {videoUrl && !rendering && <a href={videoUrl} className="btn btn-outline w-fit px-5 py-2.5" download>⬇ {L("نزّل الفيديو الجاهز")}</a>}
            {videoErr && !rendering && <p dir="auto" className="text-[12px] text-red-800">⚠️ {videoErr}</p>}
            <p className="text-[12px] text-subtle">{L("الفيديو يطلع بآخر تعديل عملته هون، بدون صوت. افتحه على تلفونك عشان تحكم على السلاسة والألوان الحقيقية.")}</p>
          </div>
          <button className="btn btn-outline w-fit px-4 py-2" onClick={reset}>↺ {L("رجّع الكل للأصل")}</button>
        </div>
        <div className={card}>
          <p className="text-[13px] font-bold text-navy-900">{L("النصوص")} ({initial.length})</p>
          <div className="grid gap-2 md:grid-cols-2">
            {initial.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-[12px] text-subtle">{f.label}</label>
                <input dir="auto" value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="field py-2" maxLength={300} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
