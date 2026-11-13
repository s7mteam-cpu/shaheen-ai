import Link from "next/link";
import { ToolCard } from "@/components/app/ToolCard";
import { WorkCard } from "@/components/app/WorkCard";
import { getToolsL } from "@/lib/data";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";
import { getSessionProfile } from "@/lib/data";
import { endExpiredTrials, trialStatus } from "@/lib/server/trial";
import { TrialBanner } from "./trial/TrialBanner";

export async function generateMetadata() { return { title: (await getL())("الرئيسية") }; }

export default async function Dashboard() {
  const L = await getL();
  const [tools, works, profile] = await Promise.all([getToolsL(), listWorks({ limit: 4 }), getSessionProfile()]);
  if (profile) await endExpiredTrials(profile.id).catch(() => 0);   // a trial whose time is up ends right away
  const trial = profile && profile.role === "user" ? await trialStatus(profile.id).catch(() => ({ state: "none" as const })) : { state: "none" as const };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{L("الرئيسية")}</h2>
      {trial.state !== "none" && <TrialBanner state={trial.state} credits={trial.credits ?? 0} hours={trial.hours} expiresAt={trial.expiresAt} />}
      <section aria-label={L("الأدوات")}>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {tools.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} /></li>)}
        </ul>
      </section>

      {works.length > 0 && (
        <section aria-labelledby="wk" className="flex flex-col gap-4">
          <div className="flex items-center justify-between"><h2 id="wk" className="text-[20px] font-bold text-navy-900">{L("آخر أعمالي")}</h2><Link href="/app/works" className="text-sm font-semibold text-navy-700">{L("كل الأعمال")}</Link></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </div>
  );
}
