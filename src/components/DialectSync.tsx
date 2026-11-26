"use client";
import { DIALECT_COOKIE } from "@/lib/countries";

/** Keeps the browser's dialect cookie in step with the dialect chosen in «هويتي» (empty = none chosen: Standard Arabic). Written during render so the tools on the page read it. */
export function DialectSync({ id }: { id: string }) {
  if (typeof document !== "undefined" && /^[a-z]{0,12}$/.test(id)) {
    const m = document.cookie.match(new RegExp(`(?:^|; )${DIALECT_COOKIE}=([a-z]*)`));
    if ((m?.[1] ?? "") !== id) document.cookie = id ? `${DIALECT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax` : `${DIALECT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
  return null;
}
