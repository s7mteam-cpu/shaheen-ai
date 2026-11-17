"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";

const kinds = [["personal", "شخصية"], ["company", "شركة"], ["brand", "براند / متجر"]] as const;

/** «بطاقات العمل»: the details go in; the AI designs a front (and back) the customer then edits in the studio. */
export function BCardStart({ cost, balance, hasKit }: { cost: number; balance: number; hasKit: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<string>("personal");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  const [style, setStyle] = useState("");
  const [sides, setSides] = useState(2);
  const [kit, setKit] = useState(hasKit);
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
    const k = kinds.find((x) => x[0] === kind)![1];
    const line = (l: string, v: string) => (v.trim() ? `${l}: ${v.trim()}\n` : "");
    const info = `نوع البطاقة: ${k}\n${line("الاسم", name)}${line("المسمى الوظيفي أو المجال", role)}${line("اسم الشركة أو البراند", company)}${line("الجوال", phone)}${line("البريد الإلكتروني", email)}${line("الموقع أو حساب التواصل", web)}${line("العنوان", address)}${line("العبارة التعريفية", tagline)}${line("الستايل المطلوب", style)}`;
    try {
      const r = await fetch("/api/design/start", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: "business-cards", info, count: sides, useBrand: kit, aiImages: false }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/business-cards?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );
  const field = (label: string, v: string, set: (s: string) => void, ph = "", ltr = false) => (
    <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L(label)}</span>
      <input value={v} maxLength={120} onChange={(e) => set(e.target.value)} placeholder={L(ph)} dir={ltr ? "ltr" : undefined} className="field" /></label>
  );
  const ready = (name.trim() || company.trim()).length >= 2;
  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("نوع البطاقة")}</span>{chips(kinds, kind, setKind)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field(kind === "personal" ? "الاسم" : "الاسم (اختياري)", name, setName, "مثال: خالد المطيري")}
        {field("المسمى الوظيفي / المجال", role, setRole, "مثال: مدير تسويق")}
        {field("اسم الشركة / البراند", company, setCompany, "مثال: شركة الأفق")}
        {field("الجوال", phone, setPhone, "+965 0000 0000", true)}
        {field("البريد الإلكتروني", email, setEmail, "name@company.com", true)}
        {field("الموقع أو حساب التواصل", web, setWeb, "www.company.com", true)}
      </div>
      {field("العنوان (اختياري)", address, setAddress, "الكويت، شرق، برج ...")}
      {field("عبارة تعريفية (اختياري)", tagline, setTagline, "مثال: حلول تسويق تصنع الفرق")}
      <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("الستايل اللي تبيه (اختياري)")}</span>
        <textarea rows={2} maxLength={300} value={style} onChange={(e) => setStyle(e.target.value)} className="field" placeholder={L("مثال: فخم بالأسود والذهبي، أو بسيط وعصري بألوان زاهية. لو تركته فاضي شاهين يختار الأنسب لمجالك.")} /></label>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("وجه واحد أو وجهين؟")}</span>{chips([[1, "وجه واحد"], [2, "وجه وظهر"]] as const, sides, setSides)}</div>
      {hasKit && <label className="flex items-center gap-3"><input type="checkbox" checked={kit} onChange={(e) => setKit(e.target.checked)} className="h-5 w-5" /><span>{L("استخدم شعاري وألوان هويتي")}</span></label>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يصمم بطاقتك…")} /> : (
        <button disabled={!ready || balance < cost} className="btn btn-gold py-3.5 text-[16px]">💳 {L("صمّم بطاقتي")} · {cost} {L("ريشة")}</button>
      )}
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تغيّر التخطيط والألوان والخط وأماكن النصوص، وتنزّل البطاقة بجودة الطباعة (300 نقطة).")}</p>
    </form>
  );
}
