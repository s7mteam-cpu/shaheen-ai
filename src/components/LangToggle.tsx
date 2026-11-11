"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** «EN» / «ع» — switches the whole site between Arabic and English (remembered for a year). */
export function LangToggle({ lang, className = "", light = false }: { lang: Lang; className?: string; light?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function flip() {
    const next: Lang = lang === "en" ? "ar" : "en";
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === "en" ? "ltr" : "rtl";
    start(() => router.refresh());
  }
  return (
    <button type="button" onClick={flip} disabled={pending} lang={lang === "en" ? "ar" : "en"}
      aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"} title={lang === "en" ? "العربية" : "English"}
      className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-[14px] font-bold transition ${light ? "border border-line text-navy-800 hover:bg-tint" : "text-white/85 hover:bg-white/10 hover:text-white"} disabled:opacity-50 ${className}`}>
      {lang === "en" ? "ع" : "EN"}
    </button>
  );
}
