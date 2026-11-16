import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanBoard } from "@/components/app/PlanBoard";
import { getL } from "@/lib/server/lang";
import type { Analysis, Plan } from "@/lib/plan";

export async function generateMetadata() { return { title: (await getL())("خطة المحتوى الشهرية") }; }

export default async function PlanPage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: kit } = await supabase.from("brand_kits").select("identity,content_plan,analysis").eq("user_id", user!.id).maybeSingle();
  const adm = createAdminClient();
  const { data: tool } = await adm.from("tools").select("credit_cost").eq("id", "brand-plan").maybeSingle();
  const { data: tl } = await adm.from("tools").select("id,credit_cost").in("id", ["post", "carousel", "motion-video"]);
  const price = (id: string) => tl?.find((t) => t.id === id)?.credit_cost ?? 1;
  const idName = (kit?.identity as { name?: string } | null)?.name ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/brand" className="text-sm font-semibold text-navy-700">{L("→ هويتي التجارية")}</Link>
        <h1 className="mt-2 text-[28px] font-bold text-navy-900">{L("خطة المحتوى الشهرية")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{L("تحليل لنشاطك وخطة نشر لشهر: سبت واثنين وأربعاء كل أسبوع، بوست وريلز وكاروسيل. لكل منشور برومبت احترافي جاهز تعدّله وتشغّله بأداة شاهين.")}</p>
      </div>
      <PlanBoard identityName={idName} plan={(kit?.content_plan ?? null) as Plan | null} analysis={(kit?.analysis ?? null) as Analysis | null} cost={tool?.credit_cost ?? 4} unit={{ post: price("post"), carousel: price("carousel"), reel: price("motion-video") }} />
    </div>
  );
}
