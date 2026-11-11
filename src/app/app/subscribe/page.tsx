import { redirect } from "next/navigation";
import { startCheckout } from "@/app/app/account/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { RenewConsent } from "@/components/app/RenewConsent";

/** Coming from the pricing section: confirm the plan and the monthly charge, then go to the secure payment page. */
export default async function Subscribe({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const { plan: id = "starter", error } = await searchParams;
  const { data: plan } = await createAdminClient().from("plans").select("id,name,price_kwd,credits,bonus_credits").eq("id", id).eq("is_active", true).maybeSingle();
  if (!plan) redirect("/app/account");
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <h1 className="text-[26px] font-bold text-navy-900">تأكيد الاشتراك</h1>
      <form action={startCheckout.bind(null, plan.id)} className="card flex flex-col gap-3 p-6">
        <span className="text-lg font-bold">{plan.name}</span>
        <span className="text-muted">{Number(plan.price_kwd)} د.ك شهرياً · {plan.credits.toLocaleString("en")} ريشة{(plan.bonus_credits ?? 0) > 0 ? ` + ${plan.bonus_credits.toLocaleString("en")} هدية` : ""}</span>
        {error === "renew" && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">علّم على المربع عشان تكمل للدفع.</p>}
        <RenewConsent price={Number(plan.price_kwd)} />
        <button className="btn btn-gold py-3">كمّل للدفع الآمن</button>
      </form>
    </div>
  );
}
