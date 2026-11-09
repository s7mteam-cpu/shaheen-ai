import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe → Shaheen. Subscribe these events in the Stripe dashboard:
 * checkout.session.completed, invoice.paid, invoice.payment_failed,
 * customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const admin = createAdminClient();

  async function planForPrice(priceId?: string | null) {
    if (!priceId) return null;
    const { data } = await admin.from("plans").select("id").eq("stripe_price_id", priceId).maybeSingle();
    return data?.id ?? null;
  }

  async function syncSubscription(sub: Stripe.Subscription) {
    const userId = sub.metadata.user_id
      || (await admin.from("profiles").select("id").eq("stripe_customer_id", String(sub.customer)).single()).data?.id;
    if (!userId) return null;
    const item = sub.items.data[0];
    const planId = (await planForPrice(item?.price.id)) ?? sub.metadata.plan_id ?? null;
    const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    await admin.from("subscriptions").upsert({
      id: sub.id, user_id: userId, plan_id: planId, status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end, updated_at: new Date().toISOString(),
    });
    const live = ["active", "trialing", "past_due"].includes(sub.status);
    await admin.from("profiles").update({ plan_id: live ? planId : null }).eq("id", userId);
    if (sub.status === "canceled") {
      const { data: p } = await admin.from("profiles").select("credits").eq("id", userId).single();
      if (p?.credits) await admin.rpc("grant_credits", { p_user: userId, p_amount: -p.credits, p_reason: "admin", p_ref: `cancel:${sub.id}` });
    }
    return { userId, planId };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await syncSubscription(await stripe().subscriptions.retrieve(String(s.subscription)));
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const subId = (inv as unknown as { subscription?: string }).subscription
        ?? inv.parent?.subscription_details?.subscription;
      if (!subId) break;
      const synced = await syncSubscription(await stripe().subscriptions.retrieve(String(subId)));
      if (synced?.planId && inv.amount_paid > 0) {
        await admin.rpc("renew_credits", { p_user: synced.userId, p_plan: synced.planId, p_invoice: inv.id });
      }
      break;
    }
    case "invoice.payment_failed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const obj = event.data.object as Stripe.Subscription | Stripe.Invoice;
      const subId = obj.object === "subscription" ? obj.id
        : ((obj as unknown as { subscription?: string }).subscription ?? (obj as Stripe.Invoice).parent?.subscription_details?.subscription);
      if (subId) await syncSubscription(await stripe().subscriptions.retrieve(String(subId)));
      break;
    }
  }
  return NextResponse.json({ received: true });
}
