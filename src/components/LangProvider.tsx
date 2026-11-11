"use client";
import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";
import { langFor, tr, type Lang } from "@/lib/i18n";
import { setUiLang } from "@/lib/i18n/ui";

const Ctx = createContext<Lang>("ar");

/** Root of the page language: the visitor's choice (cookie) applied to the current page. Keeps <html lang/dir> in sync while navigating. */
export function LangProvider({ chosen, children }: { chosen: Lang; children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  const lang = langFor(chosen, path);
  setUiLang(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
/** const T = useT();  T("عربي", "English") */
export function useT() {
  const lang = useContext(Ctx);
  return (ar: string, en: string) => tr(lang, ar, en);
}
