"use client";
import { useActionState, useState } from "react";
import { adjustCredits, deleteCustomer } from "@/app/admin/customers/actions";
import { L } from "@/lib/i18n/ui";

export function CreditsForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(adjustCredits, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="label" htmlFor="amount">{L("عدد الريش")}</label>
      <input id="amount" name="amount" type="number" min={1} required inputMode="numeric" className="field" />
      <input name="note" placeholder={L("السبب (اختياري)")} className="field" />
      <div className="grid grid-cols-2 gap-2">
        <button name="op" value="add" disabled={pending} className="btn btn-primary py-2.5">{L("+ إضافة رصيد")}</button>
        <button name="op" value="sub" disabled={pending} className="btn border border-red-300 py-2.5 font-semibold text-red-700 hover:bg-red-50">{L("− خصم رصيد")}</button>
      </div>
      {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
    </form>
  );
}

export function DeleteCustomer({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [state, action, pending] = useActionState(deleteCustomer, undefined);
  const match = text.trim().toLowerCase() === email.toLowerCase();
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="btn border border-red-300 py-2.5 font-semibold text-red-700 hover:bg-red-50">{L("حذف حساب العميل")}</button>
  );
  return (
    <form action={action} className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <input type="hidden" name="user_id" value={userId} />
      <p className="font-bold text-red-800">{L("حذف الحساب نهائياً؟")}</p>
      <p className="text-[13px] leading-6 text-navy-900">{L("بينحذف حسابه وأعماله وملفاته ورصيده وهويته التجارية، ويتلغى اشتراكه. يقدر يسجّل من جديد بنفس البريد كحساب جديد.")}</p>
      <label htmlFor="confirm-email" className="text-[13px] font-semibold">{L("للتأكيد اكتب بريده:")} <span dir="ltr" className="font-latin">{email}</span></label>
      <input id="confirm-email" name="confirm" dir="ltr" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="field text-left" />
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={!match || pending} className="btn flex-1 bg-red-700 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-40">{pending ? L("جارٍ الحذف…") : L("احذف نهائياً")}</button>
        <button type="button" onClick={() => { setOpen(false); setText(""); }} className="btn btn-outline flex-1 py-2.5">{L("تراجع")}</button>
      </div>
    </form>
  );
}

type Act = (prev: { ok?: string; error?: string } | undefined, form: FormData) => Promise<{ ok?: string; error?: string } | undefined>;

/** A button that opens an inline confirmation box before running a server action. */
function Confirm({ userId, label, title, body, cta, action, reason, tone = "red" }: {
  userId: string; label: string; title: string; body: string; cta: string; action: Act; reason?: string; tone?: "red" | "navy";
}) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(action, undefined);
  const btn = tone === "red" ? "border border-red-300 text-red-700 hover:bg-red-50" : "btn-outline";
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`btn py-2.5 font-semibold ${btn}`}>{label}</button>;
  return (
    <form action={run} className={`flex flex-col gap-2 rounded-2xl border p-4 ${tone === "red" ? "border-red-200 bg-red-50/60" : "border-line bg-canvas"}`}>
      <input type="hidden" name="user_id" value={userId} />
      <p className={`font-bold ${tone === "red" ? "text-red-800" : "text-navy-900"}`}>{title}</p>
      <p className="text-[13px] leading-6 text-navy-900">{body}</p>
      {reason && <input name="reason" placeholder={reason} className="field bg-white" />}
      {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending || !!state?.ok} className={`btn flex-1 py-2.5 font-semibold text-white disabled:opacity-40 ${tone === "red" ? "bg-red-700 hover:bg-red-800" : "bg-navy-800 hover:bg-navy-900"}`}>{pending ? L("لحظة…") : cta}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1 py-2.5">{state?.ok ? L("تمام") : L("تراجع")}</button>
      </div>
    </form>
  );
}

export function DeleteWork({ userId, action }: { userId: string; action: Act }) {
  return <Confirm userId={userId} action={action} label={L("حذف أعماله")} title={L("حذف كل أعماله وملفاته؟")}
    body={L("بتنحذف كل التصاميم والفيديوهات والأصوات اللي عملها، والملفات اللي رفعها. حسابه ورصيده بيظلوا مثل ما هم.")} cta={L("احذف أعماله")} />;
}

export function BlockEmail({ userId, action }: { userId: string; action: Act }) {
  return <Confirm userId={userId} action={action} label={L("حظر البريد")} title={L("حظر هذا البريد؟")} reason={L("السبب (اختياري)")}
    body={L("بيطلع من حسابه فوراً وما يقدر يدخل، وما يقدر يسجّل من جديد بنفس البريد، لا بالإيميل ولا بـGoogle. تقدر تلغي الحظر بأي وقت.")} cta={L("احظر البريد")} />;
}

export function RequestAccess({ userId, action, again }: { userId: string; action: Act; again?: boolean }) {
  return <Confirm userId={userId} action={action} tone="navy" label={again ? L("طلب صلاحية جديد") : L("طلب صلاحية الدخول على حسابه")} title={L("طلب صلاحية الدخول على حساب العميل")} reason={L("سبب الطلب (بيشوفه العميل) — مثلاً: مشكلة بتصدير المونتاج")}
    body={L("بيطلع للعميل بحسابه طلب منك. لازم يوافق بعلامة صح ويكتب اسمه، وبعدها تقدر تدخل خلال 24 ساعة. يقدر يلغي الموافقة بأي وقت. وأنت داخل: الدفع والبطاقات والفواتير وكلمة المرور وحذف الحساب مقفلة عليك.")} cta={L("أرسل الطلب")} />;
}

export function Impersonate({ userId, action }: { userId: string; action: Act }) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="flex flex-col gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <button disabled={pending} className="btn bg-navy-800 py-2.5 font-semibold text-white hover:bg-navy-900">{pending ? L("لحظة…") : L("ادخل على حسابه الآن")}</button>
      <p className="text-[12px] leading-5 text-subtle">{L("بتطلع من حسابك وبتدخل على حسابه. كل دخول بيتسجّل. للرجوع اضغط «اطلع من حسابه» بالشريط الأحمر.")}</p>
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
    </form>
  );
}

/** Cancel the customer's subscription: at the end of the month, or right now. */
export function CancelSub({ userId, action }: { userId: string; action: Act }) {
  const [open, setOpen] = useState(false);
  const [state, run, pending] = useActionState(action, undefined);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn border border-red-300 py-2.5 font-semibold text-red-700 hover:bg-red-50">{L("إلغاء اشتراكه")}</button>;
  return (
    <form action={run} className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50/60 p-4">
      <input type="hidden" name="user_id" value={userId} />
      <p className="font-bold text-red-800">{L("إلغاء اشتراك العميل")}</p>
      <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-6 text-navy-900">
        <input type="radio" name="mode" value="end" defaultChecked className="mt-1.5 accent-red-700" />
        <span><b>{L("إيقاف التجديد:")}</b> {L("يكمل لين نهاية الشهر اللي دفعه، وما ينخصم منه شي بعدها.")}</span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-6 text-navy-900">
        <input type="radio" name="mode" value="now" className="mt-1.5 accent-red-700" />
        <span><b>{L("إلغاء فوري:")}</b> {L("يوقف الحين وينمسح رصيد ريشه (مثلاً بعد ما ترجّع له فلوسه). حسابه وأعماله تظل.")}</span>
      </label>
      <p className="text-[12px] text-subtle">{L("إرجاع الفلوس نفسه تسويه من لوحة بوابة الدفع (Tap)، وهذا الزر يوقف الاشتراك بس.")}</p>
      {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending || !!state?.ok} className="btn flex-1 bg-red-700 py-2.5 font-semibold text-white hover:bg-red-800 disabled:opacity-40">{pending ? L("لحظة…") : L("أكّد")}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline flex-1 py-2.5">{state?.ok ? L("تمام") : L("تراجع")}</button>
      </div>
    </form>
  );
}
