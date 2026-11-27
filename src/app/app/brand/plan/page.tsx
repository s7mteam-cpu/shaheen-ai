import { pickToolMsg } from "@/lib/toolPause";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PlanIntro } from "@/components/app/PlanIntro";
import { getContent } from "@/lib/data";
import { PlanBoard } from "@/components/app/PlanBoard";
import { getL } from "@/lib/server/lang";
import { FORMAT_TOOL_ID, PLAN_FORMATS, SITE_FORMATS, type Analysis, type Plan, type PlanPrefs } from "@/lib/plan";
import { voiceDialects } from "@/lib/voiceMatch";

export async function generateMetadata() { return { title: (await getL())("خطة المحتوى") }; }

export default async function PlanPage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: kit } = await supabase.from("brand_kits").select("identity,business_name,about,cv_text,industry,handle,content_plan,analysis,auto_weekly,plan_prefs,website,instagram").eq("user_id", user!.id).maybeSingle();
  const adm = createAdminClient();
  const { data: tool } = await adm.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", "brand-plan").maybeSingle();
  const { data: tl } = await adm.from("tools").select("id,credit_cost,is_enabled").in("id", Object.values(FORMAT_TOOL_ID));
  const price = (id: string) => tl?.find((t) => t.id === id)?.credit_cost ?? 1;
  const siteContent = await getContent();
  const intro = siteContent.plan_intro;
  const vd = voiceDialects(siteContent.voices.items);
  const idName = (kit?.identity as { name?: string } | null)?.name ?? ((kit?.business_name || "").trim() || ([kit?.industry, kit?.website, kit?.instagram, kit?.handle].some((v) => String(v ?? "").trim()) || (kit?.about || "").trim().length >= 15 || (kit?.cv_text || "").trim().length >= 15 ? "نشاطك" : null)); // an identity is not required: his business name or description is enough
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/brand" className="text-sm font-semibold text-navy-700">{L("→ هويتي التجارية")}</Link>
        <h1 className="mt-2 text-[28px] font-bold text-navy-900">{L("خطة المحتوى الشهرية")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{L("تحليل لنشاطك وخطة نشر لشهر: سبت واثنين وأربعاء كل أسبوع، بوست وريلز وكاروسيل. لكل منشور برومبت احترافي جاهز تعدّله وتشغّله بأداة شاهين.")}</p>
      </div>
      {tool && !tool.is_enabled ? <p className="card max-w-2xl p-5 text-[15px] text-muted" role="status">⏳ {L(pickToolMsg((siteContent as unknown as Record<string, unknown>).tool_msgs, "brand-plan"))}</p> : (
      <PlanIntro seen={!!(kit?.plan_prefs as { introSeen?: boolean } | null)?.introSeen} content={intro}>
        <PlanBoard voices={siteContent.voices.items} identityName={idName} plan={(kit?.content_plan ?? null) as Plan | null} analysis={(kit?.analysis ?? null) as Analysis | null} cost={tool?.credit_cost ?? 4} weekCostPrice={tool?.edit_cost || 2} prefs={(kit?.plan_prefs as PlanPrefs | null) ?? {}} dialects={vd ? [...vd] : null} auto={!!kit?.auto_weekly} unit={{ post: price("post"), carousel: price("carousel"), reel: price("motion-video"), scenes: price("real-scenes"), ad: price("ad-design"), creative: price("free-motion"), anim: price("anim-video"), site: price("site-video"), fsite: price("site-free"), image: price("image"), fpost: price("free-post"), fcarousel: price("free-carousel"), fad: price("free-ad") }} website={String(kit?.website ?? "")} available={PLAN_FORMATS.filter((f) => tl?.find((t) => t.id === FORMAT_TOOL_ID[f])?.is_enabled && (!SITE_FORMATS.includes(f) || !!kit?.website))} />
      </PlanIntro>
      )}
    </div>
  );
}
