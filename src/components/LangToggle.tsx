"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** «EN» / «ع» — switches the whole site between Arabic and English (remembered for a year). */
export function LangToggle({ lang, className = "", light = false, full = false }: { lang: Lang; className?: string; light?: boolean; full?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function flip() {
    const next: Lang = lang === "en" ? "ar" : "en";
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "en" ? "ltr" : "rtl";
    start(() => router.refresh());
  }
  if (full) return (
    <button type="button" onClick={flip} disabled={pending} lang={lang === "en" ? "ar" : "en"}
      aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-white/[0.06] px-3 text-[14px] font-semibold text-white transition hover:bg-white/10 disabled:opacity-50 ${className}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="opacity-80"><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5Z" /></svg>
      {lang === "en" ? "عربي" : "English"}
    </button>
  );
  return (
    <button type="button" onClick={flip} disabled={pending} lang={lang === "en" ? "ar" : "en"}
      aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"} title={lang === "en" ? "العربية" : "English"}
      className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-[13px] font-bold sm:h-10 sm:min-w-10 sm:px-2 sm:text-[14px] transition ${light ? "border border-line text-navy-800 hover:bg-tint" : "text-white/85 hover:bg-white/10 hover:text-white"} disabled:opacity-50 ${className}`}>
      {lang === "en" ? "ع" : "EN"}
    </button>
  );
}
