"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/components/LangProvider";
import { fullReset } from "./fullResetAction";

function Go({ ready }: { ready: boolean }) {
  const T = useT();
  const { pending } = useFormStatus();
  return (
    <button disabled={!ready || pending} className="btn bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-50">
      {pending ? T("جارٍ حفظ نسخة احتياطية ثم التصفير… (دقيقة إلى دقيقتين)", "Saving a backup, then resetting… (1–2 minutes)") : T("🧨 تصفير كامل", "🧨 Full reset")}
    </button>
  );
}

/** «تصفير كامل»: everything back to launch day, after an automatic backup. Owner only. */
export function FullReset({ phrase }: { phrase: string }) {
  const T = useT();
  const [r, act] = useActionState(fullReset, undefined);
  const [sure, setSure] = useState(false);
  const [typed, setTyped] = useState("");
  const ready = sure && typed.trim().toUpperCase() === phrase.toUpperCase();
  return (
    <section className="card flex flex-col gap-4 border-2 border-red-300 p-5">
      <div>
        <h2 className="text-xl font-bold text-red-800">{T("🧨 تصفير كامل: المنصة مثل يوم الإطلاق", "🧨 Full reset: the platform as on launch day")}</h2>
        <p className="mt-1 text-sm leading-7 text-subtle">{T("للمالك بس، وللاستخدام مرة وحدة بعد التجارب وقبل الإطلاق الرسمي. قبل ما يمسح أي شي، يحفظ نسخة احتياطية كاملة تلقائياً، وإذا فشلت النسخة ما يمسح شي.", "Owner only, for use once after testing and before the official launch. A full backup is saved first; if it fails, nothing is deleted.")}</p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-red-50 p-3 leading-7 text-red-900">
          <b>{T("ينمسح نهائياً:", "Deleted for good:")}</b>
          <ul className="list-disc ps-5">
            {[T("كل العملاء وحساباتهم وملفاتهم وأعمالهم", "All customers, accounts, files and works"), T("الريش وحركاتها", "Credits and their history"), T("المدفوعات ومحاولات الدفع والتحويلات والاشتراكات", "Payments, payment attempts, transfers, subscriptions"), T("كل المالية: الدورات، الإيرادات، المصروفات، الشركاء، الموظفين", "All finance: cycles, income, expenses, partners, employees"), T("طلبات التواصل، الإشعارات، سجل الدخول، الأرشيف، قائمة الحظر، سجل تغيير الأسعار", "Leads, notifications, sign-in log, archive, ban list, price history"), T("سجل الإدارة (يبدأ من جديد بسطر التصفير)", "The admin log (restarts with this reset)")].map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
        <div className="rounded-xl bg-green-50 p-3 leading-7 text-green-900">
          <b>{T("يظل مثل ما هو:", "Kept as is:")}</b>
          <ul className="list-disc ps-5">
            {[T("الباقات والأدوات والأسعار وطرق التحويل", "Plans, tools, prices and transfer methods"), T("نصوص الموقع وصوره والسياسات", "Site texts, pictures and policies"), T("الإعدادات وسعر الدولار", "Settings and the dollar rate"), T("حسابات الإدارة وكلمات السر", "Admin accounts and passwords"), T("ربط Google Sheets (والملف يتصفّر معها)", "The Google Sheets link (the file empties too)")].map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      </div>
      <form action={act} className="flex flex-col gap-3">
        <label className="flex items-start gap-2 text-sm font-semibold text-red-900">
          <input type="checkbox" name="sure" className="mt-1" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          {T("أفهم إن هذا يمسح كل البيانات نهائياً، وإن الرجوع يكون فقط من النسخة الاحتياطية.", "I understand this deletes all data for good, and the only way back is the backup.")}
        </label>
        <label htmlFor="full-confirm" className="label">{T(`اكتب «${phrase}» للتأكيد`, `Type «${phrase}» to confirm`)}</label>
        <input id="full-confirm" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="field max-w-sm" />
        <div><Go ready={ready} /></div>
        {r?.error && <p role="alert" className="text-sm font-semibold text-red-700">{r.error}</p>}
        {r?.ok && <p className="text-sm font-semibold text-green-700">{r.ok}</p>}
        {r?.url && <a href={r.url} className="btn btn-outline w-fit px-4 py-2 text-sm">{T("⬇️ تنزيل النسخة الاحتياطية اللي انحفظت قبل التصفير (الرابط 10 دقايق)", "⬇️ Download the pre-reset backup (link valid 10 minutes)")}</a>}
      </form>
    </section>
  );
}
