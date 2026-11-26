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
  return EN[s] ?? EN[s.trim()] ?? stageEn(s);
}
/** The worker's progress texts that carry numbers («يرسم الصور (3)…») can't be listed one by one. */
function stageEn(s: string): string {
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^يبني التصميم \(Gemini\) · محاولة (\d+)…$/))) return `Building the design (Gemini) · attempt ${m[1]}…`;
  if ((m = s.match(/^يجهّز المقاطع \((\d+) من (\d+)\)…$/))) return `Preparing the clips (${m[1]} of ${m[2]})…`;
  if ((m = s.match(/^يرسم الصور \((\d+)\)…$/))) return `Drawing the images (${m[1]})…`;
  if ((m = s.match(/^يركّب الغرافيكس فوق الفيديو \((\d+) من (\d+)\)…$/))) return `Adding the graphics over the video (${m[1]} of ${m[2]})…`;
  if ((m = s.match(/^يصلّح ملاحظات المراجعة \(مقطع (\d+)\)…$/))) return `Fixing the review notes (clip ${m[1]})…`;
  if ((m = s.match(/^يصمّم الغرافيكس \((\d+) من (\d+)\)…$/))) return `Designing the graphics (${m[1]} of ${m[2]})…`;
  return s;
}
export const LT = (ar: string, en: string) => (current === "en" ? en : ar);
