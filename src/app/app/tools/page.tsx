import { ToolCard } from "@/components/app/ToolCard";
import { getToolsL } from "@/lib/data";
import { getL } from "@/lib/server/lang";

export async function generateMetadata() { return { title: (await getL())("الأدوات") }; }
const groups = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"]] as const;


/** «الأدوات»: a grid of cards (2 per row on phones). Each card = picture + name + «ابدأ الإنشاء» / «علّمني الطريقة». */
export default async function ToolsPage() {
  const L = await getL();
  const tools = await getToolsL();
  return (
    <div className="flex flex-col gap-7">
      <h1 id="tools-top" className="scroll-mt-24 text-[26px] font-bold text-navy-900 sm:text-[28px]">{L("الأدوات")}</h1>
      {groups.map(([g, label]) => {
        const list = tools.filter((t) => t.category === g);
        if (!list.length) return null;
        return (
          <section key={g} aria-labelledby={`tg-${g}`} className="flex flex-col gap-3">
            <h2 id={`tg-${g}`} className="text-lg font-bold text-navy-700">{L(label)}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {list.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
