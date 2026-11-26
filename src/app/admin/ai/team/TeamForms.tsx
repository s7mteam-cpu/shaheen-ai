"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveRole, saveField, saveMaster, saveSkill, addSkill, deleteSkill } from "./actions";
import { TEAM_MAX, SKILL_SCOPES } from "@/lib/team";

function Save({ label = "حفظ" }: { label?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2 disabled:opacity-60">{pending ? "…" : label}</button>;
}
function Msg({ r }: { r?: { ok?: string; error?: string } }) {
  return <>{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</>;
}

export function MasterForm({ on }: { on: boolean }) {
  const [r, act] = useActionState(saveMaster, undefined);
  return (
    <form action={act} className="card flex flex-wrap items-center gap-4 p-5">
      <label className="flex items-center gap-2 text-[15px] font-bold text-navy-900"><input type="checkbox" name="on" defaultChecked={on} className="size-4" />فريق التوجيه شغّال</label>
      <Save /><Msg r={r} />
    </form>
  );
}

/** one team member: his instruction (the built-in one is shown when nothing was changed) */
export function RoleForm({ id, label, text, builtIn, changed, on }: { id: string; label: string; text: string; builtIn: string; changed: boolean; on: boolean }) {
  const [r, act] = useActionState(saveRole, undefined);
  const [val, setVal] = useState(text);
  return (
    <form action={act} className="card flex flex-col gap-3 p-5">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[16px] font-bold text-navy-900">{label}</h3><span className="text-[12.5px] text-subtle">{changed ? "معدّل" : "الأصلي"}</span></div>
      <textarea name="text" value={val} onChange={(e) => setVal(e.target.value.slice(0, TEAM_MAX))} rows={6} dir="auto" className="field text-[13.5px] leading-7" />
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <label className="flex items-center gap-2"><input type="checkbox" name="on" defaultChecked={on} className="size-4" />مفعّل</label>
        <button type="button" onClick={() => setVal(builtIn)} className="font-semibold text-navy-700 underline">رجّع النص الأصلي</button>
        <span className="text-subtle">{val.length.toLocaleString("en")} / {TEAM_MAX.toLocaleString("en")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3"><Save /><Msg r={r} /></div>
    </form>
  );
}

/** one field's playbook: leave the box as the built-in text to keep it, or change it; «أصلي» clears the override */
export function FieldForm({ id, label, group, builtIn, override, on, sensitive }: { id: string; label: string; group: string; builtIn: string; override: string; on: boolean; sensitive: boolean }) {
  const [r, act] = useActionState(saveField, undefined);
  const [val, setVal] = useState(override || builtIn);
  return (
    <details className="card p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[15px] font-bold text-navy-900">
        {label}<span className="text-[12px] font-normal text-subtle">· {group}</span>
        {sensitive && <span className="rounded bg-[#FDF1E4] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#9A5B13]">حساس</span>}
        {override && <span className="rounded bg-[#E7F6EE] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#1F6B45]">معدّل</span>}
        {!on && <span className="rounded bg-[#FBE9E9] px-1.5 py-0.5 text-[11.5px] font-semibold text-red-700">موقوف</span>}
      </summary>
      <form action={act} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="id" value={id} />
        <textarea name="text" value={val} onChange={(e) => setVal(e.target.value.slice(0, TEAM_MAX))} rows={7} dir="auto" className="field text-[13.5px] leading-7" />
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <label className="flex items-center gap-2"><input type="checkbox" name="on" defaultChecked={on} className="size-4" />مفعّل</label>
          <button type="button" onClick={() => setVal("")} className="font-semibold text-navy-700 underline">رجّع للأصلي (احفظ بعدها)</button>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Save /><Msg r={r} /></div>
      </form>
    </details>
  );
}

function Scopes({ value }: { value: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
      {SKILL_SCOPES.map(([id, label]) => <label key={id} className="flex items-center gap-1.5"><input type="checkbox" name="scopes" value={id} defaultChecked={value.includes(id)} className="size-4" />{label}</label>)}
    </div>
  );
}

/** one skill (built-in or his own): edit, switch off, restore the built-in text, or delete his own */
export function SkillForm({ id, title, source, text, builtIn, scopes, on, custom }: { id: string; title: string; source: string; text: string; builtIn: string; scopes: string[]; on: boolean; custom: boolean }) {
  const [r, act] = useActionState(saveSkill, undefined);
  const [d, del] = useActionState(deleteSkill, undefined);
  const [val, setVal] = useState(text);
  return (
    <details className="card p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-[15px] font-bold text-navy-900">
        {title}
        {custom && <span className="rounded bg-[#E7F6EE] px-1.5 py-0.5 text-[11.5px] font-semibold text-[#1F6B45]">إضافتك</span>}
        {!on && <span className="rounded bg-[#FBE9E9] px-1.5 py-0.5 text-[11.5px] font-semibold text-red-700">موقوفة</span>}
        <span className="text-[12px] font-normal text-subtle">· {scopes.map((s) => SKILL_SCOPES.find(([k]) => k === s)?.[1]).filter(Boolean).join("، ")}</span>
      </summary>
      <form action={act} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="id" value={id} />
        {custom && <input name="title" defaultValue={title} className="field" placeholder="اسم المهارة" />}
        <textarea name="text" value={val} onChange={(e) => setVal(e.target.value.slice(0, TEAM_MAX))} rows={9} dir="auto" className="field text-[13.5px] leading-7" />
        {custom && <Scopes value={scopes} />}
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <label className="flex items-center gap-2"><input type="checkbox" name="on" defaultChecked={on} className="size-4" />مفعّلة</label>
          {!custom && <button type="button" onClick={() => setVal(builtIn)} className="font-semibold text-navy-700 underline">رجّع النص الأصلي</button>}
          <span className="text-subtle">{source ? `المصدر: ${source}` : ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Save /><Msg r={r} /></div>
      </form>
      {custom && (
        <form action={del} className="mt-2 flex items-center gap-3"><input type="hidden" name="id" value={id} /><button className="text-[13px] font-semibold text-red-700 underline">احذف هذي المهارة</button><Msg r={d} /></form>
      )}
    </details>
  );
}

/** add a skill of his own */
export function AddSkill() {
  const [r, act] = useActionState(addSkill, undefined);
  return (
    <form action={act} className="card flex flex-col gap-3 p-5">
      <h3 className="text-[16px] font-bold text-navy-900">＋ أضف مهارة جديدة</h3>
      <input name="title" className="field" placeholder="اسم المهارة (مثال: عروض رمضان)" />
      <textarea name="text" rows={6} dir="auto" className="field text-[13.5px] leading-7" placeholder={"قواعد قصيرة وواضحة، 5 إلى 10 سطور."} />
      <p className="text-[13px] text-subtle">تنطبق على الأدوات اللي تختارها:</p>
      <Scopes value={SKILL_SCOPES.map(([id]) => id)} />
      <div className="flex flex-wrap items-center gap-3"><Save label="أضف" /><Msg r={r} /></div>
    </form>
  );
}
