"use client";
import { useActionState } from "react";
import { saveContactInfo } from "@/app/app/profileActions";

/** Blocking card shown once until the customer adds their name and WhatsApp number. */
export function CompleteProfile({ name }: { name: string }) {
  const [state, action, pending] = useActionState(saveContactInfo, undefined);
  if (state?.ok) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cp-title" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <form action={action} className="card flex w-full max-w-md flex-col gap-3 p-6 shadow-xl">
        <h2 id="cp-title" className="text-xl font-bold text-navy-900">كمّل بياناتك 👋</h2>
        <p className="text-sm leading-7 text-muted">نحتاج رقم الواتساب عشان نتواصل معك إذا صار أي شي بحسابك أو أعمالك. ما نرسل لك إعلانات مزعجة.</p>
        <label htmlFor="cp-name" className="label">الاسم</label>
        <input id="cp-name" name="full_name" defaultValue={name} required autoComplete="name" className="field" />
        <label htmlFor="cp-phone" className="label">رقم الواتساب</label>
        <input id="cp-phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" dir="ltr" placeholder="+965 5000 0000" className="field text-right" />
        {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
        <button disabled={pending} className="btn btn-primary mt-1 py-3 text-[16px]">{pending ? "لحظة…" : "حفظ ومتابعة"}</button>
      </form>
    </div>
  );
}
