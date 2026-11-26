import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SKILLS, SKILL_SCOPES } from "@/lib/team";
import { cleanMine } from "@/lib/mine";
import { ClearForm } from "./ClearForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "تعليمات العملاء" };

/** «تعليماتي» of every customer who wrote something: read it, and wipe it when it should not be there. */
export default async function CustomersMine() {
  await guardPage("ai");
  const { data } = await createAdminClient().from("brand_kits").select("user_id,business_name,plan_prefs,updated_at").not("plan_prefs->mine", "is", null).order("updated_at", { ascending: false }).limit(200);
  const rows = (data ?? []).map((r) => ({ id: r.user_id as string, name: (r.business_name as string) || "بدون اسم", mine: cleanMine((r.plan_prefs as { mine?: unknown } | null)?.mine) }))
    .filter((r) => r.mine.notes.length || r.mine.skills.length || r.mine.off.length);
  const title = (id: string) => SKILLS.find((s) => s.id === id)?.title ?? id;
  const scope = (k: string) => SKILL_SCOPES.find(([id]) => id === k)?.[1] ?? k;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/ai/team" className="text-sm font-semibold text-navy-700 underline">← فريق التوجيه</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">تعليمات العملاء</h1>
        <p className="mt-1 max-w-3xl text-sm leading-7 text-subtle">اللي كتبه العملاء بصفحة «تعليماتي». نصهم يمر على فلتر المحتوى، وقواعد المنصة أقوى منه دائماً. لو شفت شي ما يصلح، امسح تعليمات هذا العميل.</p>
      </div>
      {!rows.length && <p className="card p-5 text-subtle">ما أحد كتب تعليمات لسا.</p>}
      {rows.map((r) => (
        <div key={r.id} className="card flex flex-col gap-2 p-5 text-[14px] leading-7">
          <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-navy-900">{r.name}</b><span dir="ltr" className="text-[12px] text-subtle">{r.id.slice(0, 8)}</span></div>
          {r.mine.notes.length > 0 && <ul className="list-disc ps-5">{r.mine.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          {r.mine.skills.map((s) => <p key={s.id}><b>{s.title}</b>{s.on ? "" : " (موقفة)"}: {s.text} <span className="text-[12px] text-subtle">· {s.scopes.map(scope).join("، ")}</span></p>)}
          {r.mine.off.length > 0 && <p className="text-subtle">أوقف من مهارات المنصة: {r.mine.off.map(title).join("، ")}</p>}
          <ClearForm user={r.id} />
        </div>
      ))}
    </div>
  );
}
