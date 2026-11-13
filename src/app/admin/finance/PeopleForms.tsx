"use client";
import { useActionState, useEffect, useRef } from "react";
import { addPartner, addMove, addPeriod, addEmployee, payEmployee, closePeriod, reopenPeriod } from "./actions";
import { LT } from "@/lib/i18n/ui";

type R = { ok?: string; error?: string } | undefined;
const today = () => new Date().toISOString().slice(0, 10);
function Msg({ s }: { s: R }) {
  if (s?.ok) return <p role="status" className="text-sm font-semibold text-emerald-700">{s.ok}</p>;
  if (s?.error) return <p role="alert" className="text-sm font-semibold text-red-700">{s.error}</p>;
  return null;
}
function useReset(s: R) { const ref = useRef<HTMLFormElement>(null); useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]); return ref; }
const F = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={`flex flex-col gap-1 text-[13px] font-semibold text-navy-900 ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>
);
const Cur = ({ name = "currency", def = "KWD" }: { name?: string; def?: string }) => (
  <select name={name} defaultValue={def} className="field w-28" aria-label={LT("العملة", "Currency")}><option value="KWD">{LT("د.ك دينار", "KWD")}</option><option value="USD">{LT("$ دولار", "USD")}</option></select>
);

export function PeriodForm() {
  const [s, act, pending] = useActionState(addPeriod, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-4">
      <F label={LT("اسم الدورة", "Cycle name")}><input name="name" required placeholder={LT("مثلاً: الدورة الأولى", "e.g. First cycle")} className="field font-normal" /></F>
      <F label={LT("من", "From")}><input name="from" type="date" required className="field font-normal" /></F>
      <F label={LT("إلى", "To")}><input name="to" type="date" required className="field font-normal" /></F>
      <F label={LT("ملاحظة", "Note")}><input name="note" className="field font-normal" /></F>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "…" : LT("احفظ الدورة", "Save cycle")}</button><Msg s={s} /></div>
    </form>
  );
}

export function PartnerForm() {
  const [s, act, pending] = useActionState(addPartner, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-3">
      <F label={LT("الاسم", "Name")}><input name="name" required className="field font-normal" /></F>
      <F label={LT("النسبة % (اختياري، للاقتراح بس)", "Share % (optional, a suggestion only)")}><input name="share" inputMode="decimal" defaultValue="0" dir="ltr" className="field text-right font-normal" /></F>
      <F label={LT("تاريخ الدخول", "Joined on")}><input name="joined_on" type="date" className="field font-normal" /></F>
      <F label={LT("الهاتف", "Phone")}><input name="phone" dir="ltr" className="field text-right font-normal" /></F>
      <F label={LT("الإيميل", "Email")}><input name="email" type="email" dir="ltr" className="field text-right font-normal" /></F>
      <F label={LT("ملاحظة", "Note")}><input name="note" className="field font-normal" /></F>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "…" : LT("إضافة شريك", "Add partner")}</button><Msg s={s} /></div>
    </form>
  );
}

export function MoveForm({ partners }: { partners: { id: string; name: string }[] }) {
  const [s, act, pending] = useActionState(addMove, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-3">
      <F label={LT("الشريك", "Partner")}><select name="partner_id" required className="field font-normal"><option value="">—</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
      <F label={LT("النوع", "Type")}><select name="kind" className="field font-normal"><option value="withdrawal">{LT("سحب (أخذ من الشركة)", "Withdrawal (took money out)")}</option><option value="capital">{LT("إيداع (حط بالشركة)", "Capital (put money in)")}</option></select></F>
      <F label={LT("التاريخ", "Date")}><input name="date" type="date" defaultValue={today()} className="field font-normal" /></F>
      <F label={LT("المبلغ", "Amount")}><div className="flex gap-2"><input name="amount" required inputMode="decimal" dir="ltr" className="field text-right font-normal" /><Cur /></div></F>
      <F label={LT("ملاحظة", "Note")} wide><input name="note" className="field font-normal" /></F>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "…" : LT("سجّل", "Record")}</button><Msg s={s} /></div>
    </form>
  );
}

export function EmployeeForm() {
  const [s, act, pending] = useActionState(addEmployee, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-3">
      <F label={LT("الاسم الكامل", "Full name")}><input name="name" required className="field font-normal" /></F>
      <F label={LT("الوظيفة", "Job title")}><input name="job_title" className="field font-normal" /></F>
      <F label={LT("الرقم المدني", "Civil ID")}><input name="civil_id" inputMode="numeric" dir="ltr" autoComplete="off" className="field text-right font-normal" /></F>
      <F label={LT("الهاتف", "Phone")}><input name="phone" dir="ltr" className="field text-right font-normal" /></F>
      <F label={LT("الإيميل", "Email")}><input name="email" type="email" dir="ltr" className="field text-right font-normal" /></F>
      <F label={LT("تاريخ التعيين", "Start date")}><input name="starts_on" type="date" className="field font-normal" /></F>
      <F label={LT("الراتب المتفق عليه (شهري)", "Agreed monthly salary")}><div className="flex gap-2"><input name="salary" inputMode="decimal" dir="ltr" className="field text-right font-normal" /><Cur name="salary_currency" /></div></F>
      <F label={LT("العنوان", "Address")} wide><input name="address" className="field font-normal" /></F>
      <F label={LT("ملاحظة", "Note")} wide><input name="note" className="field font-normal" /></F>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "…" : LT("إضافة موظف", "Add employee")}</button><Msg s={s} /></div>
    </form>
  );
}

export function PayForm({ employees }: { employees: { id: string; name: string }[] }) {
  const [s, act, pending] = useActionState(payEmployee, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-3">
      <F label={LT("الموظف", "Employee")}><select name="employee_id" required className="field font-normal"><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></F>
      <F label={LT("النوع", "Type")}><select name="pay_kind" className="field font-normal">
        <option value="salary">{LT("راتب", "Salary")}</option><option value="bonus">{LT("مكافأة", "Bonus")}</option><option value="advance">{LT("سلفة", "Advance")}</option><option value="allowance">{LT("بدل", "Allowance")}</option><option value="other">{LT("دفعة أخرى", "Other")}</option>
      </select></F>
      <F label={LT("التاريخ", "Date")}><input name="date" type="date" defaultValue={today()} className="field font-normal" /></F>
      <F label={LT("المبلغ", "Amount")}><div className="flex gap-2"><input name="amount" required inputMode="decimal" dir="ltr" className="field text-right font-normal" /><Cur /></div></F>
      <F label={LT("ملاحظة (مثلاً: راتب نوفمبر)", "Note (e.g. November salary)")} wide><input name="note" className="field font-normal" /></F>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "…" : LT("سجّل الدفعة", "Record payment")}</button><Msg s={s} /></div>
    </form>
  );
}

export function ClosePeriodForm({ id }: { id: string }) {
  const [s, act, pending] = useActionState(closePeriod, undefined);
  return (
    <form action={act} className="flex flex-col gap-2 rounded-2xl border border-navy-200 bg-tint p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-[13px] leading-6 text-navy-900">{LT("بعد الإقفال ما يقدر أحد (حتى أنت) يضيف أو يعدّل أو يحذف أي إيراد أو مصروف أو سحب أو إيداع بتاريخ داخل هالدورة، وينحفظ «تقرير إقفال» ثابت بتاريخ ووقت الإقفال.", "After closing, nobody (you included) can add, edit or delete any revenue, expense, withdrawal or deposit dated inside this cycle, and a fixed closing report is saved with the closing time.")}</p>
      <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" name="sure" className="h-5 w-5" />{LT("راجعت الأرقام، وأبي أقفل الدورة", "I checked the numbers and want to close this cycle")}</label>
      <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="btn btn-primary px-5 py-2">{pending ? "…" : `🔒 ${LT("إقفال الدورة", "Close the cycle")}`}</button><Msg s={s} /></div>
    </form>
  );
}

export function ReopenForm({ id }: { id: string }) {
  const [s, act, pending] = useActionState(reopenPeriod, undefined);
  return (
    <form action={act} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="reason" required minLength={5} placeholder={LT("سبب إعادة الفتح (ينسجّل)", "Reason for re-opening (logged)")} className="field" />
      <div className="flex flex-wrap items-center gap-3"><button disabled={pending} className="btn btn-outline px-4 py-2 text-sm">{pending ? "…" : LT("إعادة فتح الدورة", "Re-open the cycle")}</button><Msg s={s} /></div>
    </form>
  );
}
