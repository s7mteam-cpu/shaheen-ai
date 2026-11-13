"use client";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { COUNTRIES } from "@/lib/countries";
import { approve, deleteMethod, reject, saveMethod, saveMonths } from "./actions";

type Res = { ok?: string; error?: string } | undefined;
const Msg = ({ r }: { r: Res }) => (r?.error ? <p role="alert" className="text-sm font-semibold text-red-700">{r.error}</p> : r?.ok ? <p className="text-sm font-semibold text-green-700">{r.ok}</p> : null);
function Submit({ children, className = "btn btn-primary px-5 py-2.5" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`${className} disabled:opacity-60`}>{pending ? "…" : children}</button>;
}

/** Approve / reject one pending transfer. */
export function Review({ id }: { id: string }) {
  const [r1, setR1] = useState<Res>();
  const [busy, start] = useTransition();
  const [r2, rej] = useActionState(reject.bind(null, id), undefined);
  const [open, setOpen] = useState(false);
  if (r1?.ok || r2?.ok) return <Msg r={r1?.ok ? r1 : r2} />;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => { if (confirm("تأكدت إن المبلغ وصل حسابك؟ القبول يفعّل الاشتراك ويسجّل الدفعة.")) start(async () => setR1(await approve(id))); }} className="btn bg-green-700 px-5 py-2.5 font-bold text-white hover:bg-green-800 disabled:opacity-60">{busy ? "…" : "✓ قبول"}</button>
        <button type="button" onClick={() => setOpen(!open)} className="btn btn-outline px-5 py-2.5">✗ رفض</button>
      </div>
      {open && (
        <form action={rej} className="flex flex-col gap-2">
          <input name="reason" required placeholder="السبب (يوصل للعميل): مثلاً المبلغ ناقص، الإيصال مو واضح…" className="field" />
          <div><Submit className="btn bg-red-700 px-4 py-2 text-white">أرسل الرفض</Submit></div>
        </form>
      )}
      <Msg r={r1 ?? r2} />
    </div>
  );
}

type Method = { id?: string; name: string; details: string; countries: string[]; is_active: boolean; sort_order: number };

/** Add / edit a transfer method. */
export function MethodForm({ m }: { m?: Method }) {
  const [r, act] = useActionState(saveMethod, undefined);
  const [all, setAll] = useState(!m?.countries?.length && !!m);
  const [busy, start] = useTransition();
  const [del, setDel] = useState<Res>();
  return (
    <form action={act} className="flex flex-col gap-3">
      {m?.id && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <label className="flex flex-col gap-1.5"><span className="label">الاسم (يشوفه العميل)</span><input name="name" required defaultValue={m?.name ?? ""} placeholder="🏦 تحويل بنكي - سوريا" className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">الترتيب</span><input name="sort_order" type="number" defaultValue={m?.sort_order ?? 0} className="field" /></label>
      </div>
      <label className="flex flex-col gap-1.5"><span className="label">بيانات التحويل (يشوفها العميل وينسخها)</span>
        <textarea name="details" rows={4} defaultValue={m?.details ?? ""} placeholder={"اسم البنك: …\nاسم صاحب الحساب: …\nرقم الحساب: …"} className="field leading-7" /></label>
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1">تظهر لعملاء:</legend>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4" />كل الدول</label>
        {!all && (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {COUNTRIES.map((c) => (
              <label key={c.code} className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="countries" value={c.code} defaultChecked={m?.countries?.includes(c.code)} className="h-4 w-4" />{c.flag} {c.ar}</label>
            ))}
          </div>
        )}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_active" defaultChecked={m?.is_active} className="h-5 w-5" />مفعّلة (تظهر للعملاء)</label>
      <div className="flex flex-wrap items-center gap-3">
        <Submit>{m?.id ? "حفظ" : "إضافة الطريقة"}</Submit>
        {m?.id && <button type="button" disabled={busy} onClick={() => { if (confirm(`تحذف «${m.name}»؟ التحويلات القديمة تظل محفوظة.`)) start(async () => setDel(await deleteMethod(m.id!))); }} className="text-sm font-semibold text-red-700 underline">حذف</button>}
      </div>
      <Msg r={del ?? r} />
    </form>
  );
}

export function MonthsForm({ months }: { months: number[] }) {
  const [r, act] = useActionState(saveMonths, undefined);
  return (
    <form action={act} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        {[1, 2, 3, 6, 12].map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="months" value={m} defaultChecked={months.includes(m)} disabled={m === 1} className="h-4 w-4" />{m === 1 ? "شهر (دايماً)" : `${m} أشهر`}</label>
        ))}
      </div>
      <div><Submit>حفظ المدد</Submit></div>
      <Msg r={r} />
    </form>
  );
}
