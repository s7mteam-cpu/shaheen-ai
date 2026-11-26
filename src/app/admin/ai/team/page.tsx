import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDUSTRIES } from "@/design/industries";
import { ROLES, SENSITIVE, cleanTeam, playText } from "@/lib/team";
import { MasterForm, RoleForm, FieldForm } from "./TeamForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "فريق التوجيه" };

/** «فريق التوجيه»: the know-how every tool reads. Roles (strategist, hook writer, art director, editor) + one playbook per field. The admin edits, switches off or restores each one. */
export default async function TeamPage() {
  await guardPage("ai");
  const { data: row } = await createAdminClient().from("admin_secrets").select("value").eq("key", "ai_team").maybeSingle();
  const team = cleanTeam(row?.value);
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">← مركز الذكاء الاصطناعي</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">فريق التوجيه</h1>
        <p className="mt-1 max-w-3xl text-sm leading-7 text-subtle">الفريق واحد لكل العملاء، لكن كل عميل يوصله شغل مختلف حسب مجاله: ملف مخصص لكل مجال + أعضاء الفريق (المخطط، كاتب الهوكات، المخرج الفني، المحرر). كل شي تعدله أو توقفه أو ترجعه للأصلي، والتغيير يطبّق على الطلبات الجديدة خلال نص دقيقة. طلب العميل وهويته أهم منه، وقواعد المقاس والأمان أقوى منه.</p>
      </div>
      <MasterForm on={team.on !== false} />
      <h2 className="text-[19px] font-bold text-navy-900">أعضاء الفريق</h2>
      {ROLES.map((r) => (
        <RoleForm key={r.id} id={r.id} label={r.label} text={team.roles?.[r.id]?.text ?? r.text} builtIn={r.text} changed={!!team.roles?.[r.id]?.text} on={team.roles?.[r.id]?.on !== false} />
      ))}
      <h2 className="mt-2 text-[19px] font-bold text-navy-900">ملفات المجالات ({INDUSTRIES.length - 1})</h2>
      {groups.map((g) => (
        <div key={g} className="flex flex-col gap-2">
          <p className="text-[14px] font-bold text-navy-700">{g}</p>
          {INDUSTRIES.filter((i) => i.group === g && i.id !== "other").map((i) => (
            <FieldForm key={i.id} id={i.id} label={i.label} group={g} builtIn={playText(i.id)} override={team.fields?.[i.id]?.text ?? ""} on={team.fields?.[i.id]?.on !== false} sensitive={SENSITIVE.has(i.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
