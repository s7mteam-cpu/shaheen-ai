import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, langFor, type Lang } from "@/lib/i18n";
import { EN } from "@/lib/i18n/en";

/** The page language: the visitor's choice (cookie), except on Arabic-only pages (the admin panel). */
export const getLang = cache(async (): Promise<Lang> => {
  const chosen: Lang = (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
  const lang = langFor(chosen, (await headers()).get("x-path") ?? "/");
  return lang;
});

/** The visitor's choice regardless of page (for the toggle button itself). */
export const getChosenLang = cache(async (): Promise<Lang> => ((await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "ar"));

/** const T = await serverT();  T("عربي", "English") — for server components and server actions. */
export async function serverT() {
  const lang = await getLang();
  return (ar: string, en: string) => (lang === "en" ? en : ar);
}

/** const L = await getL();  L("نص عربي") → English from the dictionary when the page is in English. For server components. */
export async function getL() {
  const lang = await getLang();
  return (s: string) => (lang === "en" ? EN[s] ?? EN[s.trim()] ?? s : s);
}
