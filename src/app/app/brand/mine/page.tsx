import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { SKILLS, cleanTeam } from "@/lib/team";
import { cleanMine, LOCKED_SKILLS } from "@/lib/mine";
import { MineForm } from "@/components/app/MineForm";

export async function generateMetadata() { return { title: (await getL())("تعليماتي") }; }

export default async function MinePage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: kit } = await supabase.from("brand_kits").select("plan_prefs").eq("user_id", user!.id).maybeSingle();
  const { data: row } = await createAdminClient().from("admin_secrets").select("value").eq("key", "ai_team").maybeSingle();
  const team = cleanTeam(row?.value);
  const mine = cleanMine((kit?.plan_prefs as { mine?: unknown } | null)?.mine);
  // skills the admin switched off are not shown to the customer; the team itself being off hides the list
  const list = team.on === false ? [] : SKILLS.filter((s) => team.skills?.[s.id]?.on !== false).map((s) => ({ id: s.id, title: s.title, locked: LOCKED_SKILLS.includes(s.id) }));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/brand" className="text-sm font-semibold text-navy-700">{L("→ هويتي التجارية")}</Link>
        <h1 className="mt-2 text-[28px] font-bold text-navy-900">{L("تعليماتي")}</h1>
        <p className="mt-1 max-w-2xl leading-7 text-muted">{L("اكتب هنا تفضيلاتك بلهجتك، وشاهين يطبّقها على كل شي يسويه لك: بوستات، كاروسيل، فيديو وغيرها. تقدر توقف أي مهارة من مهارات المنصة لحسابك، وتضيف مهارات من عندك.")}</p>
      </div>
      <MineForm initial={mine} skills={list} hasKit={!!kit} />
    </div>
  );
}
