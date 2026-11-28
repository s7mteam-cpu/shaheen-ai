import { mainTools } from "@/lib/toolPairs";
import Link from "next/link";
import { ToolCard } from "@/components/app/ToolCard";
import { TeamCard } from "@/components/app/TeamCard";
import { WorkCard } from "@/components/app/WorkCard";
import { getToolsL, getShowcase } from "@/lib/data";
import { exampleCats } from "@/lib/showcase";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";
import { extraPricing } from "@/lib/server/pricing";
import { getFreeEngine } from "@/lib/server/freeEngine";


export async function generateMetadata() { return { title: (await getL())("الرئيسية") }; }

export default async function Dashboard() {
  const L = await getL();
  const [tools0, works, shown] = await Promise.all([getToolsL(), listWorks({ limit: 4 }), getShowcase()]);
  const tools = mainTools(tools0);
  const ex = exampleCats(shown);
  const aiX = (await extraPricing()).ai_clip_x;
  const fxMin = (await getFreeEngine().catch(() => null))?.fxMinCost ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{L("الرئيسية")}</h2>
      {/* phones: the team card here, and the tools live in their own tab; computers keep the tools grid */}
      <TeamCard />
      <section aria-label={L("الأدوات")} className="max-lg:hidden">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {tools.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} exampleCat={ex[t.id]} price={t.id === "real-scenes" ? t.credit_cost * aiX : undefined} from={t.id === "free-montage" && fxMin > t.credit_cost ? fxMin : undefined} /></li>)}
        </ul>
      </section>

      {works.length > 0 && (
        <section aria-labelledby="wk" className="flex flex-col gap-4 max-lg:hidden">
          <div className="flex items-center justify-between"><h2 id="wk" className="text-[20px] font-bold text-navy-900">{L("آخر أعمالي")}</h2><Link href="/app/works" className="text-sm font-semibold text-navy-700">{L("كل الأعمال")}</Link></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </div>
  );
}
