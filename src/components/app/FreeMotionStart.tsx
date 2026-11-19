"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { BRANDS, type BrandId } from "@/remotion/brandIcons";

type Field = { key: string; label: string; value: string };
type Contact = { icon: BrandId; handle: string };
type Colors = { bg: string; accent: string; text: string };
type Done = { status: "done"; title: string; video: string; aspect: string; seconds: number; idea: string; editError: string; fields: Field[]; colors: Colors; font: string; contact: Contact[]; brand: string };
type State = Done | { status: "queued" | "running"; progress: number; rerender?: boolean } | { status: "failed"; error: string };

const sizes = [["9:16", "📱 ريلز 9:16"], ["16:9", "▶️ يوتيوب 16:9"], ["1:1", "⬜ مربع 1:1"], ["4:5", "🖼️ طولي 4:5"]] as const;
const fonts = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const social = Object.keys(BRANDS) as BrandId[];

/** «تصميم مبتكر ✨»: the customer writes an idea; the AI writes a motion design as code and the worker renders it. Texts and colours can be edited afterwards. */
export function FreeMotionStart({ costPer15, editCost, balance }: { costPer15: number; editCost: number; balance: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const jobId = sp.get("job");
  const [idea, setIdea] = useState("");
  const [brand, setBrand] = useState("");
  const [aspect, setAspect] = useState("9:16");
  const [seconds, setSeconds] = useState(15);
  const [colors, setColors] = useState<Colors>({ bg: "#0B2A4A", accent: "#E8B44C", text: "#FFFFFF" });
  const [font, setFont] = useState("Cairo");
  const [contact, setContact] = useState<Contact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [ecolors, setEcolors] = useState<Colors>(colors);
  const [efont, setEfont] = useState("Cairo");
  const [econtact, setEcontact] = useState<Contact[]>([]);
  const [simIdea, setSimIdea] = useState("");
  const loaded = useRef<string | null>(null);
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15;

  const poll = useCallback(async () => {
    if (!jobId) return;
    const r = await fetch(`/api/free-motion?job=${jobId}`, { cache: "no-store" }).catch(() => null);
    if (!r) return;
    const d = (await r.json().catch(() => null)) as State | null;
    if (!d || !("status" in d)) return;
    setState(d);
    if (d.status === "done" && loaded.current !== `${jobId}:${d.video}`) {
      loaded.current = `${jobId}:${d.video}`;
      setFields(d.fields); setEcolors(d.colors); setEfont(d.font); setEcontact(d.contact); setSimIdea(d.idea);
    }
  }, [jobId]);
  useEffect(() => {
    if (!jobId) { setState(null); return; }
    poll();
    const t = setInterval(() => { poll(); }, 3500);
    return () => clearInterval(t);
  }, [jobId, poll]);

  async function start(e: React.FormEvent, from?: string) {
    e.preventDefault(); setBusy(true); setError(null);
    const body = from ? { idea: simIdea, aspect: (state as Done).aspect, seconds: (state as Done).seconds, brand: (state as Done).brand, colors: ecolors, font: efont, contact: econtact, fromJob: from } : { idea, aspect, seconds, brand, colors, font, contact };
    const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? L("تعذّر البدء.")); return; }
    loaded.current = null;
    router.replace(`/app/tools/free-motion?job=${d.jobId}`);
    router.refresh();
  }
  async function apply() {
    setBusy(true); setError(null);
    const r = await fetch("/api/free-motion/edit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ job: jobId, fields, colors: ecolors, font: efont, contact: econtact }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? L("تعذّر التعديل.")); return; }
    loaded.current = null; setState({ status: "queued", progress: 0, rerender: true });
  }
  const setCol = (k: keyof Colors, v: string, edit: boolean) => (edit ? setEcolors : setColors)((c) => ({ ...c, [k]: v }));
  const colorRow = (c: Colors, edit: boolean) => (
    <div className="flex flex-wrap gap-4">
      {([["bg", "الخلفية"], ["accent", "اللون المميّز"], ["text", "الخط"]] as const).map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-[14px]"><input type="color" value={c[k]} onChange={(e) => setCol(k, e.target.value, edit)} className="h-9 w-12 cursor-pointer rounded border" />{L(l)}</label>
      ))}
    </div>
  );
  const contactRow = (list: Contact[], set: (c: Contact[]) => void) => (
    <div className="flex flex-col gap-2">
      {list.map((c, i) => (
        <div key={i} className="flex gap-2">
          <select value={c.icon} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, icon: e.target.value as BrandId } : x)))} className="field w-36">{social.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <input dir="ltr" value={c.handle} maxLength={40} onChange={(e) => set(list.map((x, j) => (j === i ? { ...x, handle: e.target.value } : x)))} className="field flex-1 text-start" placeholder="@username" />
          <button type="button" onClick={() => set(list.filter((_, j) => j !== i))} className="btn btn-outline px-3" aria-label={L("حذف")}>✕</button>
        </div>
      ))}
      {list.length < 6 && <button type="button" onClick={() => set([...list, { icon: "instagram", handle: "" }])} className="btn btn-outline self-start px-4 py-2 text-[14px]">+ {L("أضف حساب")}</button>}
    </div>
  );

  if (jobId && state && state.status !== "done" && state.status !== "failed") {
    return <div className="card max-w-2xl p-6"><Progress value={state.progress || 5} label={state.rerender ? L("شاهين يطبّق تعديلاتك…") : L("شاهين يصمّم ويرسم فكرتك… (دقيقتين إلى خمس)")} /><p className="mt-3 text-[13px] text-subtle">{L("تقدر تطلع من الصفحة، تلقاه بـ«أعمالي» لما يخلص.")}</p></div>;
  }
  if (jobId && state?.status === "failed") {
    return <div className="card max-w-2xl p-6"><p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{state.error}</p><button onClick={() => router.replace("/app/tools/free-motion")} className="btn btn-gold mt-4 px-5 py-2.5">{L("جرّب فكرة ثانية")}</button></div>;
  }
  if (jobId && state?.status === "done") {
    const d = state;
    return (
      <div className="flex max-w-4xl flex-col gap-5">
        <div className="card flex flex-col gap-5 p-5 sm:flex-row sm:p-6">
          <video src={d.video} controls playsInline className="mx-auto max-h-[560px] w-full max-w-[320px] rounded-2xl bg-black sm:mx-0" />
          <div className="flex flex-1 flex-col gap-4">
            <h2 className="text-[20px] font-bold text-navy-900">{d.title}</h2>
            {d.editError && <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900">{L(d.editError)}</p>}
            <div className="flex flex-col gap-2">
              <span className="font-semibold">{L("النصوص")}</span>
              {fields.map((f, i) => <label key={f.key} className="flex flex-col gap-1 text-[13px] text-subtle">{f.label}<input value={f.value} maxLength={200} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="field text-[15px] text-ink" /></label>)}
            </div>
            <div className="flex flex-col gap-2"><span className="font-semibold">{L("الألوان")}</span>{colorRow(ecolors, true)}</div>
            <label className="flex items-center gap-2 text-[14px]">{L("الخط")}<select value={efont} onChange={(e) => setEfont(e.target.value)} className="field w-40">{fonts.map((f) => <option key={f}>{f}</option>)}</select></label>
            <div className="flex flex-col gap-2"><span className="font-semibold">{L("حسابات التواصل")}</span>{contactRow(econtact, setEcontact)}</div>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
            <button disabled={busy} onClick={apply} className="btn btn-gold py-3 text-[15px]">🔄 {L("طبّق التعديلات (مجاناً)")}</button>
            <a href={d.video} download className="btn btn-outline py-3 text-center text-[15px]">⬇️ {L("تحميل الفيديو")}</a>
          </div>
        </div>
        <form onSubmit={(e) => start(e, jobId)} className="card flex flex-col gap-3 p-5 sm:p-6">
          <h3 className="font-bold text-navy-900">✨ {L("سوّ مثله بفكرة جديدة")}</h3>
          <p className="text-[13px] text-subtle">{L("نفس التصميم والحركات، بس بالكلام والمعلومات الجديدة.")}</p>
          <textarea required minLength={10} maxLength={1500} rows={3} value={simIdea} onChange={(e) => setSimIdea(e.target.value)} className="field" />
          <button disabled={busy || balance < editCost} className="btn btn-gold py-3">{L("سوّ مثله")} ({editCost} {L("ريشة")})</button>
        </form>
      </div>
    );
  }
  return (
    <form onSubmit={start} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900">{L("ميزة تجريبية: شاهين يصمّم موشن جرافيك من الصفر بدل القوالب الجاهزة. إذا فشل التصميم ترجع لك ريشك كاملة.")}</p>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("شو الفكرة؟")}</span>
        <textarea required minLength={10} maxLength={1500} rows={5} value={idea} onChange={(e) => setIdea(e.target.value)} className="field" placeholder={L("مثال: إعلان لمطعم مندي بالكويت، افتتاح فرع جديد، خصم 20% أول أسبوع، أجواء فخمة بالذهبي…")} /></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("اسم النشاط (اختياري)")}</span><input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={60} className="field" /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span><div className="flex flex-wrap gap-2">{sizes.map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)} className="chip">{L(l)}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span><div className="flex gap-2">{[15, 30].map((s) => <button key={s} type="button" aria-pressed={seconds === s} onClick={() => setSeconds(s)} className="chip">{s} {L("ثانية")}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("ألوان هويتك")}</span>{colorRow(colors, false)}</div>
      <label className="flex items-center gap-2 text-[14px]">{L("الخط")}<select value={font} onChange={(e) => setFont(e.target.value)} className="field w-40">{fonts.map((f) => <option key={f}>{f}</option>)}</select></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("حسابات التواصل (اختياري)")}</span>{contactRow(contact, setContact)}</div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
      <button disabled={busy || idea.trim().length < 10 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("صمّم")} ({cost} {L("ريشة")})</button>
      {balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك ما يكفي.")}</p>}
    </form>
  );
}
