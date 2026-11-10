"use client";
/* eslint-disable @next/next/no-img-element */
import "@fontsource/tajawal/arabic-500.css";
import "@fontsource/tajawal/arabic-800.css";
import "@fontsource/almarai/arabic-400.css";
import "@fontsource/almarai/arabic-800.css";
import "@fontsource/changa/arabic-500.css";
import "@fontsource/changa/arabic-700.css";
import "@fontsource/amiri/arabic-400.css";
import "@fontsource/amiri/arabic-700.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DesignView } from "@/components/app/DesignView";
import { uploadImage } from "@/components/app/DesignStart";
import { Progress } from "@/components/app/Progress";
import { DEFAULT_LOGO_BOX, LogoDrag, LogoSize } from "@/components/app/LogoDrag";
import { LogoCropper } from "@/components/app/LogoCropper";
import { DIcon, ICONS, ICON_STYLES } from "@/design/icons";
import {
  usedIcons, DECO_IDS, DECO_LABELS, DFONTS, ICON_IDS, LAYOUTS, LAYOUT_IDS, PALETTES, lum,
  type DAspect, type DColors, type DImg, type DItem, type DesignSpec, type LayoutId, type Slide,
} from "@/design/spec";

type Kit = { colors: string[]; font: string | null; handle: string | null; name: string | null; logo: DImg | null } | null;

const Card = ({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) => (
  <section className="card flex flex-col gap-4 p-5">
    <h2 className="flex items-center gap-2 text-[18px] font-bold text-navy-900">{icon && <span aria-hidden>{icon}</span>}{title}</h2>
    {children}
  </section>
);
const Sub = ({ children }: { children: React.ReactNode }) => <h3 className="text-[13px] font-semibold text-subtle">{children}</h3>;
const COLOR_LABELS: Record<keyof DColors, string> = { bg: "الخلفية", ink: "النصوص", accent: "اللون المميز", soft: "البطاقات" };
const ASPECTS: [DAspect, string][] = [["4:5", "طولي 4:5"], ["1:1", "مربع 1:1"], ["9:16", "ستوري 9:16"]];

function IconPick({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-label="اختر أيقونة" className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white">
        <DIcon name={value ?? "check"} size={22} color="#0B2A4A" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-20 grid w-[300px] grid-cols-7 gap-1 rounded-2xl border border-line bg-white p-2 shadow-xl">
          {ICON_IDS.map((id) => (
            <button key={id} type="button" title={ICONS[id].label} onClick={() => { onChange(id); setOpen(false); }}
              className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-tint ${value === id ? "bg-tint ring-2 ring-navy-700" : ""}`}>
              <DIcon name={id} size={19} color="#0B2A4A" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ListEdit({ list, onChange, max, placeholder }: { list: DItem[]; onChange: (l: DItem[]) => void; max: number; placeholder: string }) {
  return (
    <div className="flex flex-col gap-2">
      {list.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <IconPick value={it.icon} onChange={(icon) => onChange(list.map((x, j) => (j === i ? { ...x, icon } : x)))} />
          <input value={it.text} maxLength={90} onChange={(e) => onChange(list.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="field flex-1 py-2.5" />
          <button type="button" aria-label="حذف" onClick={() => onChange(list.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-xl text-red-700 hover:bg-red-50">✕</button>
        </div>
      ))}
      {list.length < max && <button type="button" onClick={() => onChange([...list, { icon: "check", text: "" }])} className="btn btn-outline self-start px-4 py-2 text-sm">+ {placeholder}</button>}
    </div>
  );
}

export function DesignStudio({ jobId, toolId, initial, editCost, kit, demo = false, done }: {
  jobId: string; toolId: string; initial: DesignSpec; editCost: number; kit: Kit; demo?: boolean; done?: { url: string }[];
}) {
  const [spec, setSpec] = useState<DesignSpec>(initial);
  const [cur, setCur] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [imgPrompt, setImgPrompt] = useState(initial.slides[0]?.imagePrompt ?? "");
  const [sent, setSent] = useState(!!done?.length);
  const [render, setRender] = useState<{ status: string; progress: number; files: { url: string }[] }>({ status: done ? "done" : "queued", progress: 0, files: done ?? [] });
  const [copied, setCopied] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [useRef_, setUseRef] = useState(true);
  const s = spec.slides[cur] ?? spec.slides[0];
  const uses = new Set(LAYOUTS[s.layout].uses);

  // Autosave: on this device right away, on the server shortly after the last change.
  const first = useRef(true);
  useEffect(() => {
    if (demo) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      fetch("/api/design/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, spec }) }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [spec, jobId, demo]);

  useEffect(() => {
    if (!sent || render.status === "done" || render.status === "failed") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/jobs/${jobId}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json();
      setRender({ status: d.status, progress: d.progress ?? 0, files: d.files ?? [] });
    }, 2500);
    return () => clearInterval(t);
  }, [sent, render.status, jobId]);

  const setSlide = (patch: Partial<Slide>) => setSpec((p) => ({ ...p, slides: p.slides.map((x, i) => (i === cur ? { ...x, ...patch } : x)) }));
  const setColor = (k: keyof DColors, v: string) => setSpec((p) => ({ ...p, colors: { ...p.colors, [k]: v } }));

  async function call<T>(path: string, body: object, label: string): Promise<T | null> {
    if (demo) { setError("هذي معاينة تجريبية."); return null; }
    setBusy(label); setError(null);
    try {
      const r = await fetch(`/api/design/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "صار خطأ، حاول مرة ثانية.");
      return d as T;
    } catch (e) { setError((e as Error).message); return null; } finally { setBusy(null); }
  }

  async function upload(file: File | undefined, apply: (img: DImg) => void) {
    if (!file) return;
    setBusy("upload"); setError(null);
    try { const u = await uploadImage(file); apply({ path: u.path, bucket: "uploads", url: u.preview }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  function applyBrand() {
    if (!kit) return;
    const cs = kit.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    let colors = spec.colors;
    if (cs.length) {
      const sat = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255; };
      const byLum = [...cs].sort((a, b) => lum(a) - lum(b));
      const accent = [...cs].sort((a, b) => sat(b) - sat(a))[0];
      const light = lum(spec.colors.bg) > 0.5;
      const bg = light ? (lum(byLum[byLum.length - 1]) > 0.8 ? byLum[byLum.length - 1] : spec.colors.bg) : byLum[0];
      colors = { ...spec.colors, bg, accent, ink: light ? (lum(byLum[0]) < 0.3 ? byLum[0] : "#14161A") : "#FFFFFF" };
    }
    setSpec({ ...spec, colors, font: kit.font || spec.font, brand: { ...spec.brand, name: kit.name || spec.brand.name, handle: kit.handle || spec.brand.handle, logo: kit.logo ?? spec.brand.logo, showLogo: true } });
  }

  function moveSlide(d: -1 | 1) {
    const j = cur + d;
    if (j < 0 || j >= spec.slides.length) return;
    const slides = [...spec.slides];
    [slides[cur], slides[j]] = [slides[j], slides[cur]];
    setSpec({ ...spec, slides }); setCur(j);
  }
  const max = spec.kind === "carousel" ? 10 : spec.kind === "ads" ? 4 : 1;

  if (sent) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
        {render.status === "done" && render.files.length ? (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">✓ التصميم جاهز</h2>
            <div className={`grid w-full gap-3 ${render.files.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "max-w-sm"}`}>
              {render.files.map((f, i) => (
                <a key={i} href={f.url} download className="group relative overflow-hidden rounded-2xl bg-white shadow">
                  <img src={f.url} alt={`التصميم ${i + 1}`} className="w-full" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1 text-[12px] text-white">⬇️ تحميل</span>
                </a>
              ))}
            </div>
            <p className="text-[14px] text-emerald-900/80">اضغط على أي صورة لتحميلها. تلقاها كمان في «أعمالي».</p>
          </>
        ) : render.status === "failed" ? (
          <p className="font-semibold text-red-800">ما نجح التصدير. حاول مرة ثانية.</p>
        ) : (
          <>
            <h2 className="text-[22px] font-bold text-emerald-900">جاري تجهيز الصور…</h2>
            <Progress value={render.progress} label={render.status === "queued" && !render.progress ? "في الطابور…" : "جاري التصدير…"} />
          </>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => { setSent(false); setRender({ status: "draft", progress: 0, files: [] }); }} className="btn btn-primary px-6 py-3">✏️ رجوع للتعديل</button>
          <Link href="/app/works" className="btn border border-line bg-white px-6 py-3">أعمالي</Link>
          <Link href={`/app/tools/${toolId}`} className="btn border border-line bg-white px-6 py-3">تصميم جديد</Link>
        </div>
      </div>
    );
  }

  const caption = spec.kind === "carousel" ? spec.caption ?? "" : s.caption ?? "";
  const text = (k: keyof Slide, label: string, maxLen: number, rows = 0) => uses.has(k) && (
    <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{label}</span>
      {rows ? <textarea rows={rows} maxLength={maxLen} value={(s[k] as string) ?? ""} onChange={(e) => setSlide({ [k]: e.target.value } as Partial<Slide>)} className="field" />
        : <input maxLength={maxLen} value={(s[k] as string) ?? ""} onChange={(e) => setSlide({ [k]: e.target.value } as Partial<Slide>)} className="field py-2.5" />}
    </label>
  );

  return (
    <>
    {cropFile && <LogoCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={(f) => { setCropFile(null); upload(f, (logo) => setSpec((p) => ({ ...p, brand: { ...p.brand, logo, showLogo: true } }))); }} />}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:items-start">
      {/* Live preview */}
      <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-navy-900">معاينة مباشرة</h2>
          {spec.slides.length > 1 && <span className="rounded-full bg-tint px-3 py-1 text-[13px] text-subtle">{cur + 1} / {spec.slides.length}</span>}
        </div>
        <div className="relative mx-auto w-full overflow-hidden rounded-2xl shadow-lg" style={{ maxWidth: spec.aspect === "9:16" ? "min(100%, calc((100vh - 13rem) * 0.5625))" : 460 }}>
          <DesignView spec={spec} index={cur} />
          {spec.brand.box && spec.brand.showLogo && spec.brand.logo && <LogoDrag box={spec.brand.box} onChange={(box) => setSpec((p) => ({ ...p, brand: { ...p.brand, box } }))} />}
        </div>
        {spec.slides.length > 1 || max > 1 ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {spec.slides.map((_, i) => (
                <button key={i} type="button" onClick={() => { setCur(i); setImgPrompt(spec.slides[i].imagePrompt ?? ""); }} aria-label={`الشريحة ${i + 1}`}
                  className={`w-[72px] flex-none overflow-hidden rounded-lg border-2 ${i === cur ? "border-gold-500" : "border-transparent opacity-70"}`}>
                  <div className="pointer-events-none"><DesignView spec={spec} index={i} /></div>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-[13px]">
              <button type="button" onClick={() => moveSlide(-1)} disabled={cur === 0} className="btn btn-outline px-3 py-1.5">→ قدّم</button>
              <button type="button" onClick={() => moveSlide(1)} disabled={cur === spec.slides.length - 1} className="btn btn-outline px-3 py-1.5">أخّر ←</button>
              {spec.slides.length < max && <button type="button" onClick={() => { const slides = [...spec.slides]; slides.splice(cur + 1, 0, { ...s, photo: s.photo }); setSpec({ ...spec, slides }); setCur(cur + 1); }} className="btn btn-outline px-3 py-1.5">⧉ تكرار</button>}
              {spec.slides.length > 1 && <button type="button" onClick={() => { setSpec({ ...spec, slides: spec.slides.filter((_, i) => i !== cur) }); setCur(Math.max(0, cur - 1)); }} className="btn btn-outline px-3 py-1.5 text-red-700">🗑 حذف</button>}
            </div>
          </>
        ) : null}
        <p className="text-center text-[13px] text-subtle">أي تعديل يبان بالتصميم على طول، ويتحفظ تلقائياً.</p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Card title="التصميم" icon="🎨">
          <Sub>تخطيط {spec.slides.length > 1 ? "هذي الشريحة" : "التصميم"}</Sub>
          <div className="flex flex-wrap gap-2">
            {LAYOUT_IDS.map((id) => <button key={id} type="button" aria-pressed={s.layout === id} onClick={() => setSlide({ layout: id as LayoutId })} className="chip" title={LAYOUTS[id].hint}>{LAYOUTS[id].label}</button>)}
          </div>
          <Sub>زخرفة الخلفية</Sub>
          <div className="flex flex-wrap gap-2">
            {DECO_IDS.map((id) => <button key={id} type="button" aria-pressed={(spec.deco ?? "circles") === id} onClick={() => setSpec({ ...spec, deco: id })} className="chip">{DECO_LABELS[id]}</button>)}
          </div>
          <Sub>أسلوب الأيقونات</Sub>
          <div className="flex flex-wrap gap-2">
            {ICON_STYLES.map(([id, l]) => <button key={id} type="button" aria-pressed={(spec.icons ?? "line") === id} onClick={() => setSpec({ ...spec, icons: id })} className="chip">{l}</button>)}
          </div>
          {spec.icons === "3d" && (() => {
            const need = usedIcons(spec).filter((id) => !spec.icon3d?.[id]);
            return (
              <div className="flex flex-col gap-2 rounded-2xl bg-tint p-3 text-[14px]">
                {need.length > 0
                  ? <span>{Object.keys(spec.icon3d ?? {}).length ? `فيه ${need.length} أيقونات جديدة ما انرسمت.` : "الأيقونات الـ 3D تنرسم بالذكاء الاصطناعي بألوان تصميمك."}</span>
                  : <span>✓ الأيقونات الـ 3D جاهزة. إذا غيّرت الألوان، ارسمها من جديد.</span>}
                <button type="button" disabled={!!busy} onClick={async () => {
                  const d = await call<{ icon3d: Record<string, DImg> }>("icons3d", { spec }, "icons3d");
                  if (d) setSpec((p) => ({ ...p, icon3d: { ...(p.icon3d ?? {}), ...d.icon3d } }));
                }} className="btn btn-primary self-start px-4 py-2 text-sm">{busy === "icons3d" ? "جاري الرسم… (دقيقة تقريباً)" : `✨ ${need.length ? "ارسم" : "أعد رسم"} الأيقونات 3D (${editCost} ريشة)`}</button>
              </div>
            );
          })()}
          <Sub>الخط</Sub>
          <div className="flex flex-wrap gap-2">
            {DFONTS.map((f) => <button key={f.id} type="button" aria-pressed={spec.font === f.id} onClick={() => setSpec({ ...spec, font: f.id })} className="chip" style={{ fontFamily: f.id }}>{f.label}</button>)}
          </div>
          <Sub>المقاس</Sub>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map(([a, l]) => <button key={a} type="button" aria-pressed={spec.aspect === a} onClick={() => setSpec({ ...spec, aspect: a })} className="chip">{l}</button>)}
          </div>
        </Card>

        <Card title="الألوان" icon="🖌️">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(Object.keys(COLOR_LABELS) as (keyof DColors)[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-[14px]">
                {COLOR_LABELS[k]}
                <input type="color" value={spec.colors[k]} onChange={(e) => setColor(k, e.target.value)} aria-label={COLOR_LABELS[k]} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" />
              </label>
            ))}
          </div>
          <Sub>لوحات جاهزة</Sub>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button key={p.name} type="button" onClick={() => setSpec({ ...spec, colors: p.colors })} title={p.name} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pe-3 ps-1 text-[13px]">
                <span className="flex overflow-hidden rounded-full">{[p.colors.bg, p.colors.accent, p.colors.ink].map((c) => <span key={c} className="h-6 w-4" style={{ background: c }} />)}</span>{p.name}
              </button>
            ))}
          </div>
          {kit && <button type="button" onClick={applyBrand} className="btn btn-outline self-start px-4 py-2 text-sm">✨ طبّق هويتي (ألوان، خط، شعار)</button>}
        </Card>

        <Card title="النصوص" icon="✏️">
          {text("kicker", "سطر صغير فوق العنوان", 60)}
          {uses.has("title") && text("title", "العنوان", 90)}
          {text("highlight", "الجزء الملوّن من العنوان", 60)}
          {text("body", s.layout === "quote" ? "النص أو النصيحة" : "الوصف", 320, 3)}
          {uses.has("stat") && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">الرقم الكبير</span><input value={s.stat?.value ?? ""} maxLength={8} onChange={(e) => setSlide({ stat: { ...(s.stat ?? { value: "" }), value: e.target.value } })} className="field py-2.5" placeholder="30%" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">تحته</span><input value={s.stat?.label ?? ""} maxLength={40} onChange={(e) => setSlide({ stat: { ...(s.stat ?? { value: "" }), label: e.target.value } })} className="field py-2.5" /></label>
            </div>
          )}
          {uses.has("items") && <><Sub>{s.layout === "point" ? "الأيقونة والنقاط" : "المزايا"}</Sub><ListEdit list={s.items ?? []} onChange={(items) => setSlide({ items })} max={s.layout === "bold" || s.layout === "bento" || s.layout === "point" ? 4 : 3} placeholder="ميزة" /></>}
          {uses.has("meta") && <><Sub>التفاصيل (تاريخ، وقت، مكان، هاتف)</Sub><ListEdit list={s.meta ?? []} onChange={(meta) => setSlide({ meta })} max={3} placeholder="تفصيل" /></>}
          {uses.has("date") && (
            <div className="grid grid-cols-3 gap-2">
              {(["day", "month", "weekday"] as const).map((k, i) => (
                <label key={k} className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{["اليوم", "الشهر", "اسم اليوم"][i]}</span>
                  <input value={s.date?.[k] ?? ""} maxLength={14} onChange={(e) => { const d = { day: "", month: "", ...(s.date ?? {}), [k]: e.target.value }; setSlide({ date: d.day ? d : { ...d } }); }} className="field py-2.5" /></label>
              ))}
            </div>
          )}
          {uses.has("price") && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["value", "currency", "old", "note"] as const).map((k, i) => (
                <label key={k} className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{["السعر", "العملة", "السعر القديم", "ملاحظة"][i]}</span>
                  <input value={s.price?.[k] ?? ""} maxLength={k === "note" ? 60 : 12} onChange={(e) => setSlide({ price: { value: "", ...(s.price ?? {}), [k]: e.target.value } })} className="field py-2.5" /></label>
              ))}
            </div>
          )}
          {text("badge", "الشارة", 30)}
          {text("cta", "الزر", 30)}
          {uses.has("person") && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">اسم الشخص</span><input value={s.person?.name ?? ""} maxLength={40} onChange={(e) => setSlide({ person: { ...(s.person ?? { name: "" }), name: e.target.value } })} className="field py-2.5" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">صفته</span><input value={s.person?.role ?? ""} maxLength={40} onChange={(e) => setSlide({ person: { ...(s.person ?? { name: "" }), role: e.target.value } })} className="field py-2.5" /></label>
            </div>
          )}
        </Card>

        <Card title="الصور والشعار" icon="🖼️">
          {uses.has("photo") && (
            <div className="flex flex-col gap-3">
              <Sub>صورة {spec.slides.length > 1 ? "الشريحة" : "التصميم"}</Sub>
              <div className="flex flex-wrap items-center gap-3">
                {s.photo?.url && (<img src={s.photo.url} alt="" className="h-20 w-20 rounded-xl object-cover" />)}
                <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">⬆️ ارفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0], (photo) => setSlide({ photo }))} /></label>
                {s.photo && <button type="button" onClick={() => setSlide({ photo: null })} className="text-sm text-red-700 underline">إزالة الصورة</button>}
              </div>
              <div className="flex flex-col gap-2 rounded-2xl bg-tint p-3">
                <span className="text-[14px] font-semibold">أو ولّد صورة بالذكاء الاصطناعي</span>
                {s.photo && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={useRef_} onChange={(e) => setUseRef(e.target.checked)} className="h-4 w-4 accent-navy-700" />حط منتجي (الصورة الحالية) بمشهد احترافي جديد</label>}
                <textarea rows={2} maxLength={600} value={imgPrompt} onChange={(e) => setImgPrompt(e.target.value)} className="field" placeholder="اوصف الصورة: طبق مشاوي على فحم، إضاءة دافئة، لقطة من فوق" />
                <button type="button" disabled={!!busy || imgPrompt.trim().length < 3} onClick={async () => {
                  const d = await call<{ img: DImg }>("image", { index: cur, prompt: imgPrompt, spec: { aspect: spec.aspect }, ref: useRef_ && s.photo ? { path: s.photo.path, bucket: s.photo.bucket } : null }, "image");
                  if (d) setSlide({ photo: d.img, imagePrompt: imgPrompt });
                }} className="btn btn-primary self-start px-4 py-2 text-sm">{busy === "image" ? "جاري التوليد…" : `✨ ولّد الصورة (${editCost} ريشة)`}</button>
              </div>
            </div>
          )}
          {uses.has("person") && s.person && (
            <div className="flex flex-wrap items-center gap-3">
              <Sub>صورة الشخص</Sub>
              {s.person.photo?.url && (<img src={s.person.photo.url} alt="" className="h-14 w-14 rounded-full object-cover" />)}
              <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">⬆️ ارفع<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0], (photo) => setSlide({ person: { ...s.person!, photo } }))} /></label>
              {s.person.photo && <button type="button" onClick={() => setSlide({ person: { ...s.person!, photo: null } })} className="text-sm text-red-700 underline">إزالة</button>}
            </div>
          )}
          <Sub>الشعار والحساب</Sub>
          <div className="flex flex-wrap items-center gap-3">
            {spec.brand.logo?.url && (<img src={spec.brand.logo.url} alt="الشعار" className="h-12 max-w-[120px] rounded-lg bg-tint object-contain p-1" />)}
            <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{spec.brand.logo ? "تغيير الشعار" : "⬆️ ارفع شعار"}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ""; }} /></label>
            {spec.brand.logo && <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={spec.brand.showLogo} onChange={(e) => setSpec({ ...spec, brand: { ...spec.brand, showLogo: e.target.checked } })} className="h-4 w-4 accent-navy-700" />اعرض الشعار</label>}
            {spec.brand.logo && spec.brand.showLogo && <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!spec.brand.box} onChange={(e) => setSpec({ ...spec, brand: { ...spec.brand, box: e.target.checked ? DEFAULT_LOGO_BOX : null } })} className="h-4 w-4 accent-navy-700" />تحريك وتكبير حر</label>}
          </div>
          {spec.brand.box && spec.brand.logo && spec.brand.showLogo && <LogoSize box={spec.brand.box} onChange={(box) => setSpec({ ...spec, brand: { ...spec.brand, box } })} />}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">اسم النشاط</span><input value={spec.brand.name ?? ""} maxLength={50} onChange={(e) => setSpec({ ...spec, brand: { ...spec.brand, name: e.target.value } })} className="field py-2.5" /></label>
            <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">الحساب أو الرقم</span><input dir="auto" value={spec.brand.handle ?? ""} maxLength={60} onChange={(e) => setSpec({ ...spec, brand: { ...spec.brand, handle: e.target.value } })} className="field py-2.5" /></label>
          </div>
          {busy === "upload" && <p className="text-[14px] text-subtle">جاري الرفع…</p>}
        </Card>

        <Card title="عدّل بالذكاء الاصطناعي" icon="🪄">
          <textarea rows={3} maxLength={800} value={instruction} onChange={(e) => setInstruction(e.target.value)} className="field"
            placeholder="مثال: خلّ العنوان أقوى وأقصر، وغيّر الألوان لستايل فخم داكن، وأضف شريحة عن التوصيل" />
          <button type="button" disabled={!!busy || instruction.trim().length < 3} onClick={async () => {
            const d = await call<{ spec: DesignSpec }>("revise", { instruction, spec }, "revise");
            if (d) { setSpec(d.spec); setCur(Math.min(cur, d.spec.slides.length - 1)); setInstruction(""); }
          }} className="btn btn-primary self-start px-5 py-2.5">{busy === "revise" ? "شاهين يعدّل…" : `طبّق التعديل (${editCost} ريشة)`}</button>
        </Card>

        <Card title="الكابشن" icon="📝">
          <textarea rows={5} maxLength={2200} value={caption} onChange={(e) => spec.kind === "carousel" ? setSpec({ ...spec, caption: e.target.value }) : setSlide({ caption: e.target.value })} className="field" placeholder="نص المنشور اللي ينكتب تحت التصميم" />
          <button type="button" onClick={() => { navigator.clipboard?.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="btn btn-outline self-start px-4 py-2 text-sm">{copied ? "✓ انتسخ" : "📋 نسخ الكابشن"}</button>
        </Card>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
        <button type="button" disabled={!!busy} onClick={async () => {
          const d = await call<{ ok: boolean }>("export", { spec }, "export");
          if (d) { setSent(true); setRender({ status: "queued", progress: 0, files: [] }); }
        }} className="btn btn-gold py-4 text-[17px]">{busy === "export" ? "جاري الإرسال…" : `⬇️ صدّر ${spec.slides.length > 1 ? `${spec.slides.length} صور` : "الصورة"} PNG (مجاناً)`}</button>
      </div>
    </div>
    </>
  );
}
