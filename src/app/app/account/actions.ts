"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { deleteUserCompletely } from "@/lib/server/deleteUser";
import { isImpersonating } from "@/lib/server/impersonation";
import { normalizePhone } from "@/lib/phone";

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
    phone: normalizePhone(String(form.get("phone") ?? "")) ?? profile.phone,
    instagram: String(form.get("instagram") ?? "").slice(0, 60),
  }).eq("id", profile.id);
  revalidatePath("/app", "layout");
}

/** "حذف الحساب": cancels billing, deletes the user's files and all their data. */
export async function deleteAccount(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  if (await isImpersonating()) return { error: "حذف الحساب محمي، وما يقدر فريق الدعم يعمله." };
  const profile = await me();
  if (String(form.get("confirm") ?? "").trim() !== "حذف") return { error: "اكتب كلمة «حذف» للتأكيد." };
  if (profile.role === "admin") return { error: "حساب المدير لا يُحذف من هنا." };
  const res = await deleteUserCompletely(profile);
  if (res.error) return res;

  await (await createClient()).auth.signOut().catch(() => {});
  redirect("/?deleted=1");
}
