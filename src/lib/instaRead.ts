/** «حلّل حسابي»: the platform's own Instagram session (admin_secrets key "insta_session"). Only the admin sets it; a customer never sees or touches it. */
export type InstaSession = { on: boolean; sessionid: string; bad?: boolean; badAt?: string; at?: string };
export const INSTA_DAILY_CAP = 20; // visits per day for the whole platform
export const INSTA_USER_CAP = 3;   // visits per day for one customer

/** "@name", "name" or a profile link → the user name (letters, digits, dot, underscore), or "" */
export function instaHandle(raw: unknown): string {
  let s = String(raw ?? "").trim();
  const m = /instagram\.com\/([A-Za-z0-9._]{1,30})/i.exec(s);
  if (m) s = m[1]; else s = s.replace(/^@/, "").split(/[/?#\s]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(s) && !/^(p|reel|reels|explore|stories|accounts|direct)$/i.test(s) ? s : "";
}
export function cleanInstaSession(v: unknown): InstaSession {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const sid = typeof o.sessionid === "string" && /^[A-Za-z0-9%._:-]{20,300}$/.test(o.sessionid) ? o.sessionid : "";
  return { on: o.on === true && !!sid, sessionid: sid, ...(o.bad === true ? { bad: true } : {}), ...(typeof o.badAt === "string" ? { badAt: o.badAt.slice(0, 30) } : {}), ...(typeof o.at === "string" ? { at: o.at.slice(0, 30) } : {}) };
}
