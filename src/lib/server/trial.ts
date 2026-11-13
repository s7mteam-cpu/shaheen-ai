import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { DISPOSABLE_LIST } from "@/lib/server/disposableList";

/**
 * «التجربة المجانية»: free credits once per person, for a limited time (set by the owner in «الباقات»).
 * One trial per account, per e-mail, per WhatsApp number and per device, and only a few per IP a day.
 * Claims outlive deleted accounts, so deleting and signing up again never gives a second trial.
 * When the time is up, whatever is left of the trial credits is removed (unless the customer subscribed:
 * a subscription resets the credits to the plan's anyway).
 */
export type TrialSettings = { enabled: boolean; credits: number; hours: number; per_ip_day: number; max_per_day: number };
export const TRIAL_DEFAULTS: TrialSettings = { enabled: true, credits: 30, hours: 24, per_ip_day: 2, max_per_day: 30 };
export const DEVICE_COOKIE = "sh_dev";

export async function trialSettings(): Promise<TrialSettings> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "trial").maybeSingle();
  const v = { ...TRIAL_DEFAULTS, ...((data?.value as Partial<TrialSettings>) ?? {}) };
  return { enabled: !!v.enabled, credits: Math.max(1, Math.min(1000, Math.round(+v.credits || 30))), hours: Math.max(1, Math.min(720, Math.round(+v.hours || 24))), per_ip_day: Math.max(1, Math.min(50, Math.round(+v.per_ip_day || 2))), max_per_day: Math.max(1, Math.min(10000, Math.round(+v.max_per_day || 30))) };
}

/** Temporary-inbox services (people use them to make many accounts): 61k+ known domains, plus their mail servers. */
let disposableSet: Set<string> | null = null;
function disposableDomains() {
  if (!disposableSet) disposableSet = new Set(DISPOSABLE_LIST.split("\n"));
  return disposableSet;
}
/** «a.b.example.com» → is example.com / b.example.com / a.b.example.com on the list? */
function listed(host: string) {
  const parts = host.toLowerCase().replace(/\.$/, "").split(".");
  for (let i = 0; i < parts.length - 1; i++) if (disposableDomains().has(parts.slice(i).join("."))) return true;
  return false;
}
/** Mail hosts used by temp-inbox services under many rotating domain names. */
const TEMP_MX = /(^|\.)(mail\.tm|mail\.gw|1secmail|guerrillamail|mailinator|yopmail|temp-mail|tempmail|10minutemail|dropmail|emailfake|generator\.email|moakt|maildrop|mohmal|tmail|getnada|inboxkitten|mailnesia|trashmail|dispostable|spamgourmet|harakirimail|burnermail|tempm|emailnax|mailcatch|minuteinbox|throwawaymail|fakeinbox|tempr\.email|discard\.email)/i;

export async function isDisposable(email: string) {
  const domain = (email.split("@")[1] ?? "").toLowerCase().trim();
  if (!domain) return true;
  if (listed(domain)) return true;
  try {
    const { resolveMx } = await import("node:dns/promises");
    const mx = await Promise.race([resolveMx(domain), new Promise<never>((_, no) => setTimeout(() => no(new Error("timeout")), 3000))]);
    return mx.some((m) => listed(m.exchange) || TEMP_MX.test(m.exchange));
  } catch { return false; }   // DNS trouble never blocks a real customer
}
/** The same inbox written differently (Gmail ignores dots and anything after +). */
export function canonicalEmail(email: string) {
  const [user0, domain0] = email.trim().toLowerCase().split("@");
  if (!domain0) return email.trim().toLowerCase();
  const domain = domain0 === "googlemail.com" ? "gmail.com" : domain0;
  let user = user0.split("+")[0];
  if (domain === "gmail.com") user = user.replace(/\./g, "");
  return `${user}@${domain}`;
}

/** What the dashboard shows: «جرّب مجاناً», the running trial, or nothing. */
export async function trialStatus(userId: string, devices: string[] = []): Promise<{ state: "offer" | "active" | "none"; credits?: number; hours?: number; expiresAt?: string }> {
  const s = await trialSettings();
  const admin = createAdminClient();
  const { data: claim } = await admin.from("trial_claims").select("credits,expires_at,ended_at").eq("user_id", userId).maybeSingle();
  if (claim) return !claim.ended_at && new Date(claim.expires_at).getTime() > Date.now() ? { state: "active", credits: claim.credits, expiresAt: claim.expires_at } : { state: "none" };
  if (!s.enabled) return { state: "none" };
  const { count } = await admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count) return { state: "none" };   // trials are for new customers only
  if (await declined(userId)) return { state: "none" };   // skipped it on the welcome screen → gone for good
  if (await usedBefore(userId, devices)) return { state: "none" };   // same e-mail / number / device had (or skipped) a trial on an old account
  if ((await claimsToday()) >= s.max_per_day) return { state: "none" };   // today's gifts are given out → the card hides until midnight
  return { state: "offer", credits: s.credits, hours: s.hours };
}

/** Midnight in Kuwait (UTC+3), today. «باليوم» for the trial means this calendar day. */
export function kuwaitDayStart(now = Date.now()) {
  const k = new Date(now + 3 * 3_600_000);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - 3 * 3_600_000);
}
/** How many free trials were given today (Kuwait time). */
export async function claimsToday() {
  const { count } = await createAdminClient().from("trial_claims").select("id", { count: "exact", head: true }).gte("created_at", kuwaitDayStart().toISOString());
  return count ?? 0;
}

/** The person's canonical e-mail and WhatsApp number (the same keys the trial records use). */
async function identity(userId: string) {
  const { data: p } = await createAdminClient().from("profiles").select("email,phone,country").eq("id", userId).maybeSingle();
  return { email: p?.email ? canonicalEmail(p.email) : "", phone: normalizePhone(p?.phone ?? "", p?.country ?? undefined) || "" };
}

/**
 * Has this person already had a trial, or skipped one, under any account (deleted ones included)?
 * Matched by e-mail, WhatsApp number and device. (Before the v85 SQL runs, skips on deleted accounts aren't known yet.)
 */
export async function usedBefore(userId: string, devices: string[] = []) {
  const admin = createAdminClient();
  const { email, phone } = await identity(userId);
  const devs = devices.filter(Boolean).slice(0, 4);
  const any = async (table: "trial_claims" | "trial_declines", withUser: boolean) => {
    const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;   // quoted, so dots / + / commas in an e-mail can't break the filter
    const ors = [email && `email.eq.${q(email)}`, phone && `phone.eq.${q(phone)}`, ...devs.map((d) => `device.eq.${q(d)}`), withUser && `user_id.eq.${userId}`].filter(Boolean) as string[];
    if (!ors.length) return false;
    const { data, error } = await admin.from(table).select("id").or(ors.join(",")).limit(1);
    return !error && (data?.length ?? 0) > 0;
  };
  return (await any("trial_claims", false)) || (await any("trial_declines", true));
}

/** «تخطي التجربة المجانية»: remembered on the account and by e-mail / number / device, so it outlives a deleted account. */
export async function declineTrial(userId: string, devices: string[] = []) {
  const admin = createAdminClient();
  await admin.from("profiles").update({ trial_declined_at: new Date().toISOString() }).eq("id", userId).is("trial_declined_at", null);
  const { email, phone } = await identity(userId);
  const { data: had } = await admin.from("trial_declines").select("id").eq("user_id", userId).limit(1);
  if (!had?.length) await admin.from("trial_declines").insert({ user_id: userId, email: email || null, phone: phone || null, device: devices.find(Boolean) ?? null });
}

/** Did the customer press «تخطي التجربة المجانية»? (Before the v84 SQL runs the column is missing → no.) */
export async function declined(userId: string) {
  const { data, error } = await createAdminClient().from("profiles").select("trial_declined_at").eq("id", userId).maybeSingle();
  return !error && !!data?.trial_declined_at;
}

/** Gives the trial after every check. Returns an Arabic reason when it can't. */
export async function claimTrial(userId: string, ip: string | null, devices: string[], human = true): Promise<{ ok?: { credits: number; hours: number }; error?: string }> {
  const s = await trialSettings();
  if (!s.enabled) return { error: "التجربة المجانية متوقفة حالياً." };
  if (!human) return { error: "ما قدرنا نتأكد إنك إنسان. حدّث الصفحة وجرّب مرة ثانية." };
  const admin = createAdminClient();
  // the safety net against bots: never more than the owner's daily maximum, whatever happens
  const today = await claimsToday();
  if (today >= s.max_per_day) return { error: "التجارب المجانية لليوم خلصت. جرّب بكرة، أو اشترك وابدأ الحين." };
  const [{ data: profile }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("id,email,phone,country,role").eq("id", userId).single(),
    admin.auth.admin.getUserById(userId),
  ]);
  if (!profile || profile.role !== "user") return { error: "التجربة للعملاء بس." };
  if (await declined(userId)) return { error: "تخطّيت التجربة المجانية، فما عادت متاحة. تقدر تشترك وتكمّل بلا حدود." };
  if (await usedBefore(userId, devices)) return { error: "هالإيميل أو رقم الواتساب أو الجهاز أخذ (أو تخطّى) التجربة المجانية من قبل. التجربة لمرة وحدة لكل شخص." };
  if (!auth?.user?.email_confirmed_at) return { error: "أكّد بريدك الإلكتروني أول (من الرسالة اللي وصلتك)، وبعدها جرّب." };
  const email = canonicalEmail(profile.email ?? auth.user.email ?? "");
  if (await isDisposable(email)) return { error: "التجربة المجانية ما تنعطى للإيميلات المؤقتة. سجّل بإيميلك الحقيقي." };
  const phone = normalizePhone(profile.phone ?? "", profile.country ?? undefined);
  if (!phone) return { error: "أضف رقم الواتساب بحسابك أول (من «حسابي» ← «بياناتي»)، وبعدها جرّب." };
  const { count: subs } = await admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (subs) return { error: "التجربة المجانية للعملاء الجدد بس." };

  const used = (q: { data: unknown[] | null }) => (q.data?.length ?? 0) > 0;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [byUser, byEmail, byPhone, byDevice, byIp] = await Promise.all([
    admin.from("trial_claims").select("id").eq("user_id", userId).limit(1),
    admin.from("trial_claims").select("id").eq("email", email).limit(1),
    admin.from("trial_claims").select("id").eq("phone", phone).limit(1),
    admin.from("trial_claims").select("id").in("device", devices.length ? devices : ["-"]).limit(1),
    ip ? admin.from("trial_claims").select("id").eq("ip", ip).gte("created_at", since).limit(s.per_ip_day) : Promise.resolve({ data: [] as unknown[] }),
  ]);
  if (used(byUser)) return { error: "أخذت تجربتك المجانية من قبل." };
  if (used(byEmail) || used(byPhone) || used(byDevice)) return { error: "هالإيميل أو رقم الواتساب أو الجهاز أخذ تجربة مجانية من قبل. التجربة لمرة وحدة لكل شخص." };
  if ((byIp.data?.length ?? 0) >= s.per_ip_day) return { error: "انعطت تجارب كثيرة من نفس الشبكة اليوم. جرّب بكرة أو اشترك مباشرة." };

  const expires = new Date(Date.now() + s.hours * 3_600_000).toISOString();
  const { data: claim, error } = await admin.from("trial_claims")
    .insert({ user_id: userId, email, phone, device: devices[0] ?? null, ip, credits: s.credits, expires_at: expires }).select("id").single();
  if (error || !claim) return { error: "هالرقم أو الحساب أخذ تجربة من قبل." };   // the unique indexes catch two tabs at once
  await admin.rpc("grant_credits", { p_user: userId, p_amount: s.credits, p_reason: "trial", p_ref: `trial:${claim.id}` });
  if (today + 1 >= s.max_per_day) await alertCapReached(s.max_per_day);   // that was the last gift of the day → the card hides till midnight
  return { ok: { credits: s.credits, hours: s.hours } };
}

/** Ends trials whose time is up (the database function also runs before every credit spend). */
export async function endExpiredTrials(userId?: string) {
  const admin = createAdminClient();
  if (userId) { await admin.rpc("end_expired_trial", { p_user: userId }); return; }
  const { data } = await admin.from("trial_claims").select("user_id").is("ended_at", null).lt("expires_at", new Date().toISOString()).not("user_id", "is", null).limit(1000);
  for (const u of new Set((data ?? []).map((c) => c.user_id as string))) await admin.rpc("end_expired_trial", { p_user: u });
}

/** Tells the admins (once a day) that today's gifts are all given — a busy day, or a sign of a bot attack. */
async function alertCapReached(max: number) {
  const admin = createAdminClient();
  const key = `trial-cap:${new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10)}`;   // once per Kuwait day
  const { data: seen } = await admin.from("notifications").select("id").eq("link", "/admin/plans").eq("body", key).limit(1);
  if (seen?.length) return;
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) await admin.from("notifications").insert(admins.map((a) => ({ user_id: a.id, kind: "payment", title: `🎁 انعطت كل هدايا اليوم (${max}). البطاقة اختفت لحالها وترجع الساعة 12 بالليل (بتوقيت الكويت)`, body: key, link: "/admin/plans" }))).then(() => null, () => null);
}

/** Cloudflare Turnstile («هل أنت إنسان؟»). Off until the owner adds the two keys in Vercel. */
export const turnstileOn = () => !!(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
export async function isHuman(token: string, ip: string | null) {
  if (!turnstileOn()) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, ...(ip ? { remoteip: ip } : {}) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch { return false; }
}
