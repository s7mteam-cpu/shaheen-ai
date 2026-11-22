"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveToolSections } from "./extraActions";
import { SECTION_ICON, SECTION_IDS, sectionOf, type ToolSections } from "@/lib/toolSections";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ الأقسام"}</button>;
}

/** «أقسام صفحة الأدوات»: the customer's tools page is split into sections; here the admin edits each section's name and two lines, and moves any tool between them. */
export function SectionsForm({ s, tools }: { s: ToolSections; tools: { id: string; name: string; is_enabled: boolean }[] }) {
  const [r, act] = useActionState(saveToolSections, undefined);
  return (
    <details className="card p-5">
      <summary className="cursor-pointer font-bold text-navy-900">🗂️ أقسام صفحة الأدوات (المبتكر · القوالب الجاهزة · صوت وصور)</summary>
      <form action={act} className="mt-4 flex flex-col gap-5">
        <p className="text-[13px] text-subtle">العميل يشوف الأدوات مقسومة أقسام، ولكل قسم اسم وسطرين شرح. من هنا تغيّر النص وتنقل أي أداة لقسم ثاني. الأدوات الجديدة تدخل قسمها تلقائياً.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {SECTION_IDS.map((id) => (
            <fieldset key={id} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
              <legend className="px-1 text-sm font-bold text-navy-800">{SECTION_ICON[id]} قسم</legend>
              <label className="flex flex-col gap-1"><span className="label">الاسم</span><input name={`title:${id}`} defaultValue={s.texts[id].title} maxLength={40} className="field" /></label>
              <label className="flex flex-col gap-1"><span className="label">الشرح (سطرين)</span><textarea name={`desc:${id}`} defaultValue={s.texts[id].desc} maxLength={220} rows={4} className="field" /></label>
            </fieldset>
          ))}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <li key={t.id}>
              <label className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span className={`text-sm font-semibold ${t.is_enabled ? "text-navy-900" : "text-subtle"}`}>{t.name}{t.is_enabled ? "" : " (متوقفة)"}</span>
                <select name={`sec:${t.id}`} defaultValue={sectionOf(t.id, s)} aria-label={`قسم ${t.name}`} className="field w-auto py-1.5 text-sm">
                  {SECTION_IDS.map((id) => <option key={id} value={id}>{SECTION_ICON[id]} {s.texts[id].title}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
      </form>
    </details>
  );
}
