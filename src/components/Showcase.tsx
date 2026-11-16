"use client";
import { useEffect, useState } from "react";
import { useT } from "@/components/LangProvider";
import { SHOWCASE_CATS, isVideo, type ShowcaseItem } from "@/lib/showcase";

const media = (g: ShowcaseItem) => [g.media_url, ...g.extra_media];

/** «معرض شاهين»: cards + a full-screen viewer (carousels swipe, reels play with sound). */
export function ShowcaseGrid({ items, filter = false }: { items: ShowcaseItem[]; filter?: boolean }) {
  const T = useT();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<ShowcaseItem | null>(null);
  const label = (k: string) => { const c = SHOWCASE_CATS.find((x) => x[0] === k); return c ? T(c[1], c[2]) : k; };
  const cats = SHOWCASE_CATS.filter(([k]) => items.some((g) => g.category === k));
  const shown = cat === "all" ? items : items.filter((g) => g.category === cat);
  const chip = (on: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink hover:border-navy-700"}`;

  return (
    <div className="flex flex-col gap-5">
      {filter && cats.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
          <button role="tab" aria-selected={cat === "all"} onClick={() => setCat("all")} className={chip(cat === "all")}>{T("الكل", "All")} <span className="opacity-60">{items.length}</span></button>
          {cats.map(([k]) => (
            <button key={k} role="tab" aria-selected={cat === k} onClick={() => setCat(k)} className={chip(cat === k)}>{label(k)} <span className="opacity-60">{items.filter((g) => g.category === k).length}</span></button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((g) => {
          const n = media(g).length;
          const vid = g.media_type === "video";
          return (
            <button key={g.id} onClick={() => setOpen(g)} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-tint">
                {vid
                  ? <video src={g.media_url} className="h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={g.media_url} alt={g.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
                <span className="absolute start-2 top-2 rounded-full bg-navy-900/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{label(g.category)}</span>
                {n > 1 && <span className="absolute end-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-navy-900">▣ {n}</span>}
                {vid && <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-lg text-navy-900 opacity-90 transition group-hover:scale-110">▶</span>}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <b className="line-clamp-1 text-sm text-navy-900">{g.title}</b>
                {g.description && <span className="line-clamp-2 text-[12px] leading-5 text-muted">{g.description}</span>}
              </div>
            </button>
          );
        })}
      </div>
      {shown.length === 0 && <p className="card p-8 text-center text-muted">{T("ما في أعمال بهالقسم بعد.", "Nothing in this section yet.")}</p>}
      {open && <Viewer g={open} label={label(open.category)} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Viewer({ g, label, onClose }: { g: ShowcaseItem; label: string; onClose: () => void }) {
  const T = useT();
  const list = media(g);
  const [i, setI] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  const go = (d: number) => setI((v) => (v + d + list.length) % list.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") go(1); if (e.key === "ArrowRight") go(-1); };
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = o; };
  });
  const u = list[i];
  const vid = i === 0 ? g.media_type === "video" : isVideo(u);
  return (
    <div role="dialog" aria-modal="true" aria-label={g.title} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex items-center justify-center bg-black"
          onTouchStart={(e) => setX0(e.touches[0].clientX)}
          onTouchEnd={(e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); setX0(null); }}>
          {vid
            ? <video key={u} src={u} className="max-h-[70vh] w-full object-contain" controls autoPlay playsInline />
            // eslint-disable-next-line @next/next/no-img-element
            : <img key={u} src={u} alt={g.title} className="max-h-[70vh] w-full object-contain" />}
          {list.length > 1 && (<>
            <button aria-label={T("السابق", "Previous")} onClick={() => go(-1)} className="absolute start-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/85 text-xl font-bold text-navy-900">‹</button>
            <button aria-label={T("التالي", "Next")} onClick={() => go(1)} className="absolute end-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white/85 text-xl font-bold text-navy-900">›</button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" dir="ltr">
              {list.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />)}
            </div>
          </>)}
          <button aria-label={T("إغلاق", "Close")} onClick={onClose} className="absolute end-2 top-2 h-9 w-9 rounded-full bg-white/90 text-lg font-bold text-navy-900">×</button>
        </div>
        <div className="flex flex-col gap-1.5 p-4">
          <span className="w-fit rounded-full bg-gold-100 px-2.5 py-0.5 text-[12px] font-bold text-navy-900">{label}{list.length > 1 ? ` · ${i + 1}/${list.length}` : ""}</span>
          <b className="text-navy-900">{g.title}</b>
          {g.description && <p className="text-sm leading-6 text-muted">{g.description}</p>}
        </div>
      </div>
    </div>
  );
}
