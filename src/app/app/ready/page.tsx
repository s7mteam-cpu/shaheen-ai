import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getL } from "@/lib/server/lang";
import { WorkCard } from "@/components/app/WorkCard";
import { listWorks } from "@/lib/works";
import { FORMAT_LABEL, FORMAT_TOOL, planWeekOf, type Plan } from "@/lib/plan";
import { CopyBtn } from "@/components/app/CopyBtn";

export async function generateMetadata() { return { title: (await getL())("منشوراتك جاهزة للنشر") }; }

/** «منشوراتك جاهزة للنشر»: this week's prepared posts by day, with the caption ready to copy. Shown in the menu only for customers who switched the weekly schedule on. */
export default async function ReadyPage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: kit } = await supabase.from("brand_kits").select("content_plan,auto_weekly").eq("user_id", user.id).maybeSingle();
  if (!kit?.auto_weekly) redirect("/app/brand/plan");
  const plan = kit.content_plan as Plan | null;
  const works = await listWorks({ ready: true, limit: 120 });
  const byId = new Map(works.map((w) => [w.id, w]));
  const start = plan?.start;
  const cur = start ? planWeekOf(start) + 1 : 1;
  const weeks = [...new Set((plan?.items ?? []).filter((x) => x.job).map((x) => x.week))].sort((a, b) => b - a);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] font-bold text-navy-900">{L("منشوراتك جاهزة للنشر")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{L("منشورات خطتك الشهرية اللي جهزناها لك. افتح كل واحد وراجعه وعدّله وحمّله، وانسخ الكابشن وانشره بيومه.")}</p>
      </div>
      {weeks.length === 0 && <div className="card p-6 text-muted">{L("لسا ما جهزنا لك منشورات. التجهيز يصير كل سبت الساعة 9 الصبح بتوقيت الكويت، أو جهّز الأسبوع يدوياً من")} <Link href="/app/brand/plan" className="font-bold text-navy-700 underline">{L("خطة المحتوى")}</Link>.</div>}
      {weeks.map((w) => (
        <section key={w} className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-navy-900">{L("الأسبوع")} {w}{w === cur ? ` · ${L("هذا الأسبوع")}` : ""}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(plan?.items ?? []).filter((x) => x.week === w && x.job).map((x) => {
              const work = byId.get(x.job!);
              return (
                <div key={x.job} className="card flex flex-col gap-3 p-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-navy-800 px-3 py-1 text-[13px] font-bold text-white">{x.day} {x.date}</span><span className="rounded-full bg-gold-100 px-3 py-1 text-[13px] font-bold">{L(FORMAT_LABEL[x.format])}</span></div>
                  {work ? <WorkCard w={work} /> : <Link href={`/app/tools/${FORMAT_TOOL[x.format]}?job=${x.job}`} className="btn btn-primary py-3 text-center font-bold">{L("افتح وراجع")}</Link>}
                  <p className="line-clamp-2 text-[14px] font-semibold">{x.topic}</p>
                  {x.caption && <CopyBtn text={x.caption} label={L("نسخ الكابشن")} done={L("تم النسخ ✓")} />}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
