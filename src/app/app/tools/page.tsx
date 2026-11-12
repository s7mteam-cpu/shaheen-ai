import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DemoVideo } from "@/components/DemoVideo";
import { getToolsL } from "@/lib/data";
import { getL } from "@/lib/server/lang";
import { demoThumb, youtubeId } from "@/lib/video";
import type { Tool } from "@/lib/defaults";

export async function generateMetadata() { return { title: (await getL())("الأدوات") }; }
const groups = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"]] as const;
/** Ready illustrations in /public/covers (the admin's own picture always wins). */
const COVERS = ["post", "image", "carousel", "motion-video", "lesson-video", "quran-video", "video-editing", "product-video", "avatar-video", "ad-design", "voice", "nasheed", "product-photo"];

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

function ToolCard({ t, L }: { t: Tool; L: (s: string) => string }) {
  const pic = t.cover_url || (COVERS.includes(t.id) ? `/covers/${t.id}.svg` : null) || demoThumb(t);
  const learn = t.tutorial_url?.trim();
  const btn = "flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-bold sm:text-[14px]";
  return (
    <article className="card flex w-full flex-col overflow-hidden rounded-2xl p-0 transition hover:-translate-y-0.5 hover:border-gold-500">
      <Link href={`/app/tools/${t.id}`} className="relative block aspect-[4/3] overflow-hidden bg-navy-800" tabIndex={-1} aria-hidden>
        {pic
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={pic} alt="" loading="lazy" className="h-full w-full object-cover" />
          : (
            <span className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#1B4C7E,#0A1E36)]">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-gold-500 ring-1 ring-white/15 sm:h-20 sm:w-20"><Icon name={t.icon} size={34} /></span>
            </span>
          )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="text-[15px] font-bold leading-6 text-navy-900 sm:text-[16px]">{t.name}</h3>
        <p className="line-clamp-2 text-[12px] leading-5 text-subtle sm:text-[13px]">{t.description}</p>
        <span className="text-[12px] font-semibold text-navy-700">{t.credit_cost} {L("ريشة /")} {t.cost_unit}</span>
        <div className="mt-auto flex flex-col gap-2 pt-3">
          <Link href={`/app/tools/${t.id}`} className={`${btn} btn-gold`}>{L("ابدأ الإنشاء")}</Link>
          {!learn ? (
            <span className={`${btn} border border-line text-subtle`} aria-disabled>{L("الشرح قريباً")}</span>
          ) : youtubeId(learn) ? (
            <a href={learn} target="_blank" rel="noopener noreferrer" className={`${btn} border border-navy-800 text-navy-800 hover:bg-tint`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>{L("علّمني الطريقة")}
            </a>
          ) : (
            <DemoVideo url={learn} title={t.name} variant="button" label={L("علّمني الطريقة")} className={`${btn} border border-navy-800 text-navy-800 hover:bg-tint`} />
          )}
        </div>
      </div>
    </article>
  );
}
