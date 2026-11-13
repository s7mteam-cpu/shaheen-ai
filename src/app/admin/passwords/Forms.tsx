"use client";
import { useActionState, useState } from "react";
import { createLockAction, unlockAction, saveSectionsAction, changePasswordAction, removeLockAction, relockAction } from "./actions";
import { LT } from "@/lib/i18n/ui";

type Sec = { key: string; label: string; always: boolean; on: boolean };
const Msg = ({ s }: { s?: { ok?: string; error?: string } }) => <>
  {s?.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{s.error}</p>}
  {s?.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{s.ok}</p>}
</>;
const Pw = ({ name, label, auto, min }: { name: string; label: string; auto: string; min?: number }) => (
  <label className="flex flex-col gap-1 text-[14px] font-semibold text-navy-900">{label}
    <input name={name} type="password" required minLength={min} autoComplete={auto} dir="ltr" className="field text-left font-normal" />
  </label>
);
function SectionChecks({ sections }: { sections: Sec[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">{sections.map((s) => (
      <label key={s.key} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[14px] ${s.always ? "border-red-200 bg-red-50/50" : "border-[#E3E8EF] bg-white"}`}>
        <input type="checkbox" name={`s_${s.key}`} defaultChecked={s.on || s.always} disabled={s.always} className="h-5 w-5" />
        <span className="font-semibold text-navy-900">{s.label}</span>
        {s.always && <span className="ms-auto text-[12px] text-red-700">{LT("مقفول دائماً", "Always locked")}</span>}
      </label>
    ))}</div>
  );
}

export function CreateLock({ sections }: { sections: Sec[] }) {
  const [s, action, pending] = useActionState(createLockAction, undefined);
  return (
    <form action={action} className="card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-bold text-navy-900">🔐 {LT("حط كلمة سر الإدارة", "Set the admin password")}</h2>
      <p className="text-[14px] leading-7 text-subtle">{LT("هذي طبقة حماية ثانية، غير كلمة سر حسابك. أي قسم تعلّم عليه، ما ينفتح إلا بهالكلمة، حتى لو كان عند الشخص صلاحية عليه. 8 حروف على الأقل، واحفظها بملف الإكسل المحمي.", "A second layer, separate from your account password. Any section you tick opens only with it, even for someone who has permission. At least 8 characters; keep it in your protected Excel file.")}</p>
      <div className="grid gap-3 sm:grid-cols-2"><Pw name="password" label={LT("كلمة السر", "Password")} auto="new-password" min={8} /><Pw name="password2" label={LT("مرة ثانية", "Again")} auto="new-password" min={8} /></div>
      <p className="font-bold text-navy-900">{LT("الأقسام اللي تبيها مقفولة:", "Sections to lock:")}</p>
      <SectionChecks sections={sections} />
      <Msg s={s} />
      <button disabled={pending} className="btn btn-primary py-3">{pending ? "…" : LT("احفظ", "Save")}</button>
    </form>
  );
}

export function UnlockForm({ next }: { next: string }) {
  const [s, action, pending] = useActionState(unlockAction, undefined);
  return (
    <form action={action} className="card flex max-w-md flex-col gap-3 border-2 border-red-200 p-6">
      <input type="hidden" name="next" value={next} />
      <h2 className="text-lg font-bold text-navy-900">🔒 {LT("هالقسم مقفول بكلمة سر الإدارة", "This section is locked with the admin password")}</h2>
      <p className="text-[14px] leading-7 text-subtle">{LT("اكتبها مرة وحدة، وكل الأقسام المقفولة تنفتح لك 15 دقيقة، وبعدها تنقفل بنفسها.", "Type it once and every locked section opens for 15 minutes, then locks itself.")}</p>
      <Pw name="password" label={LT("كلمة السر", "Password")} auto="current-password" />
      <Msg s={s} />
      <button disabled={pending} className="btn btn-primary py-3">{pending ? "…" : LT("افتح", "Open")}</button>
      <p className="text-[12px] text-subtle">{LT("نسيتها؟ الطريقة مكتوبة بملف SQL حق v65 (سطر واحد تشغّله بـ Supabase).", "Forgot it? The fix is in the v65 SQL file (one line to run in Supabase).")}</p>
    </form>
  );
}

export function ManageLock({ sections }: { sections: Sec[] }) {
  const [s1, saveSecs, p1] = useActionState(saveSectionsAction, undefined);
  const [s2, change, p2] = useActionState(changePasswordAction, undefined);
  const [s3, remove, p3] = useActionState(removeLockAction, undefined);
  const [danger, setDanger] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <form action={relockAction}><button className="btn btn-outline px-4 py-2 text-sm">🔒 {LT("اقفل الأقسام الحين", "Lock now")}</button></form>
      <form action={saveSecs} className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold text-navy-900">{LT("الأقسام المقفولة", "Locked sections")}</h2>
        <SectionChecks sections={sections} />
        <Msg s={s1} />
        <button disabled={p1} className="btn btn-primary py-2.5">{p1 ? "…" : LT("احفظ الأقسام", "Save sections")}</button>
      </form>
      <form action={change} className="card flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold text-navy-900">{LT("تغيير كلمة السر", "Change the password")}</h2>
        <Pw name="password" label={LT("الحالية", "Current")} auto="current-password" />
        <div className="grid gap-3 sm:grid-cols-2"><Pw name="next" label={LT("الجديدة (8 حروف على الأقل)", "New (8+ characters)")} auto="new-password" min={8} /><Pw name="next2" label={LT("الجديدة مرة ثانية", "New again")} auto="new-password" min={8} /></div>
        <Msg s={s2} />
        <button disabled={p2} className="btn btn-primary py-2.5">{p2 ? "…" : LT("غيّر", "Change")}</button>
      </form>
      <div className="card flex flex-col gap-3 border-red-200 p-6">
        <button type="button" onClick={() => setDanger(!danger)} className="text-start text-sm font-semibold text-red-700">{LT("شيل كلمة السر كلها…", "Remove the password…")}</button>
        {danger && (
          <form action={remove} className="flex flex-col gap-3">
            <p className="text-[13px] leading-6 text-subtle">{LT("كل الأقسام بتنفتح بدون كلمة سر، و«تصفير المنصة» بيتقفل لين تحط كلمة سر جديدة.", "Every section opens without it, and «Platform reset» stays closed until you set a new one.")}</p>
            <Pw name="password" label={LT("اكتب كلمة السر للتأكيد", "Type the password to confirm")} auto="current-password" />
            <Msg s={s3} />
            <button disabled={p3} className="btn border border-red-300 bg-white py-2.5 font-semibold text-red-700">{p3 ? "…" : LT("شيلها", "Remove")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
