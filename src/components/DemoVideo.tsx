"use client";
import { useEffect, useState } from "react";
import { isShorts, youtubeId } from "@/lib/video";
import { useT } from "@/components/LangProvider";

/**
 * «▶ شاهد مثال»: opens the tool's demo video in a window over the page (YouTube or an uploaded clip).
 * variant "thumb" = the 9:16 picture on a tool card; variant "button" = a small button (inside the app).
 */
export function DemoVideo({ url, thumb, title, variant = "thumb", label, className }: { url: string; thumb?: string | null; title: string; variant?: "thumb" | "button"; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const T = useT();
  const yt = youtubeId(url);
  const tall = !yt || isShorts(url);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {variant === "thumb" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label={`${T("شاهد مثال", "Watch example")}: ${title}`}
          className="group relative aspect-[9/16] w-[86px] shrink-0 overflow-hidden rounded-xl bg-navy-800 ring-1 ring-line sm:w-[96px]">
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
            : <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#16406B,#0A1E36)]" />}
          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="ms-0.5"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-1.5 pt-4 text-center text-[11px] font-semibold text-white">{T("شاهد مثال", "Watch")}</span>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={className ?? "btn btn-outline gap-2 px-4 py-2 text-[14px]"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>{label ?? T("شرح الأداة", "How it works")}
        </button>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className={`relative w-full ${tall ? "max-w-[min(420px,calc((100svh-6rem)*9/16))]" : "max-w-4xl"}`}>
            <button type="button" onClick={() => setOpen(false)} aria-label={T("إغلاق", "Close")}
              className="absolute -top-11 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white hover:bg-white/25">×</button>
            <div className={`overflow-hidden rounded-2xl bg-black shadow-2xl ${tall ? "aspect-[9/16]" : "aspect-video"}`}>
              {yt ? (
                <iframe src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1&modestbranding=1`} title={title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="h-full w-full border-0" />
              ) : (
                <video src={url} controls autoPlay playsInline className="h-full w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
