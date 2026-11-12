import "server-only";

/**
 * Fetches a customer-given web address safely (SSRF guard): only public http(s) sites —
 * never localhost, private networks, cloud metadata addresses or raw internal IPs — and every redirect is checked too.
 */
const PRIVATE_V4 = [/^10\./, /^127\./, /^0\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];
export function isPublicUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h === "metadata.google.internal") return null;
  if (/^[\d.]+$/.test(h) && PRIVATE_V4.some((r) => r.test(h))) return null;
  if (h.includes(":")) return null; // raw IPv6 addresses: not needed for customer sites
  if (u.port && !["80", "443"].includes(u.port)) return null;
  return u;
}

export async function safeFetch(raw: string, init: RequestInit & { timeoutMs?: number } = {}, hops = 3): Promise<Response | null> {
  let url = isPublicUrl(raw);
  for (let i = 0; url && i <= hops; i++) {
    const r = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(init.timeoutMs ?? 6000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = isPublicUrl(new URL(r.headers.get("location")!, url).toString()); continue; }
    return r;
  }
  return null;
}
