import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanIntro } from "@/components/app/PlanIntro";
import { getContent } from "@/lib/data";
import { PlanBoard } from "@/components/app/PlanBoard";
import { getL } from "@/lib/server/lang";
import type { Analysis, Plan } from "@/lib/plan";

export async function generateMetadata() { return { title: (await getL())("خطة المحتوى") }; }

export default async function PlanPage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: kit } = await supabase.from("brand_kits").select("identity,content_plan,analysis,auto_weekly,plan_prefs").eq("user_id", user!.id).maybeSingle();
  const adm = createAdminClient();
  const { data: tool } = await adm.from("tools").select("credit_cost,edit_cost").eq("id", "brand-plan").maybeSingle();
  const { data: tl } = await adm.from("tools").select("id,credit_cost").in("id", ["post", "carousel", "motion-video"]);
  const price = (id: string) => tl?.find((t) => t.id === id)?.credit_cost ?? 1;
  const intro = (await getContent()).plan_intro;
  const idName = (kit?.identity as { name?: string } | null)?.name ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/brand" className="text-sm font-semibold text-navy-700">{L("→ هويتي التجارية")}</Link>
        <h1 className="mt-2 text-[28px] font-bold text-navy-900">{L("خطة المحتوى الشهرية")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{L("تحليل لنشاطك وخطة نشر لشهر: سبت واثنين وأربعاء كل أسبوع، بوست وريلز وكاروسيل. لكل منشور برومبت احترافي جاهز تعدّله وتشغّله بأداة شاهين.")}</p>
      </div>
      <PlanIntro seen={!!(kit?.plan_prefs as { introSeen?: boolean } | null)?.introSeen} content={intro}>
        <PlanBoard identityName={idName} plan={(kit?.content_plan ?? null) as Plan | null} analysis={(kit?.analysis ?? null) as Analysis | null} cost={tool?.credit_cost ?? 4} weekCostPrice={tool?.edit_cost || 2} bg={(kit?.plan_prefs as { carouselBg?: string } | null)?.carouselBg === "ai" ? "ai" : "shapes"} auto={!!kit?.auto_weekly} unit={{ post: price("post"), carousel: price("carousel"), reel: price("motion-video") }} />
      </PlanIntro>
    </div>
  );
}
