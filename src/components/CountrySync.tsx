"use client";
import { COUNTRY_COOKIE } from "@/lib/countries";

/**
 * Keeps the browser's country cookie in step with the customer's account (so the tools pick their dialect first).
 * Written during render (not in an effect) so it's ready before the tools on the page read it.
 */
export function CountrySync({ code }: { code: string }) {
  if (typeof document !== "undefined" && /^[A-Z]{2}$/.test(code)) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([A-Z]{2})`));
    if (m?.[1] !== code) document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }
  return null;
}
