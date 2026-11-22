import Link from "next/link";
import { ToolCard } from "@/components/app/ToolCard";
import { getToolsL, getShowcase } from "@/lib/data";
import { exampleCats } from "@/lib/showcase";
import { getL } from "@/lib/server/lang";
import { getToolSections } from "@/lib/server/toolSections";
import { SECTION_ICON, SECTION_IDS, sectionOf, type SectionId } from "@/lib/toolSections";

export async function generateMetadata() { return { title: (await getL())("الأدوات") }; }
const groups = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"], ["docs", "مستندات"]] as const;

/** «الأدوات»: the sections on top (المبتكر · القوالب الجاهزة · صوت وصور), each with its two lines; under them the chosen section's tools as cards. */
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const L = await getL();
  const [tools, shown, sec, sp] = await Promise.all([getToolsL(), getShowcase(), getToolSections(), searchParams]);
  const ex = exampleCats(shown);
  const bySec = (id: SectionId) => tools.filter((t) => sectionOf(t.id, sec) === id);
  const live = SECTION_IDS.filter((id) => bySec(id).length);
  const cur = live.includes(sp.s as SectionId) ? (sp.s as SectionId) : live[0];
  const mine = cur ? bySec(cur) : [];
  return (
    <div className="flex flex-col gap-6">
      <h1 id="tools-top" className="scroll-mt-24 text-[26px] font-bold text-navy-900 sm:text-[28px]">{L("الأدوات")}</h1>
      {live.length > 1 && (
        <nav aria-label={L("أقسام الأدوات")}>
          <ul className={`grid gap-3 ${live.length > 2 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
            {live.map((id) => (
              <li key={id} className="flex">
                <Link href={`/app/tools?s=${id}`} scroll={false} aria-current={id === cur ? "page" : undefined}
                  className={`flex w-full flex-col gap-1.5 rounded-2xl border-2 p-4 transition ${id === cur ? "border-gold-500 bg-gold-500/10 shadow-sm" : "border-line bg-surface hover:border-gold-500/50"}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[17px] font-bold text-navy-900">{SECTION_ICON[id]} {L(sec.texts[id].title)}</span>
                    <span className="rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[12px] font-semibold text-navy-700">{bySec(id).length} {L("أداة")}</span>
                  </span>
                  <span className="text-[13.5px] leading-6 text-muted">{L(sec.texts[id].desc)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {groups.map(([g, label]) => {
        const list = mine.filter((t) => t.category === g);
        if (!list.length) return null;
        return (
          <section key={g} aria-labelledby={`tg-${g}`} className="flex flex-col gap-3">
            <h2 id={`tg-${g}`} className="text-lg font-bold text-navy-700">{L(label)}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {list.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} exampleCat={ex[t.id]} /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
