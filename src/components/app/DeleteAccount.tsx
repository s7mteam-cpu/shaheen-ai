"use client";
import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/app/account/actions";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  return (
    <section className="card flex flex-col gap-3 border border-red-200 p-6 md:col-span-2">
      <h2 className="text-lg font-bold text-red-800">حذف الحساب</h2>
      <p className="text-sm leading-7 text-muted">
        تقدر تحذف حسابك وكل بياناتك نهائياً من هنا.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn self-start border border-red-300 px-5 py-2.5 text-[15px] font-semibold text-red-700 hover:bg-red-50">
          أبي أحذف حسابي
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-[17px] font-bold text-red-800">هل أنت متأكد من حذف حسابك؟</p>
          <ul className="list-disc pr-5 text-sm leading-7 text-navy-900">
            <li>بيتم حذف حسابك ومعلوماتك الشخصية وهويتك التجارية.</li>
            <li>بتنحذف جميع أعمالك وملفاتك (التصاميم، الفيديوهات، الأصوات).</li>
            <li>بينحذف رصيد الريش كامل، وبتنحذف طرق الدفع المحفوظة، ويتلغى اشتراكك.</li>
            <li><strong>حذف الحساب لا يعني استرداد أي مبلغ مدفوع.</strong></li>
            <li>الحذف نهائي، وما نقدر نرجّع أي شي بعده.</li>
          </ul>
          <label htmlFor="confirm" className="label">للتأكيد اكتب كلمة <strong className="text-red-700">حذف</strong></label>
          <input id="confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="field max-w-xs" />
          {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={text.trim() !== "حذف" || pending} className="btn bg-red-700 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-red-800 disabled:opacity-40">
              {pending ? "جارٍ الحذف…" : "احذف حسابي نهائياً"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className="btn btn-outline px-5 py-2.5 text-[15px]">تراجع</button>
          </div>
        </form>
      )}
    </section>
  );
}
