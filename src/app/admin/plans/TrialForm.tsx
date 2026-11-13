"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveTrial } from "./trialActions";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ"}</button>;
}

export function TrialForm({ s }: { s: { enabled: boolean; credits: number; hours: number; per_ip_day: number } }) {
  const [r, act] = useActionState(saveTrial, undefined);
  return (
    <form action={act} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="enabled" defaultChecked={s.enabled} className="h-5 w-5" />التجربة المجانية مفعّلة</label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5"><span className="label">كم ريشة</span><input name="credits" type="number" min={1} max={1000} defaultValue={s.credits} className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">المدة (ساعات)</span><input name="hours" type="number" min={1} max={720} defaultValue={s.hours} className="field" /><span className="text-[12px] text-subtle">24 = يوم، 72 = 3 أيام</span></label>
        <label className="flex flex-col gap-1.5"><span className="label">حد التجارب من نفس الشبكة باليوم</span><input name="per_ip_day" type="number" min={1} max={50} defaultValue={s.per_ip_day} className="field" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
    </form>
  );
}
