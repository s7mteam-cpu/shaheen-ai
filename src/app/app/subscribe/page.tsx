import { getMoney } from "@/lib/server/money";
import { redirect } from "next/navigation";
import { startCheckout } from "@/app/app/account/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { RenewConsent } from "@/components/app/RenewConsent";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";
import Link from "next/link";
import { getSessionProfile } from "@/lib/data";
import { methodsFor } from "@/lib/server/transfers";

/** Coming from the pricing section: confirm the plan and the monthly charge, then go to the secure payment page. */
export default async function Subscribe({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const { plan: id = "starter", error } = await searchParams;
  const { data: plan0 } = await createAdminClient().from("plans").select("id,name,price_kwd,credits,bonus_credits").eq("id", id).eq("is_active", true).maybeSingle();
  if (!plan0) redirect("/app/account");
  const lang = await getLang();
  const plan = await localize(plan0, lang);
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const { money } = await getMoney();
  const transfer = await methodsFor((await getSessionProfile())?.country);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <h1 className="text-[26px] font-bold text-navy-900">{T("تأكيد الاشتراك", "Confirm your plan")}</h1>
      <form action={startCheckout.bind(null, plan.id)} className="card flex flex-col gap-3 p-6">
        <span className="text-lg font-bold">{plan.name}</span>
        <span className="text-muted">{Number(plan.price_kwd)} {T("د.ك شهرياً", "KWD / month")} {money(Number(plan.price_kwd)).approx ? <span className="opacity-75">(≈ {money(Number(plan.price_kwd)).number} {money(Number(plan.price_kwd)).symbol})</span> : null} · {plan.credits.toLocaleString("en")} {T("ريشة", "credits")}{(plan.bonus_credits ?? 0) > 0 ? ` + ${plan.bonus_credits.toLocaleString("en")} ${T("هدية", "bonus")}` : ""}</span>
        {error === "renew" && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{T("علّم على المربع عشان تكمل للدفع.", "Tick the box to continue to payment.")}</p>}
        <RenewConsent price={Number(plan.price_kwd)} />
        <button className="btn btn-gold py-3">{T("كمّل للدفع الآمن", "Continue to secure payment")}</button>
        {transfer.length > 0 && <Link href={`/app/pay/transfer?kind=subscribe&plan=${plan.id}`} className="btn btn-outline py-3">🏦 {T("أو ادفع بالتحويل", "Or pay by transfer")} <span className="text-[12.5px] font-normal opacity-80">({transfer.map((m) => m.name.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, "")).join("، ")})</span></Link>}
      </form>
    </div>
  );
}
