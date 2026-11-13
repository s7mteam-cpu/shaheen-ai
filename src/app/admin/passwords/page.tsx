import { guardPage } from "@/lib/server/auth";
import { readLock, lockedSections } from "@/lib/server/adminLock";
import { SECTIONS, ALWAYS_LOCKED } from "@/lib/admin/sections";
import { getL, serverT } from "@/lib/server/lang";
import { CreateLock, ManageLock } from "./Forms";

export const dynamic = "force-dynamic";

/** «كلمات السر»: the owner puts a second password on any admin section. */
export default async function Passwords() {
  await guardPage("passwords");
  const T = await serverT();
  const L = await getL();
  const { lock, missing } = await readLock();
  const locked = lockedSections(lock);
  const sections = [...SECTIONS, { key: "passwords", label: "كلمات السر" }].map((s) => ({
    key: s.key, label: L(s.label), always: ALWAYS_LOCKED.includes(s.key as never), on: locked.includes(s.key as never),
  }));
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("كلمات السر")}</h1>
        <p className="mt-1 text-sm text-subtle">{T("طبقة حماية ثانية فوق صلاحيات الفريق: أي قسم تقفله ما ينفتح إلا بكلمة سر الإدارة، لك ولفريقك.", "A second layer on top of team permissions: a locked section opens only with the admin password, for you and your team.")}</p>
      </div>
      {missing ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{T("شغّل ملف SQL حق v65 بـ Supabase أول.", "Run the v65 SQL file in Supabase first.")}</p>
        : lock ? <ManageLock sections={sections} /> : <CreateLock sections={sections} />}
    </div>
  );
}
