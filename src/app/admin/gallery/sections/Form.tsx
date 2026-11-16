"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSection } from "../actions";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-50">{pending ? "…" : "حفظ"}</button>;
}

export function SectionForm({ s, name, defIntro, defSteps, works }: { works: { id: string; title: string }[]; s: { cover_id: string; cat: string; sort_order: number; hidden: boolean; intro: string; steps: string[]; features: string[] }; name: string; defIntro: string; defSteps: string[] }) {
  const [r, act] = useActionState(saveSection, undefined);
  return (
    <form action={act} className="card flex flex-col gap-3 p-4">
      <input type="hidden" name="cat" value={s.cat} />
      <div className="flex flex-wrap items-center gap-4">
        <b className="text-lg text-navy-900">{name}</b>
        <label className="flex items-center gap-2 text-sm font-semibold">الترتيب <input name="sort_order" type="number" min={0} defaultValue={s.sort_order || ""} placeholder="تلقائي" className="field w-24 py-1.5" /></label>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="hidden" defaultChecked={s.hidden} className="h-4 w-4" />إخفاء القسم من الموقع</label>
      </div>
      <label className="flex flex-col gap-1.5"><span className="label">العمل اللي يكون واجهة البطاقة (الغلاف)</span>
        <select name="cover_id" defaultValue={s.cover_id} className="field">
          <option value="">الأول بالترتيب (تلقائي)</option>
          {works.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5"><span className="label">وصف الأداة (سطر أو سطرين)</span><textarea name="intro" rows={2} defaultValue={s.intro === defIntro ? "" : s.intro} placeholder={defIntro} className="field" /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="label">طريقة العمل (كل خطوة بسطر)</span><textarea name="steps" rows={4} defaultValue={s.steps.join("\n") === defSteps.join("\n") ? "" : s.steps.join("\n")} placeholder={defSteps.join("\n")} className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">المميزات (كل ميزة بسطر)</span><textarea name="features" rows={4} defaultValue={s.features.join("\n")} placeholder="مثلاً: بدون استوديو" className="field" /></label>
      </div>
      <div className="flex items-center gap-3"><Save />{r?.error ? <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span> : r?.ok ? <span className="text-sm font-semibold text-green-700">{r.ok}</span> : null}</div>
    </form>
  );
}
