"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LangProvider";
import { ILLUS_STYLES } from "@/remotion/styles";
import type { TemplateRow } from "@/lib/templates";

const PAGE = 24;

/** The motion-graphics template library: filter by style, open a template, write the idea, make it. Visitors are asked to subscribe first. */
export function TemplateLibrary({ templates, signedIn }: { templates: TemplateRow[]; signedIn: boolean }) {
  const T = useT();
  const [style, setStyle] = useState("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<TemplateRow | null>(null);
  const styles = ILLUS_STYLES.filter(([k]) => templates.some((t) => t.style === k));
  const list = style === "all" ? templates : templates.filter((t) => t.style === style);
  const chip = (on: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink hover:border-navy-700"}`;
  if (!templates.length) return null;
  return (
    <section id="templates" className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold text-navy-900">{T("مكتبة قوالب الموشن جرافيك", "Motion graphics templates")} <span className="text-base font-semibold text-muted">({templates.length})</span></h2>
      <p className="text-[15px] leading-7 text-muted">{T("اختر الستايل، وافتح أي قالب واكتب معلوماتك، وشاهين يبني لك فيديو بنفس بنية القالب.", "Pick a style, open a template, write your info, and Shaheen builds your video with the same structure.")}</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
        <button role="tab" aria-selected={style === "all"} onClick={() => { setStyle("all"); setShown(PAGE); }} className={chip(style === "all")}>{T("الكل", "All")} <span className="opacity-60">{templates.length}</span></button>
        {styles.map(([k, ar, , ]) => <button key={k} role="tab" aria-selected={style === k} onClick={() => { setStyle(k); setShown(PAGE); }} className={chip(style === k)}>{ar} <span className="opacity-60">{templates.filter((t) => t.style === k).length}</span></button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {list.slice(0, shown).map((t) => (
          <button key={t.id} onClick={() => setOpen(t)} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="relative aspect-[9/16] w-full overflow-hidden bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.thumb_url ? <img src={t.thumb_url} alt={t.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-sm text-subtle">{t.title}</div>}
              <span className="absolute start-2 top-2 rounded-full bg-navy-900/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{ILLUS_STYLES.find((x) => x[0] === t.style)?.[1]}</span>
            </div>
            <div className="p-3"><b className="line-clamp-1 text-sm text-navy-900">{t.title}</b><span className="text-[12px] text-muted">{t.seconds} {T("ثانية", "sec")}</span></div>
          </button>
        ))}
      </div>
      {list.length > shown && <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-outline mx-auto px-8 py-3">{T("عرض المزيد", "Show more")}</button>}
      {open && <Use t={open} signedIn={signedIn} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Use({ t, signedIn, onClose }: { t: TemplateRow; signedIn: boolean; onClose: () => void }) {
  const T = useT();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  });
  const target = `/app/tools/motion-video?tpl=${t.id}&idea=${encodeURIComponent(idea.trim().slice(0, 1200))}`;
  function go(e: React.FormEvent) { e.preventDefault(); if (idea.trim().length < 3) return; if (signedIn) router.push(target); else setAsk(true); }
  return (
    <div role="dialog" aria-modal="true" aria-label={t.title} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-sm flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {t.thumb_url && <img src={t.thumb_url} alt={t.title} className="max-h-[50vh] w-full bg-black object-contain" />}
        <form onSubmit={go} className="flex flex-col gap-2 p-4">
          <b className="text-navy-900">{t.title}</b>
          <span className="text-[12px] text-muted">{ILLUS_STYLES.find((x) => x[0] === t.style)?.[1]} · {t.seconds} {T("ثانية", "sec")}</span>
          <label htmlFor="tpl-idea" className="mt-1 text-[13px] font-bold text-navy-900">{T("اكتب فكرتك ومعلوماتك", "Write your idea and info")}</label>
          <textarea id="tpl-idea" rows={3} maxLength={1200} value={idea} onChange={(e) => { setIdea(e.target.value); setAsk(false); }} placeholder={T("مثال: مطعمي «بيت الشواء»، عرض الويكند خصم 30%", "e.g. my restaurant, weekend offer 30% off")} className="field text-sm" />
          <button disabled={idea.trim().length < 3} className="btn btn-gold py-2.5 text-[15px] font-bold disabled:opacity-50">✨ {T("استخدم هذا القالب", "Use this template")}</button>
          {ask && (
            <div role="alert" className="rounded-xl bg-gold-100 p-3 text-[13px] leading-6 text-navy-900">
              <b>{T("لازم تكون مشترك عشان ننشئ لك.", "You need to be subscribed to create it.")}</b>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="/signup" className="btn btn-primary px-4 py-2 text-[13px]">{T("اشترك الآن", "Sign up")}</a>
                <a href={`/login?next=${encodeURIComponent(target)}`} className="btn btn-outline px-4 py-2 text-[13px]">{T("عندي حساب", "I have an account")}</a>
              </div>
            </div>
          )}
          <button type="button" onClick={onClose} className="text-sm text-muted underline">{T("إغلاق", "Close")}</button>
        </form>
      </div>
    </div>
  );
}
