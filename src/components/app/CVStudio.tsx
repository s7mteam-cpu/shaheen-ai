"use client";
import { L } from "@/lib/i18n/ui";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Width of an element, kept up to date (so previews scale to any screen, phones included). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
import { Progress } from "@/components/app/Progress";
import { uploadImage } from "@/components/app/DesignStart";
import { CVPage, PW, PH } from "@/cv/CV";
import { CV_STYLES, CV_ACCENTS, CV_FONTS, SEC_KEYS, TITLES, applyCVStyle, type CVSpec, type SecKey } from "@/cv/spec";

const SCALE_MAX = 0.64;
type Pg = { status: string; progress: number; files: { url: string }[] };

function Thumb({ spec, active, onPick, label }: { spec: CVSpec; active: boolean; onPick: () => void; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const s = w ? w / PW : 0.2;
  return (
    <button type="button" onClick={onPick} aria-pressed={active} className={`overflow-hidden rounded-lg border-2 text-center ${active ? "border-gold-500" : "border-transparent"} bg-white shadow-sm`}>
      <div ref={ref} dir="ltr" style={{ width: "100%", aspectRatio: `${PW} / ${PH}`, overflow: "hidden", position: "relative" }}><div style={{ width: PW, height: PH, transform: `scale(${s})`, transformOrigin: "top left", pointerEvents: "none", position: "absolute", top: 0, left: 0 }}><CVPage spec={spec} page={0} /></div></div>
      <div className="px-1 py-1 text-[11px] leading-tight text-ink">{label}</div>
    </button>
  );
}

export function CVStudio({ jobId, initial, editCost, done }: { jobId: string; initial: CVSpec; editCost: number; done?: { url: string }[] }) {
  const [spec, setSpec] = useState<CVSpec>(initial);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [vh, setVh] = useState(900);
  useEffect(() => { const f = () => setVh(window.innerHeight); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [render, setRender] = useState<Pg>({ status: done?.length ? "done" : "draft", progress: 0, files: done ?? [] });
  const first = useRef(true);
  const [box, bw] = useWidth<HTMLDivElement>();
  const [zoom, setZoom] = useState(false);
  const SCALE_MAIN = Math.max(0.3, Math.min(SCALE_MAX, bw ? bw / PW : SCALE_MAX, (vh - 150) / PH));
  const ar = spec.lang === "ar";
  const set = (p: Partial<CVSpec>) => setSpec((s) => ({ ...s, ...p }));

  useEffect(() => { if (page >= pages) setPage(Math.max(0, pages - 1)); }, [pages, page]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => { fetch("/api/cv/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, spec }) }).catch(() => null); }, 1500);
    return () => clearTimeout(t);
  }, [spec, jobId]);
  useEffect(() => {
    if (!sent || render.status === "done" || render.status === "failed" || render.status === "draft") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/jobs/${jobId}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json();
      setRender({ status: d.status, progress: d.progress ?? 0, files: d.files ?? [] });
    }, 2500);
    return () => clearInterval(t);
  }, [sent, render.status, jobId]);

  async function call<T>(path: string, body: object, label: string): Promise<T | null> {
    setBusy(label); setError(null);
    try {
      const r = await fetch(`/api/cv/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? L("صار خطأ، حاول مرة ثانية."));
      return d as T;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }
  async function polish(kind: "summary" | "bullets", text: string, apply: (t: string) => void, key: string) {
    const d = await call<{ text: string }>("polish", { kind, text }, key);
    if (d?.text) apply(d.text);
  }

  const upd = <K extends "experience" | "education" | "courses" | "languages" | "details" | "extra">(k: K, i: number, p: Partial<CVSpec[K][number]>) => set({ [k]: (spec[k] as object[]).map((x, j) => (j === i ? { ...x, ...p } : x)) } as Partial<CVSpec>);
  const del = (k: "experience" | "education" | "courses" | "languages" | "details" | "extra", i: number) => set({ [k]: (spec[k] as object[]).filter((_, j) => j !== i) } as Partial<CVSpec>);
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  if (render.status === "queued" || render.status === "running") return <div className="card max-w-xl p-6"><Progress value={render.progress} label={render.status === "queued" && !render.progress ? L("في الطابور…") : L("جاري تجهيز ملف PDF…")} /></div>;
  if (render.status === "done" && render.files.length) return (
    <div className="card flex max-w-xl flex-col gap-3 p-6">
      <h2 className="text-[20px] font-bold text-navy-900">{L("سيرتك جاهزة")}</h2>
      <a href={render.files[0].url} download className="btn btn-gold py-3.5 text-[16px]">⬇ {L("تحميل PDF")}</a>
      <button type="button" className="btn btn-outline py-3" onClick={async () => { const d = await call<{ url: string }>("docx", { spec }, "docx"); if (d?.url) window.location.href = d.url; }}>{busy === "docx" ? L("لحظات…") : L("تحميل نسخة Word قابلة للتعديل")}</button>
      <button type="button" className="btn btn-primary py-3" onClick={() => { setSent(false); setRender({ status: "draft", progress: 0, files: [] }); }}>✏️ {L("رجوع للتعديل")}</button>
      <Link href="/app/tools/cv" className="btn btn-outline py-2.5">{L("سيرة جديدة")}</Link>
      {error && <p role="alert" className="text-[14px] text-red-700">{error}</p>}
    </div>
  );

  const field = "field";
  const zoomView = zoom && (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
      <button type="button" onClick={() => setZoom(false)} className="btn btn-gold m-3 py-2.5">✕ {L("إغلاق")}</button>
      <div dir="ltr" className="flex-1 overflow-auto px-2 pb-4">
        <div style={{ width: PW * 0.9, height: PH * 0.9 }} className="mx-auto bg-white"><div style={{ width: PW, height: PH, transform: "scale(0.9)", transformOrigin: "top left" }}><CVPage spec={spec} page={page} /></div></div>
      </div>
    </div>
  );
  const secName = (k: SecKey) => spec.titles[k] || TITLES[spec.lang][k];
  const card = "card flex flex-col gap-3 p-4";
  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
      {zoomView}
      <div ref={box} className="flex w-full flex-col items-center gap-2 lg:sticky lg:top-3 lg:w-auto">
        <div dir="ltr" style={{ width: PW * SCALE_MAIN, height: PH * SCALE_MAIN }} className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div style={{ width: PW, height: PH, transform: `scale(${SCALE_MAIN})`, transformOrigin: "top left" }}><CVPage spec={spec} page={page} onPages={setPages} /></div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn btn-outline px-4 py-1.5">‹</button>
          <span className="text-[14px]">{page + 1} / {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="btn btn-outline px-4 py-1.5">›</button>
        </div>
        <button type="button" onClick={() => setZoom(true)} className="chip lg:hidden">🔍 {L("تكبير المعاينة")}</button>
        {pages > 2 && <p className="max-w-[560px] text-center text-[13px] text-amber-800">{L("السيرة طويلة (أكثر من صفحتين). الأفضل تختصرها: الشركات تقرأ أول صفحتين فقط.")}</p>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className={card}>
          <b>{L("الستايل")} <span className="text-[13px] font-normal text-subtle">({CV_STYLES.length})</span></b>
          <div className="grid max-h-[62vh] grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-4">
            {CV_STYLES.map((st) => <Thumb key={st.id} spec={applyCVStyle(spec, st)} active={spec.template === st.template && spec.accent === st.accent && spec.font === st.font} onPick={() => set({ template: st.template, accent: st.accent, font: st.font, tone: st.tone })} label={st.name} />)}
          </div>
        </div>

        <div className={card}>
          <b>{L("اللون والخط")}</b>
          <div className="flex flex-wrap gap-2">{CV_ACCENTS.map((c) => <button key={c} type="button" aria-label={c} aria-pressed={spec.accent === c} onClick={() => set({ accent: c })} className={`h-8 w-8 rounded-full border-2 ${spec.accent === c ? "border-gold-500 ring-2 ring-gold-300" : "border-white shadow"}`} style={{ background: c }} />)}</div>
          <div className="flex flex-wrap gap-2">{CV_FONTS.map(([id, label]) => <button key={id} type="button" aria-pressed={spec.font === id} onClick={() => set({ font: id })} className="chip" style={{ fontFamily: `"${id}"` }}>{label}</button>)}</div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={spec.showPhoto && !!spec.photo} disabled={!spec.photo} onChange={(e) => set({ showPhoto: e.target.checked })} className="h-5 w-5" />{L("إظهار الصورة الشخصية")}</label>
          <input type="file" accept="image/*" className="field" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const u = await uploadImage(f); set({ photo: { path: u.path, bucket: "uploads", url: u.preview }, showPhoto: true }); } catch (er) { setError((er as Error).message); } }} />
        </div>

        <div className={card}>
          <b>{L("البيانات الأساسية")}</b>
          {([["name", "الاسم"], ["title", "المسمى الوظيفي"], ["phone", "الجوال"], ["email", "الإيميل"], ["city", "المدينة"], ["linkedin", "LinkedIn"], ["website", "الموقع"]] as const).map(([k, l]) => (
            <label key={k} className="flex flex-col gap-1 text-[14px]">{L(l)}<input className={field} dir={k === "email" || k === "phone" || k === "linkedin" || k === "website" ? "ltr" : undefined} value={spec.person[k]} onChange={(e) => set({ person: { ...spec.person, [k]: e.target.value } })} /></label>
          ))}
          <b className="mt-1 text-[14px]">{L("بيانات شخصية (اختياري)")}</b>
          {spec.details.map((d, i) => <div key={i} className="flex gap-2"><input className={field} value={d.label} onChange={(e) => upd("details", i, { label: e.target.value })} /><input className={field} value={d.value} onChange={(e) => upd("details", i, { value: e.target.value })} /><button type="button" onClick={() => del("details", i)} aria-label="x" className="px-2">✕</button></div>)}
          <button type="button" className="btn btn-outline py-1.5" onClick={() => set({ details: [...spec.details, { label: "", value: "" }].slice(0, 8) })}>+ {L("أضف")}</button>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between"><b>{secName("summary")}</b>
            <button type="button" disabled={!!busy || spec.summary.length < 10} onClick={() => polish("summary", spec.summary, (t) => set({ summary: t }), "p-sum")} className="chip">{busy === "p-sum" ? L("لحظات…") : `✨ ${L("حسّنها")} · ${editCost} ${L("ريشة")}`}</button></div>
          <textarea rows={4} maxLength={1500} className={field} value={spec.summary} onChange={(e) => set({ summary: e.target.value })} />
        </div>

        <div className={card}>
          <b>{secName("experience")}</b>
          {spec.experience.map((e, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className={field} placeholder={L("المسمى")} value={e.role} onChange={(x) => upd("experience", i, { role: x.target.value })} />
                <input className={field} placeholder={L("الشركة")} value={e.company} onChange={(x) => upd("experience", i, { company: x.target.value })} />
                <input className={field} placeholder={L("من")} value={e.from} onChange={(x) => upd("experience", i, { from: x.target.value })} />
                <input className={field} placeholder={L("إلى")} value={e.to} onChange={(x) => upd("experience", i, { to: x.target.value })} />
              </div>
              <input className={field} placeholder={L("المكان")} value={e.place} onChange={(x) => upd("experience", i, { place: x.target.value })} />
              <textarea rows={4} className={field} placeholder={L("كل سطر نقطة إنجاز")} value={e.bullets.join("\n")} onChange={(x) => upd("experience", i, { bullets: x.target.value.split("\n").slice(0, 8) })} onBlur={(x) => upd("experience", i, { bullets: lines(x.target.value) })} />
              <div className="flex gap-2">
                <button type="button" disabled={!!busy || e.bullets.join("").length < 10} onClick={() => polish("bullets", e.bullets.join("\n"), (t) => upd("experience", i, { bullets: lines(t) }), `p-${i}`)} className="chip">{busy === `p-${i}` ? L("لحظات…") : `✨ ${L("حسّن النقاط")} · ${editCost}`}</button>
                <button type="button" onClick={() => del("experience", i)} className="chip">{L("احذف")}</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-outline py-1.5" onClick={() => set({ experience: [...spec.experience, { role: "", company: "", place: "", from: "", to: "", bullets: [] }].slice(0, 12) })}>+ {L("أضف خبرة")}</button>
        </div>

        <div className={card}>
          <b>{secName("education")}</b>
          {spec.education.map((e, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-3">
              <input className={field} placeholder={L("الشهادة")} value={e.degree} onChange={(x) => upd("education", i, { degree: x.target.value })} />
              <input className={field} placeholder={L("الجامعة")} value={e.school} onChange={(x) => upd("education", i, { school: x.target.value })} />
              <input className={field} placeholder={L("من")} value={e.from} onChange={(x) => upd("education", i, { from: x.target.value })} />
              <input className={field} placeholder={L("إلى")} value={e.to} onChange={(x) => upd("education", i, { to: x.target.value })} />
              <input className={`${field} col-span-2`} placeholder={L("ملاحظة (اختياري)")} value={e.note} onChange={(x) => upd("education", i, { note: x.target.value })} />
              <button type="button" onClick={() => del("education", i)} className="chip col-span-2">{L("احذف")}</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline py-1.5" onClick={() => set({ education: [...spec.education, { degree: "", school: "", place: "", from: "", to: "", note: "" }].slice(0, 8) })}>+ {L("أضف")}</button>
        </div>

        <div className={card}>
          <b>{secName("skills")}</b>
          <textarea rows={3} className={field} placeholder={L("افصل المهارات بفاصلة")} defaultValue={spec.skills.join("، ")} onBlur={(e) => set({ skills: e.target.value.split(/[،,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 24) })} />
          <b>{secName("languages")}</b>
          {spec.languages.map((l, i) => <div key={i} className="flex gap-2"><input className={field} value={l.name} onChange={(e) => upd("languages", i, { name: e.target.value })} /><input className={field} value={l.level} onChange={(e) => upd("languages", i, { level: e.target.value })} /><button type="button" onClick={() => del("languages", i)} aria-label="x" className="px-2">✕</button></div>)}
          <button type="button" className="btn btn-outline py-1.5" onClick={() => set({ languages: [...spec.languages, { name: "", level: "" }].slice(0, 8) })}>+ {L("أضف لغة")}</button>
          <b>{secName("courses")}</b>
          {spec.courses.map((c, i) => <div key={i} className="flex gap-2"><input className={field} value={c.name} onChange={(e) => upd("courses", i, { name: e.target.value })} /><input className={field} value={c.org} onChange={(e) => upd("courses", i, { org: e.target.value })} /><input className={`${field} w-24`} value={c.year} onChange={(e) => upd("courses", i, { year: e.target.value })} /><button type="button" onClick={() => del("courses", i)} aria-label="x" className="px-2">✕</button></div>)}
          <button type="button" className="btn btn-outline py-1.5" onClick={() => set({ courses: [...spec.courses, { name: "", org: "", year: "" }].slice(0, 12) })}>+ {L("أضف دورة")}</button>
        </div>

        <div className={card}>
          <b>{L("إظهار الأقسام")}</b>
          <div className="flex flex-wrap gap-2">{SEC_KEYS.map((k) => { const on = !spec.hidden.includes(k); return <button key={k} type="button" aria-pressed={on} onClick={() => set({ hidden: on ? [...spec.hidden, k] : spec.hidden.filter((x) => x !== k) })} className="chip">{on ? "✓ " : ""}{secName(k)}</button>; })}</div>
        </div>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
        <div className="sticky bottom-3 z-30 flex flex-col gap-2">
          <button type="button" disabled={!!busy} onClick={async () => { const d = await call<{ ok: boolean }>("export", { spec, pages }, "export"); if (d) { setSent(true); setRender({ status: "queued", progress: 0, files: [] }); } }} className="btn btn-gold py-4 text-[17px] shadow-lg">{busy === "export" ? L("جاري الإرسال…") : `⬇️ ${L("صدّر PDF (مجاناً)")}`}</button>
          <button type="button" disabled={!!busy} onClick={async () => { const d = await call<{ url: string }>("docx", { spec }, "docx"); if (d?.url) window.location.href = d.url; }} className="btn btn-outline bg-white py-3">{busy === "docx" ? L("لحظات…") : L("تحميل Word قابل للتعديل (مجاناً)")}</button>
        </div>
        <p className="text-center text-[12px] text-subtle">{ar ? L("نسخة Word تصميمها بسيط وصديق لأنظمة التوظيف؛ التصميم الكامل في PDF.") : ""}</p>
      </div>
    </div>
  );
}
