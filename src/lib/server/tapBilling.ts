import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/server/payments";
import { createCharge, getCharge, methodOf, tapPhone, tokenFromSavedCard, type TapCharge } from "@/lib/tap";
import { getContent } from "@/lib/data";

/**
 * Shaheen billing on Tap:
 *  - Card / Apple Pay: the card is saved (by Tap, never by us) and charged automatically every month.
 *  - KNET: KNET can't be charged automatically, so 3 days before the month ends the customer gets a payment link.
 *  - If a month isn't paid, there are 3 days of grace, then the plan stops (account and works stay).
 * Every captured payment renews the credits, lands in «المالية» and rings the admin's bell.
 */
export type Kind = "subscribe" | "renew" | "managed";
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const subId = (userId: string) => `tap_${userId}`;
const GRACE_DAYS = 3;
const REMIND_DAYS = 3;
const MAX_CARD_TRIES = 3;
const DAY = 86_400_000;
const FINAL_FAIL = ["DECLINED", "FAILED", "CANCELLED", "ABANDONED", "VOID", "RESTRICTED", "TIMEDOUT", "UNKNOWN"];
const METHOD_AR: Record<string, string> = { KNET: "كي نت", APPLE_PAY: "Apple Pay", CARD: "بطاقة" };

const addMonth = (d: Date) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; };

async function notify(userId: string, title: string, body: string, link: string) {
  await createAdminClient().from("notifications").insert({ user_id: userId, kind: "payment", title, body, link }).then(() => null, () => null);
}

/** Starts a payment and returns the Tap page to send the customer to. */
export async function startTapPayment(userId: string, kind: Kind, wantedPlan?: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,phone").eq("id", userId).single(),
    admin.from("subscriptions").select("*").eq("id", subId(userId)).maybeSingle(),
  ]);
  if (!profile) throw new Error("no profile");

  let amount: number, planId: string | null = null, description: string;
  if (kind === "managed") {
    const c = await getContent();
    amount = Number(c.managed_service?.price_kwd || 0);
    description = c.managed_service?.title || "باقة الإدارة الكاملة";
  } else {
    planId = kind === "renew" ? (sub?.next_plan_id || sub?.plan_id || wantedPlan || null) : (wantedPlan || null);
    const { data: plan } = await admin.from("plans").select("id,name,price_kwd").eq("id", planId ?? "").eq("is_active", true).maybeSingle();
    if (!plan) throw new Error("plan");
    amount = Number(plan.price_kwd);
    description = `اشتراك ${plan.name}`;
  }
  if (!(amount >= 0.1)) throw new Error("amount");

  const [first, ...rest] = (profile.full_name || profile.email?.split("@")[0] || "عميل").trim().split(/\s+/);
  const customer = sub?.tap_customer_id
    ? { id: sub.tap_customer_id }
    : { first_name: first, last_name: rest.join(" ") || undefined, email: profile.email, phone: tapPhone(profile.phone) };
  const body = {
    amount, currency: "KWD", customer_initiated: true, threeDSecure: true,
    save_card: kind !== "managed" && process.env.TAP_SAVE_CARD !== "off",
    description, metadata: { user_id: userId, kind, plan_id: planId ?? "" },
    reference: { transaction: `${kind}-${Date.now()}`, order: `${kind}-${userId.slice(0, 8)}` },
    customer, source: { id: "src_all" },
    post: { url: `${site()}/api/tap/webhook` },
    redirect: { url: `${site()}/api/tap/return` },
  };
  let charge: TapCharge;
  try {
    charge = await createCharge(body);
  } catch (e) {
    // If «حفظ البطاقة» isn't switched on in the Tap account yet, still take the payment (the customer then renews by link).
    if (!body.save_card) throw e;
    charge = await createCharge({ ...body, save_card: false });
  }
  await admin.from("tap_charges").upsert({ id: charge.id, user_id: userId, kind, plan_id: planId, amount, currency: "KWD", status: charge.status });
  if (!charge.transaction?.url) throw new Error("no payment url");
  return charge.transaction.url;
}

/** Reads the charge from Tap (never trusts the browser) and applies it once. Returns what happened. */
export async function processTapCharge(chargeId: string, known?: TapCharge) {
  const admin = createAdminClient();
  const c = known ?? (await getCharge(chargeId));
  const { data: prev } = await admin.from("tap_charges").select("user_id,kind,plan_id,status").eq("id", c.id).maybeSingle();
  const meta = { ...c.metadata } as Record<string, string>;
  meta.user_id ||= prev?.user_id ?? "";
  meta.kind ||= prev?.kind ?? "";
  meta.plan_id ||= prev?.plan_id ?? "";
  const kind = (meta.kind as Kind) || "subscribe";
  const automatic = meta.mit === "1" || c.customer_initiated === false;   // charged by us from the saved card
  const userId = meta.user_id || null;
  const method = methodOf(c);

  await admin.from("tap_charges").upsert({
    id: c.id, user_id: userId, kind, plan_id: meta.plan_id || null, amount: c.amount, currency: c.currency,
    method, status: c.status, updated_at: new Date().toISOString(),
  });

  if (c.status !== "CAPTURED") {
    const firstTime = prev?.status !== c.status;
    if (firstTime && FINAL_FAIL.includes(c.status) && kind === "renew" && automatic && userId) await cardRenewFailed(userId);
    return { kind, status: c.status, userId };
  }

  // Claim the charge: only one request (webhook or return page) gets to apply it.
  const { data: claimed } = await admin.from("tap_charges").update({ processed: true }).eq("id", c.id).eq("processed", false).select("id");
  if (!claimed?.length) return { kind, status: c.status, userId };

  const when = new Date().toISOString().slice(0, 10);
  if (kind === "managed") {
    await recordPayment({ ref: `tap:${c.id}`, source: "tap", description: "باقة الإدارة الكاملة", customerId: userId, amount: c.amount, currency: "KWD", method: METHOD_AR[method] ?? method, receivedOn: when });
    return { kind, status: c.status, userId };
  }
  if (!userId || !meta.plan_id) return { kind, status: c.status, userId };

  const id = subId(userId);
  const { data: sub } = await admin.from("subscriptions").select("*").eq("id", id).maybeSingle();
  const now = new Date();
  const running = sub && ["active", "past_due"].includes(sub.status) && sub.current_period_end;
  // A renewal continues from the end of the paid month (so paying early never loses days).
  const base = running && kind === "renew" ? new Date(Math.max(new Date(sub.current_period_end).getTime(), now.getTime() - GRACE_DAYS * DAY)) : now;
  const end = addMonth(base);

  const cardSaved = Boolean(c.card?.id && c.customer?.id && c.payment_agreement?.id);
  const payMethod = cardSaved ? "card" : method === "KNET" ? "knet" : (sub?.pay_method === "card" && kind === "renew" && automatic ? "card" : "link");
  await admin.from("subscriptions").upsert({
    id, user_id: userId, plan_id: meta.plan_id, status: "active", provider: "tap",
    current_period_end: end.toISOString(), cancel_at_period_end: kind === "subscribe" ? false : sub?.cancel_at_period_end ?? false,
    pay_method: payMethod,
    tap_customer_id: c.customer?.id ?? sub?.tap_customer_id ?? null,
    tap_card_id: cardSaved ? c.card!.id : payMethod === "card" ? sub?.tap_card_id : null,
    tap_agreement_id: cardSaved ? c.payment_agreement!.id : payMethod === "card" ? sub?.tap_agreement_id : null,
    card_label: c.card?.last_four ? `${(c.card.brand || c.card.scheme || "CARD").toUpperCase()} •••• ${c.card.last_four}` : method === "KNET" ? "KNET" : sub?.card_label ?? null,
    next_plan_id: null, failed_attempts: 0, reminded_for: null, updated_at: now.toISOString(),
  });

  await admin.rpc("renew_credits", { p_user: userId, p_plan: meta.plan_id, p_invoice: `tap:${c.id}` });
  const { data: plan } = await admin.from("plans").select("name").eq("id", meta.plan_id).maybeSingle();
  await recordPayment({
    ref: `tap:${c.id}`, source: "tap", description: `${kind === "renew" ? "تجديد" : "اشتراك"} ${plan?.name ?? meta.plan_id}`,
    customerId: userId, amount: c.amount, currency: "KWD", method: METHOD_AR[method] ?? method, receivedOn: when,
  });
  return { kind, status: c.status, userId };
}

async function cardRenewFailed(userId: string) {
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("failed_attempts").eq("id", subId(userId)).maybeSingle();
  await admin.from("subscriptions").update({ status: "past_due", failed_attempts: (sub?.failed_attempts ?? 0) + 1, updated_at: new Date().toISOString() }).eq("id", subId(userId));
  await notify(userId, "ما قدرنا نجدد اشتراكك", "ما مرّ الخصم من بطاقتك. ادفع من الرابط بأي طريقة (كي نت أو بطاقة) عشان يستمر اشتراكك.", "/app/pay?kind=renew");
}

async function stopPlan(sub: { id: string; user_id: string; current_period_end: string }, status: "canceled" | "expired") {
  const admin = createAdminClient();
  await admin.from("subscriptions").update({ status, updated_at: new Date().toISOString() }).eq("id", sub.id);
  await admin.from("profiles").update({ plan_id: null }).eq("id", sub.user_id);
  const { data: p } = await admin.from("profiles").select("credits").eq("id", sub.user_id).single();
  if (p?.credits) await admin.rpc("grant_credits", { p_user: sub.user_id, p_amount: -p.credits, p_reason: "admin", p_ref: `${status}:${sub.id}:${sub.current_period_end.slice(0, 10)}` });
  await notify(sub.user_id, status === "canceled" ? "انتهى اشتراكك" : "توقف اشتراكك",
    status === "canceled" ? "انتهى الشهر المدفوع بعد ما أوقفت التجديد. حسابك وأعمالك محفوظة، وتقدر ترجع تشترك بأي وقت." : "ما وصلنا دفع الشهر الجديد. حسابك وأعمالك محفوظة، وتقدر ترجع تشترك بأي وقت.",
    "/app/account");
}

/** Runs once a day (Vercel cron): charges saved cards, reminds KNET customers, and stops unpaid plans. */
export async function runRenewals() {
  const admin = createAdminClient();
  const now = Date.now();
  const { data: subs } = await admin.from("subscriptions").select("*").eq("provider", "tap").in("status", ["active", "past_due"]);
  const log: string[] = [];
  for (const sub of subs ?? []) {
    if (!sub.current_period_end) continue;
    const end = new Date(sub.current_period_end).getTime();
    try {
      if (sub.cancel_at_period_end) {
        if (end <= now) { await stopPlan(sub, "canceled"); log.push(`${sub.id}: canceled`); }
        continue;
      }
      if (end + GRACE_DAYS * DAY <= now) { await stopPlan(sub, "expired"); log.push(`${sub.id}: expired`); continue; }

      const auto = sub.pay_method === "card" && sub.tap_card_id && sub.tap_customer_id && sub.tap_agreement_id && sub.failed_attempts < MAX_CARD_TRIES;
      if (auto && end <= now) {
        const planId = sub.next_plan_id || sub.plan_id;
        const { data: plan } = await admin.from("plans").select("name,price_kwd").eq("id", planId).single();
        const token = await tokenFromSavedCard(sub.tap_card_id, sub.tap_customer_id);
        const charge = await createCharge({
          amount: Number(plan!.price_kwd), currency: "KWD", customer_initiated: false, save_card: false,
          payment_agreement: { id: sub.tap_agreement_id },
          description: `تجديد ${plan!.name}`, metadata: { user_id: sub.user_id, kind: "renew", plan_id: planId, mit: "1" },
          reference: { transaction: `renew-${Date.now()}`, order: `renew-${sub.user_id.slice(0, 8)}`, idempotent: `renew-${sub.id}-${sub.current_period_end.slice(0, 10)}-${sub.failed_attempts}` },
          customer: { id: sub.tap_customer_id }, source: { id: token.id },
          post: { url: `${site()}/api/tap/webhook` }, redirect: { url: `${site()}/api/tap/return` },
        });
        await admin.from("tap_charges").upsert({ id: charge.id, user_id: sub.user_id, kind: "renew", plan_id: planId, amount: Number(plan!.price_kwd), status: "INITIATED" });
        const r = await processTapCharge(charge.id, charge);
        log.push(`${sub.id}: card ${r.status}`);
        continue;
      }

      // KNET (or a card we can't charge): payment link a few days before the end, once per month.
      if (end - REMIND_DAYS * DAY <= now && sub.reminded_for !== sub.current_period_end) {
        const date = new Date(end).toLocaleDateString("ar-KW");
        await notify(sub.user_id, "جدد اشتراكك بشاهين", `اشتراكك ينتهي بتاريخ ${date}. ادفع من الرابط بكي نت أو بالبطاقة عشان ما توقف أدواتك.`, "/app/pay?kind=renew");
        await admin.from("subscriptions").update({ reminded_for: sub.current_period_end }).eq("id", sub.id);
        log.push(`${sub.id}: reminded`);
      }
      if (end <= now && sub.status !== "past_due") await admin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id);
    } catch (e) {
      log.push(`${sub.id}: error ${(e as Error).message}`);
      if (sub.pay_method === "card" && end <= now) await cardRenewFailed(sub.user_id);
    }
  }
  return log;
}
