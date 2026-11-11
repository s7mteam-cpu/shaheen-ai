"use client";
import { createContext, useContext } from "react";
import { tr, type Lang } from "@/lib/i18n";

const Ctx = createContext<Lang>("ar");

/** Set once in the root layout; every client component reads the page language from here. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
/** const T = useT();  T("عربي", "English") */
export function useT() {
  const lang = useContext(Ctx);
  return (ar: string, en: string) => tr(lang, ar, en);
}
