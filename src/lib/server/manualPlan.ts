import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPayment } from "@/lib/server/payments";
import { paidNotice } from "@/lib/server/notify";
import { subId } from "@/lib/server/transfers";

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

/**
 * The admin activates a plan for a customer as if he subscribed and paid (cash, a transfer made outside the site…).
 * Same effects as an approved transfer: the subscription starts today, the plan's ريش are added, the payment lands in «المالية»
 * (and so in Google Sheets), and the customer gets a notice. A free activation (amount 0) records no payment.
 */
export async function activatePlanManually(p: { userId: string; planId: string; months: number; amount: number; method: string; by: string | null }): Promise<{ error?: string; planName?: string; end?: Date }> {
  const admin = createAdminClient();
  const { data: plan } = await admin.from("plans").select("id,name,is_active").eq("id", p.planId).maybeSingle();
  if (!plan) return { error: "الباقة غير موجودة." };
  const { data: prof } = await admin.from("profiles").select("id,role").eq("id", p.userId).maybeSingle();
  if (!prof || prof.role !== "user") return { error: "العميل غير موجود." };
  const sid = subId(p.userId);
  const { data: sub } = await admin.from("subscriptions").select("status,provider").eq("id", sid).maybeSingle();
  // never overwrite a subscription that bills the customer's card on its own: that billing would be orphaned
  if (sub && ["active", "past_due"].includes(sub.status) && sub.provider && sub.provider !== "manual")
    return { error: "عنده اشتراك شغّال بالدفع التلقائي (بطاقة). ألغِه أولاً من نفس البطاقة، وبعدها فعّل الباقة." };
  const now = new Date();
  const periodEnd = addMonths(now, 1), prepaid = addMonths(now, p.months);
  const { error: e1 } = await admin.from("subscriptions").upsert({
    id: sid, user_id: p.userId, plan_id: p.planId, status: "active", provider: "manual", pay_method: "manual",
    current_period_end: periodEnd.toISOString(), prepaid_until: prepaid.toISOString(), cancel_at_period_end: false,
    card_label: p.method, tap_card_id: null, tap_agreement_id: null,
    next_plan_id: null, failed_attempts: 0, reminded_for: null, updated_at: now.toISOString(),
  });
  if (e1) return { error: "ما انحفظ الاشتراك. حاول مرة ثانية." };
  const stamp = `${p.userId}:${now.getTime()}`;
  const { error: e2 } = await admin.rpc("renew_credits", { p_user: p.userId, p_plan: p.planId, p_invoice: `admin-plan:${stamp}` });
  if (e2) return { error: "انفعّل الاشتراك لكن ما انضافت الريش. أضفها يدوياً من «الرصيد»." };
  if (p.amount > 0) await recordPayment({ ref: `admin-plan:${stamp}`, source: "manual", description: `اشتراك ${plan.name}${p.months > 1 ? ` (${p.months} أشهر)` : ""} (من الإدارة)`, customerId: p.userId, amount: p.amount, currency: "KWD", method: p.method, receivedOn: now.toISOString().slice(0, 10) });
  await paidNotice(p.userId, "new", plan.name, periodEnd).catch(() => null);
  return { planName: plan.name, end: periodEnd };
}
