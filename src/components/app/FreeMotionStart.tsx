"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { BRANDS, type BrandId } from "@/remotion/brandIcons";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { VOICE_TYPES } from "@/lib/voiceMatch";
import { FreeStudio, type StudioData } from "@/components/app/FreeStudio";

type Contact = { icon: BrandId; handle: string };
type Colors = { bg: string; accent: string; text: string };
type State = StudioData | { status: "queued" | "running"; progress: number } | { status: "failed"; error: string; reason?: string };

const sizes = [["9:16", "📱 ريلز 9:16"], ["16:9", "▶️ يوتيوب 16:9"], ["1:1", "⬜ مربع 1:1"], ["4:5", "🖼️ طولي 4:5"]] as const;
const fonts = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const social = Object.keys(BRANDS) as BrandId[];

/** «تصميم مبتكر ✨»: the customer writes an idea; the AI writes a motion design as code and the worker renders it. Texts and colours can be edited afterwards. */
export function FreeMotionStart({ costPer15, editCost, balance, kitLogo, kit }: { costPer15: number; editCost: number; balance: number; kitLogo?: { path: string; url: string } | null; kit?: { name: string; colors: string[]; font: string } | null }) {
  const router = useRouter();
  const sp = useSearchParams();
  const jobId = sp.get("job");
  const [idea, setIdea] = useState("");
  const [brand, setBrand] = useState(kit?.name ?? "");
  const [useIdentity, setUseIdentity] = useState(true);
  const [aspect, setAspect] = useState("9:16");
  const [seconds, setSeconds] = useState(15);
  const [colors, setColors] = useState<Colors>(() => {
    const c = kit?.colors ?? [];
    if (!c.length) return { bg: "#0B2A4A", accent: "#E8B44C", text: "#FFFFFF" };
    // from the customer's own brand kit: first colour = background, second = accent, text = white or black by what reads on the background
    const lum = (h: string) => { const v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    return { bg: c[0], accent: c[1] ?? "#E8B44C", text: lum(c[0]) > 0.45 ? "#111111" : "#FFFFFF" };
  });
  const [font, setFont] = useState(kit?.font ?? "Cairo");
  const [contact, setContact] = useState<Contact[]>([]);
  const [voiceover, setVoiceover] = useState(true);
  const [dialect, setDialect] = useState("kuwaiti");
  useEffect(() => { setDialect(myDialect()); }, []);
  const [vtype, setVtype] = useState("auto");
  const [withMusic, setWithMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [busyNow, setBusyNow] = useState<StudioData["busy"]>(null);
  const stopped = useRef(false);
  const waitBusy = useRef(0); // after revoice/export: ignore "not busy" answers for a moment, the worker may not have picked the job up yet
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15;

  const poll = useCallback(async () => {
    if (!jobId) return;
    const r = await fetch(`/api/free-motion?job=${jobId}`, { cache: "no-store" }).catch(() => null);
    if (!r) return;
    const d = (await r.json().catch(() => null)) as State | null;
    if (!d || !("status" in d)) return;
    if (d.status === "studio") {
      if (d.busy) waitBusy.current = 0;
      else if (waitBusy.current && Date.now() < waitBusy.current) return;
      setBusyNow(d.busy);
      setStudio((p) => (!p || !d.busy ? d : p)); // while something is being recorded/exported the studio keeps its links (they change on every request)
      stopped.current = !d.busy;
    } else { setState(d); stopped.current = d.status === "failed"; }
  }, [jobId]);
  useEffect(() => {
    setStudio(null); setBusyNow(null); setState(null); stopped.current = false;
    if (!jobId) return;
    poll();
    const t = setInterval(() => { if (!stopped.current) poll(); }, 3500);
    return () => clearInterval(t);
  }, [jobId, poll]);

  async function startFrom(ideaText: string, opts: { dialect: string; vtype: string; music: boolean }, from: string): Promise<string | null> {
    const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea: ideaText, aspect: studio?.aspect ?? "9:16", seconds: [15, 30, 60, 120].reduce((a, c) => (Math.abs(c - (studio?.cseconds ?? 15)) < Math.abs(a - (studio?.cseconds ?? 15)) ? c : a), 15), brand: studio?.brand ?? "", colors: studio?.colors, font: studio?.font, contact: studio?.contact, fromJob: from, voiceover: studio?.voiceover, dialect: opts.dialect, vtype: opts.vtype, music: opts.music }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return d.error ?? L("تعذّر البدء.");
    router.replace(`/app/tools/free-motion?job=${d.jobId}`);
    router.refresh();
    return null;
  }
  async function start(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea, aspect, seconds, brand, colors, useIdentity, font, contact, voiceover, dialect, vtype, music: withMusic }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? L("تعذّر البدء.")); return; }
    router.replace(`/app/tools/free-motion?job=${d.jobId}`);
    router.refresh();
  }
  const colorRow = (c: Colors) => (
    <div className="flex flex-wrap gap-4">
      {([["bg", "الخلفية"], ["accent", "اللون المميّز"], ["text", "الخط"]] as const).map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-[14px]"><input type="color" value={c[k]} onChange={(e) => setColors((o) => ({ ...o, [k]: e.target.value }))} className="h-9 w-12 cursor-pointer rounded border" />{L(l)}</label>
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

  if (jobId && studio) return <FreeStudio key={jobId} jobId={jobId} data={studio} busy={busyNow} kitLogo={kitLogo} editCost={editCost} balance={balance} onRefresh={() => { stopped.current = false; waitBusy.current = Date.now() + 30000; setBusyNow({ kind: "export", progress: 3 }); poll(); }} onSimilar={(i, o) => startFrom(i, o, jobId)} />;
  if (jobId && state?.status === "failed") {
    return <div className="card max-w-2xl p-6"><p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{state.error}</p>{state.reason && <p dir="ltr" className="mt-3 rounded-lg bg-neutral-100 p-3 text-start text-[12px] text-neutral-600">{state.reason}</p>}<button onClick={() => router.replace("/app/tools/free-motion")} className="btn btn-gold mt-4 px-5 py-2.5">{L("جرّب فكرة ثانية")}</button></div>;
  }
  if (jobId) {
    const pr = state && "progress" in state ? state.progress : 3;
    return <div className="card max-w-2xl p-6"><Progress value={pr || 5} label={L("شاهين يصمّم فكرتك… (دقيقتين إلى خمس)")} /><p className="mt-3 text-[13px] text-subtle">{L("بعدها تنفتح لك المعاينة المباشرة وتعدّل عليها قبل التصدير.")} {L("تقدر تطلع من الصفحة، تلقاه بـ«أعمالي» لما يخلص.")}</p></div>;
  }
  return (
    <form onSubmit={start} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900">{L("ميزة تجريبية: شاهين يصمّم موشن جرافيك من الصفر بدل القوالب الجاهزة. إذا فشل التصميم ترجع لك ريشك كاملة.")}</p>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("شو الفكرة؟")}</span>
        <textarea required minLength={10} maxLength={1500} rows={5} value={idea} onChange={(e) => setIdea(e.target.value)} className="field" placeholder={L("مثال: إعلان لمطعم مندي بالكويت، افتتاح فرع جديد، خصم 20% أول أسبوع، أجواء فخمة بالذهبي…")} /></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L("اسم النشاط (اختياري)")}</span><input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={60} className="field" /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span><div className="flex flex-wrap gap-2">{sizes.map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)} className="chip">{L(l)}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span><div className="flex gap-2">{([[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"], [120, "دقيقتين"]] as const).map(([s, l]) => <button key={s} type="button" aria-pressed={seconds === s} onClick={() => setSeconds(s)} className="chip">{L(l)}</button>)}</div></div>
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={voiceover} onChange={(e) => setVoiceover(e.target.checked)} />{L("تعليق صوتي (والصورة تمشي مع الكلام)")}</label>
        {voiceover && (<>
          <label className="flex items-center gap-2 text-[14px]">{L("اللهجة")}<select value={dialect} onChange={(e) => setDialect(e.target.value)} className="field w-48">{GULF_DIALECTS.map(([v, ar]) => <option key={v} value={v}>{ar}</option>)}</select></label>
          <label className="flex items-center gap-2 text-[14px]">{L("الصوت")}<select value={vtype} onChange={(e) => setVtype(e.target.value)} className="field w-48">{VOICE_TYPES.map(([v, l]) => <option key={v} value={v}>{L(l)}</option>)}</select></label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={withMusic} onChange={(e) => setWithMusic(e.target.checked)} />{L("موسيقى هادية بالخلفية")}</label>
        </>)}
      </div>
      <label className="flex items-center gap-2 text-[14px] font-semibold"><input type="checkbox" checked={useIdentity} onChange={(e) => setUseIdentity(e.target.checked)} className="h-4 w-4 accent-navy-700" />{L("طبّق هويتي (ألوانها)")}</label>
      {useIdentity ? <div className="flex flex-col gap-2"><span className="font-semibold">{L("ألوان هويتك")}</span>{colorRow(colors)}</div> : <p className="text-[13px] text-subtle">{L("بدون هويتك: المصمم يختار الألوان المناسبة للفكرة، وإذا كتبت ألوان بالنص يلتزم بها. تقدر تغيّرها بعد التصميم.")}</p>}
      <label className="flex items-center gap-2 text-[14px]">{L("الخط")}<select value={font} onChange={(e) => setFont(e.target.value)} className="field w-40">{fonts.map((f) => <option key={f}>{f}</option>)}</select></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("حسابات التواصل (اختياري)")}</span>{contactRow(contact, setContact)}</div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
      <button disabled={busy || idea.trim().length < 10 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">✨ {L("صمّم")} ({cost} {L("ريشة")})</button>
      {balance < cost && <p className="text-center text-[13px] text-red-700">{L("رصيدك ما يكفي.")}</p>}
    </form>
  );
}
