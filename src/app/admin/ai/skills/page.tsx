import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SKILL_TOOLS, cleanSkills } from "@/lib/aiSkills";
import { SkillForm } from "./SkillForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "مهارات الأدوات" };

/** «مهارات الأدوات»: the admin teaches each innovative tool his own rules and taste. The model reads them with every new order. */
export default async function SkillsPage() {
  await guardPage("ai");
  const admin = createAdminClient();
  const [{ data: row }, { data: tools }] = await Promise.all([
    admin.from("admin_secrets").select("value").eq("key", "ai_skills").maybeSingle(),
    admin.from("tools").select("id,name").in("id", [...SKILL_TOOLS]),
  ]);
  const skills = cleanSkills(row?.value);
  const name = new Map((tools ?? []).map((t) => [t.id, t.name]));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">← مركز الذكاء الاصطناعي</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">مهارات الأدوات</h1>
        <p className="mt-1 max-w-3xl text-sm leading-7 text-subtle">لكل أداة مبتكرة خانة تكتب فيها قواعدك وذوقك، والنموذج يقراها مع كل طلب جديد فوق تعليماته الأصلية. تعدّلها متى ما تبي بدون رفع ملفات.</p>
      </div>
      <div className="card flex flex-col gap-2 p-5 text-[14px] leading-7 text-muted">
        <p className="font-bold text-navy-900">كيف تكتب مهارة تنفع</p>
        <ul className="list-disc ps-5">
          <li><b>قواعد قصيرة وواضحة</b>، من 5 إلى 10 لكل أداة. القواعد الكثيرة تشتت النموذج.</li>
          <li><b>اكتب اللي شفته بتجاربك:</b> «لا ترسم شعار»، «الاسم أكبر عنصر»، «خل هامش واسع».</li>
          <li><b>الكود مرجع للأسلوب بس:</b> تقدر تلصق HTML و CSS لتصميم عجبك، والنموذج يتعلم من أسلوبه. الكود هنا ما يشتغل على الموقع، وكل تصميم يمر على نفس فحص الأمان.</li>
          <li><b>الملفات:</b> ملفات نصية بس (txt, md, html, css, svg, json)، ومحتواها ينضاف للخانة كنص. الصور والـPDF والوورد ما تنقبل.</li>
          <li><b>المهارة ما تلغي الأساسيات:</b> المقاس، منع السكربتات، وعدم اختراع أسعار أو أسماء تبقى أقوى منها.</li>
          <li><b>كل ما طالت المهارة زادت تكلفة الطلب شوي</b> (تنحسب مع الإدخال).</li>
        </ul>
      </div>
      {SKILL_TOOLS.map((id) => (
        <SkillForm key={id} tool={id} name={name.get(id) ?? id} text={skills[id]?.text ?? ""} on={skills[id]?.on ?? true} at={skills[id]?.at ?? ""} />
      ))}
    </div>
  );
}
