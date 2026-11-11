"use client";
import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/app/account/actions";
import { useT } from "@/components/LangProvider";

export function DeleteAccount() {
  const T = useT();
  const word = T("حذف", "DELETE");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  return (
    <section className="card flex flex-col gap-3 border border-red-200 p-6 md:col-span-2">
      <h2 className="text-lg font-bold text-red-800">{T("حذف الحساب", "Delete account")}</h2>
      <p className="text-sm leading-7 text-muted">
        {T("تقدر تحذف حسابك وكل بياناتك نهائياً من هنا.", "You can permanently delete your account and all your data here.")}
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn self-start border border-red-300 px-5 py-2.5 text-[15px] font-semibold text-red-700 hover:bg-red-50">
          {T("أبي أحذف حسابي", "I want to delete my account")}
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-[17px] font-bold text-red-800">{T("هل أنت متأكد من حذف حسابك؟", "Are you sure you want to delete your account?")}</p>
          <ul className="list-disc pr-5 text-sm leading-7 text-navy-900">
            <li>{T("بيتم حذف حسابك ومعلوماتك الشخصية وهويتك التجارية.", "Your account, personal information and brand kit will be deleted.")}</li>
            <li>{T("بتنحذف جميع أعمالك وملفاتك (التصاميم، الفيديوهات، الأصوات).", "All your works and files (designs, videos, audio) will be deleted.")}</li>
            <li>{T("بينحذف رصيد الريش كامل، وبتنحذف طرق الدفع المحفوظة، ويتلغى اشتراكك.", "Your entire credit balance and saved payment methods will be removed, and your plan canceled.")}</li>
            <li><strong>{T("حذف الحساب لا يعني استرداد أي مبلغ مدفوع.", "Deleting your account does not refund any payment.")}</strong></li>
            <li>{T("الحذف نهائي، وما نقدر نرجّع أي شي بعده.", "Deletion is permanent and can't be undone.")}</li>
          </ul>
          <label htmlFor="confirm" className="label">{T("للتأكيد اكتب كلمة ", "To confirm, type ")}<strong className="text-red-700">{word}</strong></label>
          <input id="confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="field max-w-xs" />
          {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={text.trim().toUpperCase() !== word || pending} className="btn bg-red-700 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-red-800 disabled:opacity-40">
              {pending ? T("جارٍ الحذف…", "Deleting…") : T("احذف حسابي نهائياً", "Delete my account permanently")}
            </button>
            <button type="button" onClick={() => { setOpen(false); setText(""); }} className="btn btn-outline px-5 py-2.5 text-[15px]">{T("تراجع", "Cancel")}</button>
          </div>
        </form>
      )}
    </section>
  );
}
