"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { deleteUserCompletely } from "@/lib/server/deleteUser";
import { isImpersonating } from "@/lib/server/impersonation";
import { normalizePhone } from "@/lib/phone";
import { tapOpenFor } from "@/lib/tap";
import { startTapPayment } from "@/lib/server/tapBilling";
import { getLang, serverT } from "@/lib/server/lang";

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await createAdminClient().from("profiles").select("*").eq("id", user.id).single();
  return data!;
}

export async function ensureCustomer(profile: { id: string; email: string | null; full_name: string | null; stripe_customer_id: string | null }) {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const c = await stripe().customers.create({ email: profile.email ?? undefined, name: profile.full_name ?? undefined, metadata: { user_id: profile.id } });
  await createAdminClient().from("profiles").update({ stripe_customer_id: c.id }).eq("id", profile.id);
  return c.id;
}

/** New subscription → Stripe Checkout. Existing subscription → change plan in the billing portal. */
export async function startCheckout(planId: string, form?: FormData) {
  if (await isImpersonating()) redirect("/app/account?error=support");
  // The customer must tick «أعرف إن المبلغ ينخصم كل شهر» before any card payment.
  if (form?.get("renew_ok") !== "on") redirect(`/app/subscribe?plan=${encodeURIComponent(planId)}&error=renew`);
  const profile = await me();
  const admin = createAdminClient();

  // Tap (KNET + cards + Apple Pay) is used as soon as its key is in Vercel.
  if (tapOpenFor(profile.role)) {
    const { data: tapSub } = await admin.from("subscriptions").select("id,plan_id,status").eq("id", `tap_${profile.id}`).maybeSingle();
    if (tapSub && ["active", "past_due"].includes(tapSub.status)) {
      // Already subscribed: the new plan starts from the next month (no double charge).
      await admin.from("subscriptions").update({ next_plan_id: planId === tapSub.plan_id ? null : planId, cancel_at_period_end: false }).eq("id", tapSub.id);
      revalidatePath("/app/account");
      redirect("/app/account?ok=plan");
    }
    let url: string;
    try { url = await startTapPayment(profile.id, "subscribe", planId, await getLang()); } catch (e) { console.error(e); redirect("/app/account?error=payment"); }
    redirect(url);
  }

  const { data: plan } = await admin.from("plans").select("*").eq("id", planId).eq("is_active", true).single();
  if (!plan?.stripe_price_id) redirect("/app/account?error=plan");
  const customer = await ensureCustomer(profile);

  const { data: active } = await admin.from("subscriptions").select("id").eq("user_id", profile.id).in("status", ["active", "trialing", "past_due"]).maybeSingle();
  if (active) {
    const portal = await stripe().billingPortal.sessions.create({
      customer, return_url: `${site()}/app/account`,
      flow_data: { type: "subscription_update", subscription_update: { subscription: active.id } },
    });
    redirect(portal.url);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${site()}/app?welcome=1`,
    cancel_url: `${site()}/app/account`,
    allow_promotion_codes: true,
    locale: "auto",
    custom_text: { submit: { message: `بالاشتراك توافق على خصم ${Number(plan.price_kwd)} د.ك من بطاقتك تلقائياً كل شهر، حتى توقف التجديد من «إدارة الدفع والاشتراك» في حسابك بشاهين.` } },
    client_reference_id: profile.id,
    metadata: { user_id: profile.id, plan_id: plan.id },
    subscription_data: { metadata: { user_id: profile.id, plan_id: plan.id } },
  });
  redirect(session.url!);
}

export async function openPortal() {
  if (await isImpersonating()) redirect("/app/account?error=support");
  const profile = await me();
  const customer = await ensureCustomer(profile);
  const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${site()}/app/account` });
  redirect(portal.url);
}

export async function saveProfile(form: FormData) {
  const profile = await me();
  const supabase = await createClient();
  await supabase.from("profiles").update({
    full_name: String(form.get("full_name") ?? "").slice(0, 80),
    phone: normalizePhone(String(form.get("phone") ?? ""), /^[A-Z]{2}$/.test(String(form.get("country"))) && form.get("country") !== "XX" ? String(form.get("country")) : null) ?? profile.phone,
    ...(/^[A-Z]{2}$/.test(String(form.get("country"))) ? { country: String(form.get("country")) } : {}),
    instagram: String(form.get("instagram") ?? "").slice(0, 60),
  }).eq("id", profile.id);
  revalidatePath("/app", "layout");
}

/** "حذف الحساب": cancels billing, deletes the user's files and all their data. */
export async function deleteAccount(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const T = await serverT();
  if (await isImpersonating()) return { error: T("حذف الحساب محمي، وما يقدر فريق الدعم يعمله.", "Account deletion is protected and can't be done by the support team.") };
  const profile = await me();
  const word = String(form.get("confirm") ?? "").trim();
  if (word !== "حذف" && word.toUpperCase() !== "DELETE") return { error: T("اكتب كلمة «حذف» للتأكيد.", "Type «DELETE» to confirm.") };
  if (profile.role === "admin") return { error: T("حساب المدير لا يُحذف من هنا.", "The admin account can't be deleted here.") };
  const res = await deleteUserCompletely(profile, { reason: "self", note: String(form.get("why") ?? "").trim().slice(0, 200) || null });
  if (res.error) return res;

  await (await createClient()).auth.signOut().catch(() => {});
  redirect("/?deleted=1");
}

/** «ادفع الحين»: renew this month (KNET link / failed card) or pay the managed package. */
export async function payNow(kind: "renew" | "managed") {
  if (await isImpersonating()) redirect("/app/account?error=support");
  const profile = await me();
  if (!tapOpenFor(profile.role)) redirect("/app/account?error=plan");
  let url: string;
  try { url = await startTapPayment(profile.id, kind, undefined, await getLang()); } catch (e) { console.error(e); redirect("/app/account?error=payment"); }
  redirect(url);
}

/** Stop / resume automatic renewal (Tap subscriptions). The paid month always stays active. */
export async function setRenewal(on: boolean) {
  if (await isImpersonating()) redirect("/app/account?error=support");
  const profile = await me();
  await createAdminClient().from("subscriptions").update({ cancel_at_period_end: !on, updated_at: new Date().toISOString() }).eq("id", `tap_${profile.id}`);
  revalidatePath("/app/account");
  redirect(`/app/account?ok=${on ? "renew_on" : "renew_off"}`);
}
