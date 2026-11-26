import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDUSTRIES } from "@/design/industries";
import { ROLES, SKILLS, SKILL_SCOPES, SENSITIVE, TOOL_SCOPE, cleanTeam, playText } from "@/lib/team";
import { MasterForm, RoleForm, FieldForm, SkillForm, AddSkill } from "./TeamForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "فريق التوجيه" };

/** «فريق التوجيه»: the know-how every tool reads. Roles (strategist, hook writer, art director, editor) + one playbook per field. The admin edits, switches off or restores each one. */
export default async function TeamPage() {
  await guardPage("ai");
  const { data: row } = await createAdminClient().from("admin_secrets").select("value").eq("key", "ai_team").maybeSingle();
  const team = cleanTeam(row?.value);
  const custom = Object.entries(team.skills ?? {}).filter(([, x]) => x.custom);
  const { data: toolRows } = await createAdminClient().from("tools").select("id,name").order("sort_order", { ascending: true });
  const tools = ((toolRows ?? []) as { id: string; name: string }[]).filter((t) => TOOL_SCOPE[t.id]);
  const loose = ((toolRows ?? []) as { id: string; name: string }[]).filter((t) => !TOOL_SCOPE[t.id]);
  const scopeLabel = (s: string) => SKILL_SCOPES.find(([id]) => id === s)?.[1] ?? s;
  const activeFor = (s: string) => SKILLS.filter((b) => (b.scopes as string[]).includes(s) && team.skills?.[b.id]?.on !== false).length + custom.filter(([, x]) => x.on !== false && (x.scopes ?? []).includes(s as never)).length;
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">← مركز الذكاء الاصطناعي</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">فريق التوجيه</h1>
        <p className="mt-1 max-w-3xl text-sm leading-7 text-subtle">الفريق واحد لكل العملاء، لكن كل عميل يوصله شغل مختلف حسب مجاله: ملف مخصص لكل مجال + أعضاء الفريق (المخطط، كاتب الهوكات، المخرج الفني، المحرر). كل شي تعدله أو توقفه أو ترجعه للأصلي، والتغيير يطبّق على الطلبات الجديدة خلال نص دقيقة. طلب العميل وهويته أهم منه، وقواعد المقاس والأمان أقوى منه.</p>
      </div>
      <MasterForm on={team.on !== false} />
      <p className="text-[13.5px]"><Link href="/admin/ai/team/customers" className="font-semibold text-navy-700 underline">👥 تعليمات العملاء (تعليماتي)</Link> — شوف اللي كتبوه وامسحه لو لزم.</p>
      <h2 className="text-[19px] font-bold text-navy-900">أعضاء الفريق</h2>
      {ROLES.map((r) => (
        <RoleForm key={r.id} id={r.id} label={r.label} text={team.roles?.[r.id]?.text ?? r.text} builtIn={r.text} changed={!!team.roles?.[r.id]?.text} on={team.roles?.[r.id]?.on !== false} />
      ))}
      <h2 className="mt-2 text-[19px] font-bold text-navy-900">الأدوات والمهارات اللي تاخذها</h2>
      <p className="-mt-3 text-[13.5px] leading-6 text-subtle">كل أداة مربوطة بنوعها، والقالب وتوأمه «مبتكر» ياخذون نفس المهارات. عدّل مهارة من القائمة تحت وتغيّر بكل الأدوات اللي من نوعها.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-[13.5px]">
          <thead><tr className="bg-surface text-start text-subtle"><th className="p-2.5 text-start">الأداة</th><th className="p-2.5 text-start">نوع المهارات</th><th className="p-2.5 text-start">عدد المهارات الشغالة</th></tr></thead>
          <tbody>{tools.map((t) => (<tr key={t.id} className="border-t border-line"><td className="p-2.5 font-semibold text-navy-900">{t.name}</td><td className="p-2.5">{scopeLabel(TOOL_SCOPE[t.id])}</td><td className="p-2.5">{activeFor(TOOL_SCOPE[t.id])}</td></tr>))}</tbody>
        </table>
      </div>
      {loose.length ? <p className="text-[13px] leading-6 text-subtle">أدوات ما تأخذ مهارات (ما فيها كتابة أو تصميم يتغير حسب المجال): {loose.map((t) => t.name).join("، ")}.</p> : null}
      <h2 className="mt-2 text-[19px] font-bold text-navy-900">المهارات ({SKILLS.length} أساسية{custom.length ? ` + ${custom.length} إضافاتك` : ""})</h2>
      <p className="-mt-3 text-[13.5px] leading-6 text-subtle">أساليب مشتركة بين كل المجالات، مأخوذة من أقوى مكتبات المهارات المفتوحة (marketingskills وinstagram-skills وsocial-ai-team، كلها بترخيص MIT) ومكتوبة بالعربي. توقف أو تعدّل أو تضيف مهاراتك.</p>
      {SKILLS.map((b) => (
        <SkillForm key={b.id} id={b.id} title={b.title} source={b.source} text={team.skills?.[b.id]?.text ?? b.text} builtIn={b.text} scopes={b.scopes} on={team.skills?.[b.id]?.on !== false} custom={false} />
      ))}
      {custom.map(([id, x]) => (
        <SkillForm key={id} id={id} title={x.title ?? id} source="" text={x.text ?? ""} builtIn="" scopes={x.scopes ?? []} on={x.on !== false} custom />
      ))}
      <AddSkill />
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
