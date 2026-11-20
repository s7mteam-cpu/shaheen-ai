"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveExtraPricing } from "./extraActions";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ"}</button>;
}

export function ExtraPricingForm({ s }: { s: { ai_clip_x: number; pres_auto_units: number; pres_image_cost: number } }) {
  const [r, act] = useActionState(saveExtraPricing, undefined);
  return (
    <form action={act} className="card flex flex-col gap-4 p-5">
      <p className="font-bold text-navy-900">أسعار إضافية</p>
      <p className="text-[13px] text-subtle">إعدادات تدخل بحساب سعر أدوات معيّنة فوق سعرها الأساسي.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5"><span className="label">مضاعف «لقطات بالذكاء الاصطناعي» (مشاهد واقعية)</span><input name="ai_clip_x" type="number" step="0.5" min={1} max={10} defaultValue={s.ai_clip_x} className="field" /><span className="text-[12px] text-subtle">2 = ضعف السعر الأساسي.</span></label>
        <label className="flex flex-col gap-1.5"><span className="label">العرض التلقائي «شاهين يقرر» (كم وحدة سعر)</span><input name="pres_auto_units" type="number" min={1} max={20} defaultValue={s.pres_auto_units} className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">صور الذكاء الاصطناعي بالعرض (ريشة)</span><input name="pres_image_cost" type="number" min={0} max={500} defaultValue={s.pres_image_cost} className="field" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
    </form>
  );
}
