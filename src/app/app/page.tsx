import { getToolSections } from "@/lib/server/toolSections";
import { SECTION_ICON, SECTION_IDS, sectionOf } from "@/lib/toolSections";
import Link from "next/link";
import { ToolCard } from "@/components/app/ToolCard";
import { WorkCard } from "@/components/app/WorkCard";
import { getToolsL, getShowcase } from "@/lib/data";
import { exampleCats } from "@/lib/showcase";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";


export async function generateMetadata() { return { title: (await getL())("الرئيسية") }; }

export default async function Dashboard() {
  const L = await getL();
  const [tools, works, shown, sec] = await Promise.all([getToolsL(), listWorks({ limit: 4 }), getShowcase(), getToolSections()]);
  const ex = exampleCats(shown);

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">{L("الرئيسية")}</h2>
      {SECTION_IDS.map((id) => {
        const list = tools.filter((t) => sectionOf(t.id, sec) === id);
        if (!list.length) return null;
        return (
          <section key={id} aria-labelledby={`sec-${id}`} className="flex flex-col gap-3">
            <div className="border-s-4 border-gold-500 ps-3">
              <h2 id={`sec-${id}`} className="text-[20px] font-bold text-navy-900">{SECTION_ICON[id]} {L(sec.texts[id].title)}</h2>
              <p className="mt-0.5 max-w-3xl text-[14px] leading-6 text-muted">{L(sec.texts[id].desc)}</p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {list.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} exampleCat={ex[t.id]} /></li>)}
            </ul>
          </section>
        );
      })}

      {works.length > 0 && (
        <section aria-labelledby="wk" className="flex flex-col gap-4">
          <div className="flex items-center justify-between"><h2 id="wk" className="text-[20px] font-bold text-navy-900">{L("آخر أعمالي")}</h2><Link href="/app/works" className="text-sm font-semibold text-navy-700">{L("كل الأعمال")}</Link></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </div>
  );
}
