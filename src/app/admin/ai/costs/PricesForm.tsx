"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { savePrices } from "./actions";
import type { AiPrices } from "@/lib/aiPrices";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ الأسعار"}</button>;
}

/** prices of the models (per 1,000,000 tokens, in dollars). `missing` = models that were used but have no price yet. */
export function PricesForm({ p, missing }: { p: AiPrices; missing: string[] }) {
  const [r, act] = useActionState(savePrices, undefined);
  const names = [...new Set([...missing, ...Object.keys(p.models)])];
  return (
    <details className="card p-5" open={missing.length > 0}>
      <summary className="cursor-pointer font-bold text-navy-900">💲 أسعار النماذج {missing.length > 0 && <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-[12px] font-semibold text-red-700">{missing.length} بدون سعر</span>}</summary>
      <form action={act} className="mt-4 flex flex-col gap-4">
        <p className="text-[13px] text-subtle">السعر بالدولار لكل مليون توكن، مثل ما هو مكتوب بصفحة أسعار المزود. الأسعار المعبّاة هي الأسعار المعلنة يوم 22 نوفمبر 2026، وتتغيّر، فراجعها كل فترة. النموذج اللي بدون سعر تنحسب توكناته بس. «للوحدة» لنماذج الصور والفيديو والموسيقى: سعر الصورة الواحدة، أو ثانية الفيديو، أو ثانية الموسيقى (اسمها music).</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-sm">
            <thead><tr className="text-start text-subtle"><th className="p-2 text-start">النموذج</th><th className="p-2 text-start">الإدخال ($/مليون)</th><th className="p-2 text-start">الإخراج ($/مليون)</th><th className="p-2 text-start">للوحدة ($)</th></tr></thead>
            <tbody>
              {names.map((m) => (
                <tr key={m} className="border-t border-line">
                  <td className="p-2 font-semibold text-navy-900" dir="ltr">{m}{missing.includes(m) && <span className="ms-2 text-[12px] font-semibold text-red-700">بدون سعر</span>}</td>
                  <td className="p-2"><input name={`in:${m}`} type="number" step="0.001" min={0} defaultValue={p.models[m]?.in || ""} aria-label={`سعر إدخال ${m}`} className="field w-28 py-1.5" /></td>
                  <td className="p-2"><input name={`out:${m}`} type="number" step="0.001" min={0} defaultValue={p.models[m]?.out || ""} aria-label={`سعر إخراج ${m}`} className="field w-28 py-1.5" /></td>
                  <td className="p-2"><input name={`unit:${m}`} type="number" step="0.0001" min={0} defaultValue={p.models[m]?.unit ?? ""} aria-label={`سعر الوحدة ${m}`} className="field w-28 py-1.5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className="label">صوت ElevenLabs: كم دولار لكل 1000 حرف</span><input name="el_per_1k" type="number" step="0.001" min={0} defaultValue={p.el_per_1k || ""} className="field" /><span className="text-[12px] text-subtle">يعتمد على باقتك عندهم. إذا تركته فاضي ينحسب عدد الحروف بس.</span></label>
          <label className="flex flex-col gap-1.5"><span className="label">قيمة الريشة بالدولار</span><input name="feather_usd" type="number" step="0.001" min={0} defaultValue={p.feather_usd} className="field" /><span className="text-[12px] text-subtle">الريشة ≈ 0.06 د.ك ≈ 0.195 دولار بباقاتك الحالية.</span></label>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
      </form>
    </details>
  );
}
