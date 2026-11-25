/** «وضع الصيانة»: kept as one row in site_content (key «maintenance», value {on: boolean, allow?: string[]}). «allow» = emails that still get in while it is on (a private test group). */
export const MAINTENANCE_KEY = "maintenance";
/** paths that stay open while it is on, so the admin can always sign in and switch it off */
export const MAINTENANCE_OPEN = ["/login", "/signup", "/auth", "/admin", "/maintenance"];
/** one email per line / comma / space → clean lower-case unique list (max 200) */
export function parseAllow(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(/[\s,;،]+/);
  return [...new Set(list.map((x) => x.trim().toLowerCase()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)))].slice(0, 200);
}
