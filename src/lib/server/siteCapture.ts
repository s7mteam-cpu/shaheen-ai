import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import { isPublicUrl } from "@/lib/server/safeFetch";
import { createAdminClient } from "@/lib/supabase/admin";
import { socialFromLinks, type BrandId } from "@/remotion/brandIcons";

const PRIVATE_V4 = (ip: string) => { const [a, b] = ip.split(".").map(Number); return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)); };
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return PRIVATE_V4(ip);
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    const m = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return PRIVATE_V4(m[1]);
    return x === "::" || x === "::1" || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff");
  }
  return true;
}

/** The customer's website address, checked before the video worker is asked to open it: public http(s) only, and the name must really resolve to public addresses. */
export async function checkSiteUrl(raw: string): Promise<URL | null> {
  const t = String(raw ?? "").trim().slice(0, 400);
  if (!t || (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t) && !/^[^/]*:\d+(\/|$)/.test(t))) return null;
  const u = isPublicUrl(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  if (!u || !u.hostname.includes(".")) return null;
  try {
    if (net.isIP(u.hostname)) return isPrivateIp(u.hostname) ? null : u;
    const all = await dns.lookup(u.hostname, { all: true });
    return all.length && all.every((a) => !isPrivateIp(a.address)) ? u : null;
  } catch { return null; }
}

/** What the planner and the screen may see of a captured page: plain text only (it is untrusted, so brackets and tags are removed). */
export const plain = (v: unknown, n: number) => String(v ?? "").replace(/[<>]|\[\[|\]\]/g, " ").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, n);

export type Shot = { path: string; w: number; h: number; sc: number; sections: { y: number; title: string; text: string }[] };
export type SiteData = { url: string; host: string; title: string; desc: string; siteName: string; lang: string; theme: string; text: string; social: { id: BrandId; handle: string }[]; mobile: Shot; desktop: Shot };

const shot = (x: unknown, uid: string, job: string): Shot | null => {
  const o = (x ?? {}) as Record<string, unknown>;
  const path = typeof o.path === "string" ? o.path : "";
  if (!path.startsWith(`${uid}/${job}/`) || path.includes("..") || !/^[\w-]+\/[\w-]+\/[\w.-]+$/.test(path)) return null;
  const secs = (Array.isArray(o.sections) ? o.sections : []).slice(0, 14).map((s: Record<string, unknown>) => ({ y: Math.max(0, Math.round(Number(s?.y) || 0)), title: plain(s?.title, 120), text: plain(s?.text, 260) }));
  return { path, w: Math.round(Number(o.w) || 0), h: Math.round(Number(o.h) || 0), sc: Number(o.sc) || 1, sections: secs.length ? secs : [{ y: 0, title: "", text: "" }] };
};

/** Reads the capture result saved by the worker, and checks it belongs to this customer. */
export function siteFromOutput(output: unknown, uid: string, jobId: string): SiteData | null {
  const s = ((output ?? {}) as { site?: Record<string, unknown> }).site;
  if (!s) return null;
  const mobile = shot(s.mobile, uid, jobId), desktop = shot(s.desktop, uid, jobId);
  if (!mobile || !desktop) return null;
  return { url: plain(s.url, 300), host: plain(s.host, 80).replace(/\s/g, ""), title: plain(s.title, 200), desc: plain(s.desc, 500), siteName: plain(s.siteName, 80), lang: plain(s.lang, 10), theme: plain(s.theme, 12), text: plain(s.text, 7000), social: socialFromLinks(s.links), mobile, desktop };
}

/** A finished website reading of this customer (never somebody else's). */
export async function loadSite(uid: string, jobId: unknown): Promise<SiteData | null> {
  if (typeof jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(jobId)) return null;
  const { data } = await createAdminClient().from("jobs").select("id,output,status").eq("id", jobId).eq("user_id", uid).eq("tool_id", "site-video").eq("status", "done").maybeSingle();
  return data ? siteFromOutput(data.output, uid, data.id) : null;
}
