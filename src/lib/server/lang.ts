import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** Pages that already have an English version. Others stay Arabic (right-to-left) until they're translated. */
const TRANSLATED = [/^\/$/, /^\/(terms|privacy|refund)$/, /^\/(login|signup|forgot-password|reset-password)$/, /^\/app\/(account|subscribe|pay)$/];

/** The visitor's choice (cookie), but only on pages that are translated. */
export const getLang = cache(async (): Promise<Lang> => {
  if ((await cookies()).get(LANG_COOKIE)?.value !== "en") return "ar";
  const path = (await headers()).get("x-path") ?? "/";
  return TRANSLATED.some((r) => r.test(path)) ? "en" : "ar";
});

/** The visitor's choice regardless of page (for the toggle button itself). */
export const getChosenLang = cache(async (): Promise<Lang> => ((await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "ar"));

/** const T = await serverT();  T("عربي", "English") — for server components and server actions. */
export async function serverT() {
  const lang = await getLang();
  return (ar: string, en: string) => (lang === "en" ? en : ar);
}
