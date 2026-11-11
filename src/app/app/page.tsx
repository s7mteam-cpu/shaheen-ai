import Link from "next/link";
import { Icon } from "@/components/Icon";
import { WorkCard } from "@/components/app/WorkCard";
import { getToolsL } from "@/lib/data";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";

export async function generateMetadata() { return { title: (await getL())("الرئيسية") }; }

export default async function Dashboard() {
  const L = await getL();
  const [tools, works] = await Promise.all([getToolsL(), listWorks({ limit: 4 })]);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{L("الرئيسية")}</h2>
      <section aria-label={L("الأدوات")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.id} href={`/app/tools/${t.id}`} className="card group flex items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-gold-500">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-gold-500"><Icon name={t.icon} size={22} /></span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[16px] font-bold text-navy-900">{t.name}</span>
              <span className="text-[13px] text-subtle">{t.credit_cost} {L("ريشة /")} {t.cost_unit}</span>
            </span>
            <span aria-hidden className="ms-auto text-navy-700 transition group-hover:-translate-x-1">←</span>
          </Link>
        ))}
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
