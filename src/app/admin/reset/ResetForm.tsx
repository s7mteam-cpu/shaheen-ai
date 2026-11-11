"use client";
import { useActionState, useState } from "react";
import { resetPlatform } from "./actions";

export type Counts = { customers: number; jobs: number; moves: number; leads: number; subs: number };

export function ResetForm({ phrase, counts }: { phrase: string; counts: Counts }) {
  const [state, action, pending] = useActionState(resetPlatform, undefined);
  const [pick, setPick] = useState({ overview: false, credits: false, jobs: false, customers: false, leads: false, changelog: false });
  const [sure, setSure] = useState(false);
  const [text, setText] = useState("");
  const any = Object.values(pick).some(Boolean);
  const ready = any && sure && text.trim() === phrase;
  const opts: { key: keyof typeof pick; title: string; desc: string }[] = [
    { key: "overview", title: "تصفير النظرة العامة", desc: `يرجّع كل أرقام «نظرة عامة» صفر: يمسح الاشتراكات (${counts.subs.toLocaleString("en")}) والإيراد وكل الطلبات والريش المستهلكة والإشعارات. (يشمل الخيارين اللي تحته تلقائياً). عدد الحسابات ما بيتصفّر إلا إذا حذفت العملاء.` },
    { key: "credits", title: "تصفير الريش (الداخل والطالع)", desc: `يمسح كل حركات الريش (${counts.moves.toLocaleString("en")} حركة): الصرف والشحن والاسترجاع والهدايا، ويصير رصيد كل الحسابات صفر. الحسابات نفسها بتظل.` },
    { key: "jobs", title: "حذف كل الأعمال والملفات", desc: `يمسح كل الأعمال (${counts.jobs.toLocaleString("en")}) والصور والفيديوهات المرفوعة والنتائج، لكل الحسابات.` },
    { key: "customers", title: "حذف حسابات العملاء كلهم", desc: `يحذف ${counts.customers.toLocaleString("en")} حساب عميل نهائياً مع اشتراكاتهم وهوياتهم وكل اللي إلهم. يقدروا يسجّلوا من جديد. حسابات المدراء ما بتنحذف.` },
    { key: "leads", title: "حذف طلبات الإدارة الكاملة", desc: `يمسح ${counts.leads.toLocaleString("en")} طلب وصل من نموذج باقة الإدارة الكاملة.` },
    { key: "changelog", title: "مسح قائمة آخر التعديلات", desc: "يفضّي صفحة «آخر التعديلات». التحديثات الجاية بتطلع فيها من جديد." },
  ];
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="card flex flex-col gap-2 p-5">
        <legend className="mb-1 px-1 text-lg font-bold text-navy-900">شو بدك تصفّر؟</legend>
        {opts.map((o) => (
          <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${pick[o.key] ? "border-red-300 bg-red-50/70" : "border-line"}`}>
            <input type="checkbox" name={o.key} checked={pick[o.key]} onChange={(e) => setPick({ ...pick, [o.key]: e.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-red-700" />
            <span className="flex flex-col gap-0.5"><span className="font-bold text-navy-900">{o.title}</span><span className="text-[13px] leading-6 text-subtle">{o.desc}</span></span>
          </label>
        ))}
        <p className="mt-1 text-[13px] text-subtle">تصفير كامل = علّم الكل. الباقات والأسعار والأدوات ومحتوى الموقع وحسابات المدراء بتظل دائماً.</p>
      </fieldset>
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 p-5">
        <label className="flex cursor-pointer items-start gap-2.5 text-[15px] font-semibold text-red-900">
          <input type="checkbox" name="sure" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-red-700" />
          أفهم إن التصفير نهائي، وما في أي طريقة لإرجاع البيانات بعده.
        </label>
        <label htmlFor="reset-confirm" className="text-sm font-semibold">للتأكيد اكتب: <strong className="text-red-700">{phrase}</strong></label>
        <input id="reset-confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="field max-w-xs bg-white" />
        {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
        <button disabled={!ready || pending} className="btn self-start bg-red-700 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-40">
          {pending ? "جارٍ التصفير… لا تسكّر الصفحة" : "صفّر اللي اخترته"}
        </button>
      </div>
    </form>
  );
}
