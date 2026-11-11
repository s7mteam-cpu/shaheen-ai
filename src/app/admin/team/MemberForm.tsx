"use client";
import { useActionState, useState } from "react";
import { saveMember } from "./actions";
import { L } from "@/lib/i18n/ui";

type Sec = { key: string; label: string };

export function MemberForm({ sections, email, perms, full, compact }: { sections: Sec[]; email?: string; perms?: string[]; full?: boolean; compact?: boolean }) {
  const [state, action, pending] = useActionState(saveMember, undefined);
  const [isFull, setFull] = useState(!!full);
  const [pick, setPick] = useState<Record<string, boolean>>(Object.fromEntries((perms ?? []).map((k) => [k, true])));
  const allOn = sections.every((s) => pick[s.key]);
  return (
    <form action={action} className="flex flex-col gap-3">
      {email ? <input type="hidden" name="email" value={email} /> : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="m-email" className="label">{L("بريد الشخص (لازم يكون عنده حساب بشاهين)")}</label>
          <input id="m-email" name="email" type="email" required dir="ltr" placeholder="name@example.com" className="field max-w-md text-left" />
        </div>
      )}
      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${isFull ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
        <input type="checkbox" name="full" checked={isFull} onChange={(e) => setFull(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#0B2A4A]" />
        <span className="flex flex-col"><span className="font-bold text-navy-900">{L("صلاحية كاملة (مدير)")}</span><span className="text-[13px] text-subtle">{L("يشوف كل الأقسام ويقدر يدير الفريق. أعطيها بس للي بتثق فيه كثير.")}</span></span>
      </label>
      {!isFull && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy-900">{L("الأقسام المسموحة")}</span>
            <button type="button" onClick={() => setPick(Object.fromEntries(sections.map((s) => [s.key, !allOn])))} className="text-sm font-semibold text-navy-700 underline">{allOn ? L("إلغاء الكل") : L("تحديد الكل")}</button>
          </div>
          <div className={`grid gap-2 ${compact ? "sm:grid-cols-3" : "sm:grid-cols-3 lg:grid-cols-4"}`}>
            {sections.map((s) => (
              <label key={s.key} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[14px] ${pick[s.key] ? "border-navy-700/40 bg-tint font-semibold" : "border-line bg-white"}`}>
                <input type="checkbox" name={`p_${s.key}`} checked={!!pick[s.key]} onChange={(e) => setPick({ ...pick, [s.key]: e.target.checked })} className="h-4.5 w-4.5 shrink-0 accent-[#0B2A4A]" />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      )}
      {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
      <button disabled={pending} className="btn btn-primary self-start px-6 py-2.5">{pending ? L("لحظة…") : email ? L("حفظ الصلاحيات") : L("إضافة للفريق")}</button>
    </form>
  );
}
