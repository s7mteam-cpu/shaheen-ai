import { L } from "@/lib/i18n/ui";

/** «سوّ مثله»: shows which work the new one is modelled on. */
export function LikeNote({ like }: { like: { title: string; thumb: string | null } }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold-500/40 bg-gold-100 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {like.thumb && <img src={like.thumb} alt="" className="h-14 w-12 rounded-lg object-cover" />}
      <span className="text-[14px] leading-6 text-navy-900"><b>{L("بنفس أسلوب:")}</b> {like.title}<br /><span className="text-[13px] text-subtle">{L("فكرتك جاهزة بالخانة تحت. عدّلها وكمّل.")}</span></span>
    </div>
  );
}
