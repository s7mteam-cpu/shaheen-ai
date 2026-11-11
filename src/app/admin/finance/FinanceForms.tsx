"use client";
import { useActionState, useRef, useEffect } from "react";
import { addExpense, addIncome, addRecurring, syncClaude } from "./actions";
import { L } from "@/lib/i18n/ui";

const today = () => new Date().toISOString().slice(0, 10);
type R = { ok?: string; error?: string } | undefined;

function Msg({ s }: { s: R }) {
  if (s?.ok) return <p role="status" className="text-sm font-semibold text-emerald-700">{s.ok}</p>;
  if (s?.error) return <p role="alert" className="text-sm font-semibold text-red-700">{s.error}</p>;
  return null;
}
function useReset(s: R) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return ref;
}
const Amount = () => (
  <div className="flex gap-2">
    <input name="amount" required inputMode="decimal" placeholder={L("المبلغ")} dir="ltr" className="field text-right" />
    <select name="currency" defaultValue="USD" className="field w-28" aria-label={L("العملة")}><option value="USD">{L("$ دولار")}</option><option value="KWD">{L("د.ك دينار")}</option></select>
  </div>
);

export function ExpenseForm() {
  const [s, act, pending] = useActionState(addExpense, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="vendor" required list="vendors" placeholder={L("الشركة (مثلاً Gemini)")} className="field" aria-label={L("الشركة")} />
      <datalist id="vendors">{["Claude (Anthropic)", "Google Gemini", "ElevenLabs", "Railway", "Vercel", "Supabase", "Stripe", L("الدومين")].map((v) => <option key={v} value={v} />)}</datalist>
      <Amount />
      <select name="category" defaultValue="usage" className="field" aria-label={L("النوع")}><option value="usage">{L("حسب الاستخدام")}</option><option value="fixed">{L("ثابتة شهرية")}</option><option value="yearly">{L("اشتراك سنوي")}</option><option value="other">{L("أخرى")}</option></select>
      <input name="date" type="date" defaultValue={today()} className="field" aria-label={L("التاريخ")} />
      <input name="note" placeholder={L("ملاحظة (اختياري)")} className="field sm:col-span-2" />
      <label className="flex flex-col gap-1 text-sm font-semibold text-navy-900 sm:col-span-2">{L("الفاتورة (PDF أو صورة، اختياري)")}<input name="receipt" type="file" accept="application/pdf,image/*" className="text-sm font-normal" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? L("لحظة…") : L("إضافة المصروف")}</button><Msg s={s} /></div>
    </form>
  );
}

export function RecurringForm() {
  const [s, act, pending] = useActionState(addRecurring, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="vendor" required placeholder={L("الشركة (مثلاً Supabase Pro)")} className="field" aria-label={L("الشركة")} />
      <Amount />
      <select name="category" defaultValue="fixed" className="field" aria-label={L("التكرار")}><option value="fixed">{L("كل شهر")}</option><option value="yearly">{L("كل سنة")}</option></select>
      <label className="flex flex-col gap-1 text-[13px] text-subtle">{L("يبدأ من (ويتكرر بنفس اليوم)")}<input name="starts_on" type="date" defaultValue={today()} className="field" /></label>
      <input name="note" placeholder={L("ملاحظة (اختياري)")} className="field sm:col-span-2" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? L("لحظة…") : L("إضافة مصروف متكرر")}</button><Msg s={s} /></div>
    </form>
  );
}

export function IncomeForm() {
  const [s, act, pending] = useActionState(addIncome, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="description" required placeholder={L("الوصف (مثلاً: باقة الإدارة الكاملة)")} className="field sm:col-span-2" aria-label={L("الوصف")} />
      <div className="flex gap-2">
        <input name="amount" required inputMode="decimal" placeholder={L("المبلغ")} dir="ltr" className="field text-right" />
        <select name="currency" defaultValue="KWD" className="field w-28" aria-label={L("العملة")}><option value="KWD">{L("د.ك دينار")}</option><option value="USD">{L("$ دولار")}</option></select>
      </div>
      <input name="date" type="date" defaultValue={today()} className="field" aria-label={L("التاريخ")} />
      <input name="customer" placeholder={L("اسم العميل (اختياري)")} className="field" />
      <input name="method" list="methods" placeholder={L("طريقة الدفع (اختياري)")} className="field" />
      <datalist id="methods">{[L("تحويل بنكي"), L("كي نت"), L("ومض"), L("كاش"), L("بطاقة")].map((v) => <option key={v} value={v} />)}</datalist>
      <input name="note" placeholder={L("ملاحظة (اختياري)")} className="field sm:col-span-2" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? L("لحظة…") : L("إضافة الإيراد")}</button><Msg s={s} /></div>
    </form>
  );
}

export function SyncClaudeButton() {
  const [s, act, pending] = useActionState(syncClaude, undefined);
  return (
    <form action={act} className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className="btn btn-outline px-5 py-2.5">{pending ? L("جارٍ السحب…") : L("سحب تكلفة Claude تلقائياً")}</button>
      <Msg s={s} />
    </form>
  );
}
