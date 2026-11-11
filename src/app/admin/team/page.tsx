import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_EMAILS, SECTIONS } from "@/lib/admin/sections";
import { MemberForm } from "./MemberForm";
import { removeMember } from "./actions";
import { getL } from "@/lib/server/lang";
import { L } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export default async function Team() {
  const L = await getL();
  await guardPage("team");
  const { data } = await createAdminClient().from("profiles").select("id,full_name,email,role,admin_perms").in("role", ["admin", "staff"]).order("created_at");
  const sections = SECTIONS.map((s) => ({ key: s.key, label: L(s.label) }));
  const label = (k: string) => L(SECTIONS.find((s) => s.key === k)?.label ?? k);
  const people = data ?? [];
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("فريق الإدارة")}</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">{L("ضيف أي شخص عنده حساب بشاهين، وعلّم الأقسام اللي مسموح له يدخلها. ما يشوف ولا يقدر يفتح غيرها، وكل اللي يسويه ينسجّل باسمه بسجل الإدارة.")}</p>
      </div>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">{L("إضافة شخص للفريق")}</h2>
        <MemberForm sections={sections} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{L("الفريق الحالي (")}{people.length})</h2>
        {people.map((p) => {
          const owner = OWNER_EMAILS.includes(String(p.email ?? "").toLowerCase());
          return (
            <article key={p.id} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-bold text-navy-900">{p.full_name || "—"}</span>
                <span dir="ltr" className="font-latin text-sm text-subtle">{p.email}</span>
                {owner ? <span className="rounded-full bg-gold-500/15 px-2.5 py-0.5 text-xs font-bold text-[#8a6a2a]">{L("المالك")}</span>
                  : p.role === "admin" ? <span className="rounded-full bg-navy-800 px-2.5 py-0.5 text-xs font-bold text-white">{L("صلاحية كاملة")}</span>
                  : <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-bold text-navy-800">{(p.admin_perms ?? []).length} {L("قسم")}</span>}
                {!owner && <form action={removeMember} className="ms-auto"><input type="hidden" name="user_id" value={p.id} /><button className="text-sm font-semibold text-red-700 underline">{L("إزالة من الفريق")}</button></form>}
              </div>
              {owner ? <p className="text-sm text-subtle">{L("صلاحية كاملة دائماً، وما بتتغيّر.")}</p> : (
                <>
                  {p.role === "staff" && <p className="text-[13px] text-subtle">{L("مسموح:")} {(p.admin_perms ?? []).map(label).join(" · ") || L("ولا قسم")}</p>}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-semibold text-navy-700">{L("تعديل الصلاحيات")}</summary>
                    <div className="mt-3"><MemberForm sections={sections} email={p.email ?? ""} perms={p.admin_perms ?? []} full={p.role === "admin"} compact /></div>
                  </details>
                </>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
