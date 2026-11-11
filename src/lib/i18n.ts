/** Two languages: Arabic (default, right-to-left) and English (left-to-right). The choice lives in the «lang» cookie. */
export type Lang = "ar" | "en";
export const LANG_COOKIE = "lang";
export const dirOf = (l: Lang) => (l === "en" ? "ltr" : "rtl");
export const hasArabic = (s: string) => /[؀-ۿ]/.test(s);
/** Pick the right side of a bilingual pair: tr(lang, "عربي", "English"). */
export const tr = (l: Lang, ar: string, en: string) => (l === "en" ? en : ar);
