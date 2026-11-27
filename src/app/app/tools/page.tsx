import { ToolCard } from "@/components/app/ToolCard";
import { getToolsL, getShowcase, getContent } from "@/lib/data";
import { exampleCats } from "@/lib/showcase";
import { getL } from "@/lib/server/lang";
import { extraPricing } from "@/lib/server/pricing";
import { getFreeEngine } from "@/lib/server/freeEngine";
import { mainTools, pairOf } from "@/lib/toolPairs";

export async function generateMetadata() { return { title: (await getL())("الأدوات") }; }
const groups = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"], ["docs", "مستندات"]] as const;


/** «الأدوات»: a grid of cards (2 per row on phones). Each card = picture + name + «ابدأ الإنشاء» / «علّمني الطريقة». A tool that also has a «مبتكر» way is one card; the way is picked inside it. */
export default async function ToolsPage() {
  const L = await getL();
  const open = await getToolsL();
  // a tool that is switched off but has its own message from the admin stays on the list, with that message (no message = hidden as before)
  const msgs = (((await getContent()) as unknown as Record<string, unknown>).tool_msgs ?? {}) as Record<string, unknown>;
  const msgOf = (id: string) => (typeof msgs[id] === "string" ? (msgs[id] as string).trim() : "");
  const openIds = new Set(open.map((t) => t.id));
  const all = await getToolsL(true);
  const closed = all.filter((t) => {
    if (openIds.has(t.id) || !msgOf(t.id)) return false;
    const pr = pairOf(t.id, all);
    return !pr || !openIds.has(pr.templates.id === t.id ? pr.fresh.id : pr.templates.id);
  });
  const tools = mainTools([...open, ...closed]);
  const ex = exampleCats(await getShowcase());
  const aiX = (await extraPricing()).ai_clip_x;
  const fxMin = (await getFreeEngine().catch(() => null))?.fxMinCost ?? 0;
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
              {list.map((t) => <li key={t.id} className="flex"><ToolCard t={t} L={L} paused={openIds.has(t.id) ? undefined : msgOf(t.id)} exampleCat={ex[t.id]} price={t.id === "real-scenes" ? t.credit_cost * aiX : undefined} from={t.id === "free-montage" && fxMin > t.credit_cost ? fxMin : undefined} /></li>)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
