"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";

const occasions = [["زفاف", "زفاف"], ["خطوبة", "خطوبة"], ["ملكة", "ملكة / عقد قران"], ["مولود", "مولود جديد"], ["تخرج", "تخرج"], ["عيد ميلاد", "عيد ميلاد"], ["مناسبة", "مناسبة أخرى"]] as const;

/** «دعوات ومناسبات»: the details go in; the AI designs the invitation (and a details page) the customer then edits in the studio. */
export function InviteStart({ cost, balance, hasKit }: { cost: number; balance: number; hasKit: boolean }) {
  const router = useRouter();
  const [occasion, setOccasion] = useState("زفاف");
  const [names, setNames] = useState("");
  const [host, setHost] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [rsvp, setRsvp] = useState("");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [style, setStyle] = useState("");
  const [sides, setSides] = useState(2);
  const [kit, setKit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.05), 500);
    return () => clearInterval(t);
  }, [busy]);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const line = (l: string, v: string) => (v.trim() ? `${l}: ${v.trim()}\n` : "");
    let when = "";
    if (date) {
      const d = new Date(`${date}T12:00:00`);
      when = `${d.toLocaleDateString("ar-u-nu-latn", { weekday: "long" })} ${d.getDate()} ${d.toLocaleDateString("ar-u-nu-latn", { month: "long" })} ${d.getFullYear()}`;
    }
    const info = `نوع المناسبة: ${occasion}\n${line("الأسماء أو عنوان الدعوة", names)}${line("الداعي (من يدعو)", host)}${line("التاريخ", when)}${line("الوقت", time)}${line("المكان", venue)}${line("للتأكيد والتواصل", rsvp)}${line("ملاحظات للضيوف (الزي، الاستقبال...)", notes)}${line("نص الدعوة الذي يريده العميل (يُستخدم حرفياً)", text)}${line("الستايل المطلوب", style)}`;
    try {
      const r = await fetch("/api/design/start", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: "invitations", info, count: sides, useBrand: kit, aiImages: false }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/invitations?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );
  const field = (label: string, v: string, set: (s: string) => void, ph = "") => (
    <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L(label)}</span>
      <input value={v} maxLength={160} onChange={(e) => set(e.target.value)} placeholder={L(ph)} className="field" /></label>
  );
  const ready = names.trim().length >= 2;
  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("نوع المناسبة")}</span>{chips(occasions, occasion, setOccasion)}</div>
      {field("الأسماء أو عنوان الدعوة", names, setNames, "مثال: محمد وسارة")}
      {field("الداعي (اختياري)", host, setHost, "مثال: آل المطيري وآل العنزي")}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("التاريخ")}</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" /></label>
        {field("الوقت", time, setTime, "مثال: 8:00 مساءً")}
      </div>
      {field("المكان", venue, setVenue, "مثال: قاعة الريحان، السالمية")}
      {field("للتأكيد والتواصل (اختياري)", rsvp, setRsvp, "مثال: 9999 8888")}
      {field("ملاحظات للضيوف (اختياري)", notes, setNotes, "مثال: الزي رسمي، الاستقبال من 7:30")}
      <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("نص الدعوة (اختياري)")}</span>
        <textarea rows={3} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} className="field" placeholder={L("لو كتبته، شاهين يستخدمه كما هو بدون تغيير. لو تركته فاضي، يكتب لك نصاً مناسباً.")} /></label>
      <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("الستايل اللي تبيه (اختياري)")}</span>
        <textarea rows={2} maxLength={300} value={style} onChange={(e) => setStyle(e.target.value)} className="field" placeholder={L("مثال: فخم بالذهبي والكحلي، أو ورود وألوان باستيل، أو عصري بسيط.")} /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("وجه واحد أو وجهين؟")}</span>{chips([[1, "وجه واحد"], [2, "وجه + صفحة تفاصيل"]] as const, sides, setSides)}</div>
      {hasKit && <label className="flex items-center gap-3"><input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} className="h-5 w-5" /><span>{L("استخدم ألوان هويتي")}</span></label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يصمم دعوتك…")} /> : (
        <button disabled={!ready || balance < cost} className="btn btn-gold py-3.5 text-[16px]">💌 {L("صمّم دعوتي")} · {cost} {L("ريشة")}</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تغيّر التخطيط والألوان والخط والنصوص، وتنزّل الدعوة صورة جاهزة للإرسال أو الطباعة.")}</p>
    </form>
  );
}
