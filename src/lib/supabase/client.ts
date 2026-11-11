import { createBrowserClient } from "@supabase/ssr";
import { REMEMBER_COOKIE, sessionOnly, wantsRemember } from "./remember";

function readCookies() {
  if (typeof document === "undefined") return [];
  return document.cookie.split(/;\s*/).filter(Boolean).map((pair) => {
    const i = pair.indexOf("=");
    const name = i < 0 ? pair : pair.slice(0, i);
    const raw = i < 0 ? "" : pair.slice(i + 1);
    let value = raw;
    try { value = decodeURIComponent(raw); } catch { /* keep raw */ }
    return { name, value };
  });
}

type CookieOpts = { path?: string; domain?: string; maxAge?: number; expires?: Date; sameSite?: string | boolean; secure?: boolean };

function writeCookie(name: string, value: string, o: CookieOpts = {}) {
  let s = `${name}=${encodeURIComponent(value)}; Path=${o.path || "/"}`;
  if (o.domain) s += `; Domain=${o.domain}`;
  if (o.maxAge !== undefined) s += `; Max-Age=${Math.floor(o.maxAge)}`;
  if (o.expires) s += `; Expires=${o.expires.toUTCString()}`;
  if (o.sameSite) s += `; SameSite=${o.sameSite === true ? "Strict" : o.sameSite}`;
  if (o.secure) s += "; Secure";
  document.cookie = s;
}

/** Remember-me choice, written before signing in. */
export function setRemember(remember: boolean) {
  if (remember) writeCookie(REMEMBER_COOKIE, "", { maxAge: 0, sameSite: "lax" });
  else writeCookie(REMEMBER_COOKIE, "0", { sameSite: "lax", secure: location.protocol === "https:" });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(),
        setAll: (list) => {
          const remember = wantsRemember(readCookies().find((c) => c.name === REMEMBER_COOKIE)?.value);
          list.forEach(({ name, value, options }) => writeCookie(name, value, sessionOnly(options as CookieOpts, remember)));
        },
      },
    },
  );
}
