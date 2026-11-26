"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveInsta, clearInsta } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ"}</button>;
}

export function InstaForm({ on, has, bad }: { on: boolean; has: boolean; bad: boolean }) {
  const [r, act] = useActionState(saveInsta, undefined);
  return (
    <div className="flex flex-col gap-4">
      <form action={act} className="card flex flex-col gap-4 p-5">
        <label className="flex items-center gap-3 text-[15px] font-semibold"><input type="checkbox" name="on" defaultChecked={on} className="h-5 w-5" />تشغيل «شاهين يزور حساب العميل»</label>
        <label className="flex flex-col gap-1.5">
          <span className="label">قيمة الجلسة (sessionid) {has ? "(محفوظة، اتركها فاضية إذا ما تبي تغيّرها)" : ""}</span>
          <input name="sessionid" type="password" autoComplete="off" dir="ltr" className="field font-mono text-[13px]" placeholder={has ? "••••••••••••••••••••" : "الصق القيمة هنا"} />
        </label>
        <div className="flex flex-wrap items-center gap-3"><Save />{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}</div>
      </form>
      {has && <form action={clearInsta}><button className="text-sm font-semibold text-red-700 underline">🗑️ امسح الجلسة المحفوظة</button></form>}
      {bad && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">الجلسة انتهت أو انرفضت من انستغرام. سجّل دخول بالحساب من متصفحك وانسخ قيمة جديدة.</p>}
    </div>
  );
}
