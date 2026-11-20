import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DemoVideo } from "@/components/DemoVideo";
import { toolCover, youtubeId } from "@/lib/video";
import type { Tool } from "@/lib/defaults";

/** A tool as a card: picture + name + «ابدأ الإنشاء» then «أمثلة» + «طريقة العمل» (used on «الأدوات» and the dashboard). */
export function ToolCard({ t, L, exampleCat }: { t: Tool; L: (s: string) => string; exampleCat?: string }) {
  const pic = toolCover(t);
  const learn = t.tutorial_url?.trim();
  const btn = "flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[13px] font-bold sm:text-[14px]";
  const half = "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-[12px] font-bold sm:text-[13px]";
  const off = `${half} border border-line text-subtle`;
  const on = `${half} border border-navy-800 text-navy-800 hover:bg-tint`;
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
          <div className="flex gap-2">
            {exampleCat
              ? <Link href={`/app/showcase?c=${exampleCat}`} className={on}>{L("أمثلة")}</Link>
              : <span className={off} aria-disabled>{L("أمثلة")}</span>}
            {!learn ? (
              <span className={off} aria-disabled>{L("طريقة العمل")}</span>
            ) : youtubeId(learn) ? (
              <a href={learn} target="_blank" rel="noopener noreferrer" className={on}>{L("طريقة العمل")}</a>
            ) : (
              <DemoVideo url={learn} title={t.name} variant="button" label={L("طريقة العمل")} className={on} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
