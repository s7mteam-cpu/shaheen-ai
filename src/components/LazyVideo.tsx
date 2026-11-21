"use client";
import { useEffect, useRef } from "react";

/** A silent looping preview that only downloads and plays while it is on screen (and never on "data saver"),
 *  so a page full of clips does not pull every video for every visitor. */
export function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const saver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (saver || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    }, { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} src={src} className={className} muted loop playsInline preload="none" />;
}
