import { EN } from "./en";
import type { Lang } from "@/lib/i18n";

/**
 * L("نص عربي") → its English version when the page is in English (from the EN dictionary), otherwise the same text.
 * LT("عربي ${x}", "English ${x}") → for sentences with values inside.
 * The current language is set by <LangProvider> on every render (and by the server helpers for server components).
 */
let current: Lang = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "ar";
export const setUiLang = (l: Lang) => { current = l; };
export const uiLang = () => current;
export function L(s: string): string {
  if (current !== "en" || !s) return s;
  return EN[s] ?? EN[s.trim()] ?? s;
}
export const LT = (ar: string, en: string) => (current === "en" ? en : ar);
