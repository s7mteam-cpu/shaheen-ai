"use client";
import { useActionState, useRef, useEffect } from "react";
import { addExpense, addIncome, addRecurring, syncClaude } from "./actions";

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
    <input name="amount" required inputMode="decimal" placeholder="المبلغ" dir="ltr" className="field text-right" />
    <select name="currency" defaultValue="USD" className="field w-28" aria-label="العملة"><option value="USD">$ دولار</option><option value="KWD">د.ك دينار</option></select>
  </div>
);

export function ExpenseForm() {
  const [s, act, pending] = useActionState(addExpense, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="vendor" required list="vendors" placeholder="الشركة (مثلاً Gemini)" className="field" aria-label="الشركة" />
      <datalist id="vendors">{["Claude (Anthropic)", "Google Gemini", "ElevenLabs", "Railway", "Vercel", "Supabase", "Stripe", "الدومين"].map((v) => <option key={v} value={v} />)}</datalist>
      <Amount />
      <select name="category" defaultValue="usage" className="field" aria-label="النوع"><option value="usage">حسب الاستخدام</option><option value="fixed">ثابتة شهرية</option><option value="yearly">اشتراك سنوي</option><option value="other">أخرى</option></select>
      <input name="date" type="date" defaultValue={today()} className="field" aria-label="التاريخ" />
      <input name="note" placeholder="ملاحظة (اختياري)" className="field sm:col-span-2" />
      <label className="flex flex-col gap-1 text-sm font-semibold text-navy-900 sm:col-span-2">الفاتورة (PDF أو صورة، اختياري)<input name="receipt" type="file" accept="application/pdf,image/*" className="text-sm font-normal" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "لحظة…" : "إضافة المصروف"}</button><Msg s={s} /></div>
    </form>
  );
}

export function RecurringForm() {
  const [s, act, pending] = useActionState(addRecurring, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="vendor" required placeholder="الشركة (مثلاً Supabase Pro)" className="field" aria-label="الشركة" />
      <Amount />
      <select name="category" defaultValue="fixed" className="field" aria-label="التكرار"><option value="fixed">كل شهر</option><option value="yearly">كل سنة</option></select>
      <label className="flex flex-col gap-1 text-[13px] text-subtle">يبدأ من (ويتكرر بنفس اليوم)<input name="starts_on" type="date" defaultValue={today()} className="field" /></label>
      <input name="note" placeholder="ملاحظة (اختياري)" className="field sm:col-span-2" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "لحظة…" : "إضافة مصروف متكرر"}</button><Msg s={s} /></div>
    </form>
  );
}

export function IncomeForm() {
  const [s, act, pending] = useActionState(addIncome, undefined);
  const ref = useReset(s);
  return (
    <form ref={ref} action={act} className="grid gap-3 sm:grid-cols-2">
      <input name="description" required placeholder="الوصف (مثلاً: باقة الإدارة الكاملة)" className="field sm:col-span-2" aria-label="الوصف" />
      <div className="flex gap-2">
        <input name="amount" required inputMode="decimal" placeholder="المبلغ" dir="ltr" className="field text-right" />
        <select name="currency" defaultValue="KWD" className="field w-28" aria-label="العملة"><option value="KWD">د.ك دينار</option><option value="USD">$ دولار</option></select>
      </div>
      <input name="date" type="date" defaultValue={today()} className="field" aria-label="التاريخ" />
      <input name="customer" placeholder="اسم العميل (اختياري)" className="field" />
      <input name="method" list="methods" placeholder="طريقة الدفع (اختياري)" className="field" />
      <datalist id="methods">{["تحويل بنكي", "كي نت", "ومض", "كاش", "بطاقة"].map((v) => <option key={v} value={v} />)}</datalist>
      <input name="note" placeholder="ملاحظة (اختياري)" className="field sm:col-span-2" />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button disabled={pending} className="btn btn-primary px-6 py-2.5">{pending ? "لحظة…" : "إضافة الإيراد"}</button><Msg s={s} /></div>
    </form>
  );
}

export function SyncClaudeButton() {
  const [s, act, pending] = useActionState(syncClaude, undefined);
  return (
    <form action={act} className="flex flex-wrap items-center gap-3">
      <button disabled={pending} className="btn btn-outline px-5 py-2.5">{pending ? "جارٍ السحب…" : "سحب تكلفة Claude تلقائياً"}</button>
      <Msg s={s} />
    </form>
  );
}
