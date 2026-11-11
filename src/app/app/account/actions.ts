"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

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
export async function startCheckout(planId: string) {
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
    client_reference_id: profile.id,
    metadata: { user_id: profile.id, plan_id: plan.id },
    subscription_data: { metadata: { user_id: profile.id, plan_id: plan.id } },
  });
  redirect(session.url!);
}

export async function openPortal() {
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
    phone: String(form.get("phone") ?? "").slice(0, 30),
    instagram: String(form.get("instagram") ?? "").slice(0, 60),
  }).eq("id", profile.id);
  revalidatePath("/app", "layout");
}

/** Removes every file under `prefix` (including nested job folders) from a bucket. */
async function emptyFolder(bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 3) return;
  const store = createAdminClient().storage.from(bucket);
  for (;;) {
    const { data } = await store.list(prefix, { limit: 1000 });
    if (!data?.length) return;
    const files = data.filter((x) => x.id).map((x) => `${prefix}/${x.name}`);
    for (const dir of data.filter((x) => !x.id)) await emptyFolder(bucket, `${prefix}/${dir.name}`, depth + 1);
    if (!files.length) return;
    await store.remove(files);
    if (data.length < 1000) return;
  }
}

/** "حذف الحساب": cancels billing, deletes the user's files and all their data. */
export async function deleteAccount(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const profile = await me();
  if (String(form.get("confirm") ?? "").trim() !== "حذف") return { error: "اكتب كلمة «حذف» للتأكيد." };
  if (profile.role === "admin") return { error: "حساب المدير لا يُحذف من هنا." };
  const admin = createAdminClient();

  if (profile.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const subs = await stripe().subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 20 });
      for (const s of subs.data) if (!["canceled", "incomplete_expired"].includes(s.status)) await stripe().subscriptions.cancel(s.id);
      await stripe().customers.del(profile.stripe_customer_id); // removes saved cards too
    } catch { return { error: "تعذّر إلغاء اشتراكك. حاول مرة ثانية أو تواصل مع الدعم." }; }
  }

  await admin.from("profiles").update({ referred_by: null }).eq("referred_by", profile.id);
  await Promise.all([emptyFolder("uploads", profile.id), emptyFolder("results", profile.id)]).catch(() => {});

  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) return { error: "تعذّر حذف الحساب. حاول مرة ثانية أو تواصل مع الدعم." };

  await (await createClient()).auth.signOut().catch(() => {});
  redirect("/?deleted=1");
}
