import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

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

/** Temporary-inbox services (people use them to make many accounts). */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com", "10minutemail.net", "temp-mail.org",
  "tempmail.com", "tempmail.net", "temp-mail.io", "tempail.com", "yopmail.com", "yopmail.net", "trashmail.com", "getnada.com", "nada.email",
  "dispostable.com", "maildrop.cc", "fakeinbox.com", "moakt.com", "moakt.cc", "emailondeck.com", "throwawaymail.com", "mohmal.com", "mohmal.in",
  "minuteinbox.com", "mail.tm", "inboxkitten.com", "tempinbox.com", "mintemail.com", "spamgourmet.com", "mytemp.email", "tmpmail.org",
  "tmail.ws", "byom.de", "discard.email", "mailnesia.com", "burnermail.io", "33mail.com", "emailfake.com", "generator.email", "1secmail.com",
]);
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
export async function trialStatus(userId: string): Promise<{ state: "offer" | "active" | "none"; credits?: number; hours?: number; expiresAt?: string }> {
  const s = await trialSettings();
  const admin = createAdminClient();
  const { data: claim } = await admin.from("trial_claims").select("credits,expires_at,ended_at").eq("user_id", userId).maybeSingle();
  if (claim) return !claim.ended_at && new Date(claim.expires_at).getTime() > Date.now() ? { state: "active", credits: claim.credits, expiresAt: claim.expires_at } : { state: "none" };
  if (!s.enabled) return { state: "none" };
  const { count } = await admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (count) return { state: "none" };   // trials are for new customers only
  return { state: "offer", credits: s.credits, hours: s.hours };
}

/** Gives the trial after every check. Returns an Arabic reason when it can't. */
export async function claimTrial(userId: string, ip: string | null, devices: string[], human = true): Promise<{ ok?: { credits: number; hours: number }; error?: string }> {
  const s = await trialSettings();
  if (!s.enabled) return { error: "التجربة المجانية متوقفة حالياً." };
  if (!human) return { error: "ما قدرنا نتأكد إنك إنسان. حدّث الصفحة وجرّب مرة ثانية." };
  const admin = createAdminClient();
  // the safety net against bots: never more than the owner's daily maximum, whatever happens
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count: today } = await admin.from("trial_claims").select("id", { count: "exact", head: true }).gte("created_at", dayAgo);
  if ((today ?? 0) >= s.max_per_day) { await alertCapReached(s.max_per_day); return { error: "التجارب المجانية لليوم خلصت. جرّب بكرة، أو اشترك وابدأ الحين." }; }
  const [{ data: profile }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("id,email,phone,country,role").eq("id", userId).single(),
    admin.auth.admin.getUserById(userId),
  ]);
  if (!profile || profile.role !== "user") return { error: "التجربة للعملاء بس." };
  if (!auth?.user?.email_confirmed_at) return { error: "أكّد بريدك الإلكتروني أول (من الرسالة اللي وصلتك)، وبعدها جرّب." };
  const email = canonicalEmail(profile.email ?? auth.user.email ?? "");
  if (DISPOSABLE.has(email.split("@")[1] ?? "")) return { error: "التجربة المجانية ما تنعطى للإيميلات المؤقتة. سجّل بإيميلك الحقيقي." };
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
  return { ok: { credits: s.credits, hours: s.hours } };
}

/** Ends trials whose time is up (the database function also runs before every credit spend). */
export async function endExpiredTrials(userId?: string) {
  const admin = createAdminClient();
  if (userId) { await admin.rpc("end_expired_trial", { p_user: userId }); return; }
  const { data } = await admin.from("trial_claims").select("user_id").is("ended_at", null).lt("expires_at", new Date().toISOString()).not("user_id", "is", null).limit(1000);
  for (const u of new Set((data ?? []).map((c) => c.user_id as string))) await admin.rpc("end_expired_trial", { p_user: u });
}

/** Tells the admins (once a day) that the daily trial maximum was reached — a sign of a bot attack or of a busy day. */
async function alertCapReached(max: number) {
  const admin = createAdminClient();
  const key = `trial-cap:${new Date().toISOString().slice(0, 10)}`;
  const { data: seen } = await admin.from("notifications").select("id").eq("link", "/admin/plans").eq("body", key).limit(1);
  if (seen?.length) return;
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) await admin.from("notifications").insert(admins.map((a) => ({ user_id: a.id, kind: "payment", title: `🛑 وصلت التجارب المجانية للحد اليومي (${max})`, body: key, link: "/admin/plans" }))).then(() => null, () => null);
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
