import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/server/payments";
import { getContent } from "@/lib/data";

/**
 * «الدفع بالتحويل»: for countries the card gateway doesn't serve well (e.g. Syria) the customer transfers
 * (bank, Sham Cash…), uploads the receipt, and an admin approves it. An approved transfer is a normal payment:
 *  - it activates / extends the plan (the same subscription row Tap uses, provider "manual"),
 *  - several months can be paid at once: the credits then refill every month by themselves (runRenewals),
 *  - it lands in «المالية» (source "transfer") → the admin and customer get the usual «دفعة جديدة» bells,
 *    and Google Sheets / the dashboard count it with its method and country.
 * Methods (name, account details, countries) are managed from the admin, never hard-coded.
 */
export type TransferMethod = { id: string; name: string; details: string; countries: string[]; is_active: boolean; sort_order: number };
export const DEFAULT_MONTHS = [1, 3, 6, 12];
export const subId = (userId: string) => `tap_${userId}`;   // one subscription row per customer, whatever pays for it
const DAY = 86_400_000;
const GRACE_DAYS = 3;
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/** Active methods offered to a customer from this country (a method with no countries is offered to everyone). */
export async function methodsFor(country: string | null | undefined): Promise<TransferMethod[]> {
  const { data } = await createAdminClient().from("transfer_methods").select("*").eq("is_active", true).order("sort_order");
  const c = (country || "KW").toUpperCase();
  return ((data ?? []) as TransferMethod[]).filter((m) => !m.countries?.length || m.countries.includes(c));
}

/** Months a customer may pay at once (set by the owner; 1 is always allowed). */
export async function allowedMonths(): Promise<number[]> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "transfers").maybeSingle();
  const m = ((data?.value as { months?: number[] } | undefined)?.months ?? DEFAULT_MONTHS).filter((x) => Number.isInteger(x) && x >= 1 && x <= 12);
  return [...new Set([1, ...m])].sort((a, b) => a - b);
}

/** What a transfer is for, and how much (in KWD). Throws on an invalid request. */
export async function priceOf(userId: string, kind: "subscribe" | "renew" | "managed", planId: string | null, months: number) {
  const admin = createAdminClient();
  if (kind === "managed") {
    const c = await getContent();
    const amount = Number(c.managed_service?.price_kwd || 0);
    if (!(amount > 0)) throw new Error("managed price");
    return { planId: null, months: 1, amount, label: c.managed_service?.title || "باقة الإدارة الكاملة" };
  }
  let id = planId;
  if (kind === "renew") {
    const { data: sub } = await admin.from("subscriptions").select("plan_id,next_plan_id").eq("id", subId(userId)).maybeSingle();
    id = sub?.next_plan_id || sub?.plan_id || planId;
  }
  const { data: plan } = await admin.from("plans").select("id,name,price_kwd").eq("id", id ?? "").eq("is_active", true).maybeSingle();
  if (!plan) throw new Error("plan");
  return { planId: plan.id as string, months, amount: Math.round(Number(plan.price_kwd) * months * 1000) / 1000, label: plan.name as string };
}

/** Approves a pending transfer once (two admins pressing at the same time can't apply it twice). */
export async function approveTransfer(id: string, by: string | null): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: claimed } = await admin.from("transfers")
    .update({ status: "approved", reviewed_by: by, reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq("id", id).eq("status", "pending").select("*");
  const t = claimed?.[0];
  if (!t) return { error: "هالتحويل انراجع من قبل." };
  const when = new Date().toISOString().slice(0, 10);
  const months = Number(t.months) || 1;

  if (t.kind === "managed") {
    await recordPayment({ ref: `transfer:${t.id}`, source: "transfer", description: "باقة الإدارة الكاملة (تحويل)", customerId: t.user_id, amount: Number(t.amount), currency: "KWD", method: t.method_name, receivedOn: when });
    return {};
  }
  if (!t.plan_id) return { error: "الباقة انحذفت. فعّل الاشتراك يدوياً من صفحة العميل." };

  const sid = subId(t.user_id);
  const { data: sub } = await admin.from("subscriptions").select("*").eq("id", sid).maybeSingle();
  const now = new Date();
  const running = sub && ["active", "past_due"].includes(sub.status) && sub.current_period_end && t.kind === "renew";
  let periodEnd: Date, prepaid: Date, refillNow: boolean;
  if (!running) {
    // a new subscription (or a lapsed one): starts today
    periodEnd = addMonths(now, 1); prepaid = addMonths(now, months); refillNow = true;
  } else {
    const curEnd = new Date(sub.current_period_end);
    const paidTo = new Date(Math.max(new Date(sub.prepaid_until ?? 0).getTime(), curEnd.getTime(), now.getTime() - GRACE_DAYS * DAY));
    prepaid = addMonths(paidTo, months);
    if (curEnd.getTime() <= now.getTime()) {
      // the month already ended (grace days): the new month starts from where it ended, credits refill now
      periodEnd = addMonths(new Date(Math.max(curEnd.getTime(), now.getTime() - GRACE_DAYS * DAY)), 1); refillNow = true;
    } else {
      periodEnd = curEnd; refillNow = false;   // paying early: the next month's credits refill when this one ends
    }
  }
  await admin.from("subscriptions").upsert({
    id: sid, user_id: t.user_id, plan_id: t.plan_id, status: "active", provider: "manual", pay_method: "manual",
    current_period_end: periodEnd.toISOString(), prepaid_until: prepaid.toISOString(), cancel_at_period_end: false,
    card_label: t.method_name, tap_card_id: null, tap_agreement_id: null,
    next_plan_id: null, failed_attempts: 0, reminded_for: null, updated_at: now.toISOString(),
  });
  if (refillNow) await admin.rpc("renew_credits", { p_user: t.user_id, p_plan: t.plan_id, p_invoice: `transfer:${t.id}` });
  else await admin.from("profiles").update({ plan_id: t.plan_id }).eq("id", t.user_id);

  const { data: plan } = await admin.from("plans").select("name").eq("id", t.plan_id).maybeSingle();
  const what = `${t.kind === "renew" ? "تجديد" : "اشتراك"} ${plan?.name ?? t.plan_id}${months > 1 ? ` (${months} أشهر)` : ""}`;
  await recordPayment({ ref: `transfer:${t.id}`, source: "transfer", description: what, customerId: t.user_id, amount: Number(t.amount), currency: "KWD", method: t.method_name, receivedOn: when });
  return {};
}

export async function rejectTransfer(id: string, by: string | null, reason: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data } = await admin.from("transfers").update({ status: "rejected", reviewed_by: by, reviewed_at: new Date().toISOString(), reject_reason: reason })
    .eq("id", id).eq("status", "pending").select("user_id,method_name");
  const t = data?.[0];
  if (!t) return { error: "هالتحويل انراجع من قبل." };
  await admin.from("notifications").insert({
    user_id: t.user_id, kind: "payment", title: "ما قدرنا نأكد تحويلك",
    body: `${t.method_name}: ${reason}. تقدر ترسل الإيصال الصحيح مرة ثانية.`, link: "/app/account",
  }).then(() => null, () => null);
  return {};
}

/**
 * Daily (from runRenewals), for subscriptions paid by transfer:
 *  - paid for more months → the month rolls over and the credits refill (once per month, never twice),
 *  - last paid month ending → a reminder 3 days before, with the transfer page.
 * Returns true when it handled the subscription (rolled over).
 */
export async function rollPrepaidMonth(sub: { id: string; user_id: string; plan_id: string; current_period_end: string; prepaid_until?: string | null }) {
  const end = new Date(sub.current_period_end).getTime();
  const paid = sub.prepaid_until ? new Date(sub.prepaid_until).getTime() : 0;
  if (end > Date.now() || paid <= end + DAY) return false;
  const admin = createAdminClient();
  const next = addMonths(new Date(end), 1);
  const stamp = new Date(end).toISOString().slice(0, 10);
  await admin.from("subscriptions").update({ current_period_end: next.toISOString(), status: "active", reminded_for: null, updated_at: new Date().toISOString() }).eq("id", sub.id);
  await admin.rpc("renew_credits", { p_user: sub.user_id, p_plan: sub.plan_id, p_invoice: `prepaid:${sub.id}:${stamp}` });
  return true;
}
