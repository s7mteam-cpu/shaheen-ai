import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/data";
import { getMoney } from "@/lib/server/money";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";
import { countryOf } from "@/lib/countries";
import { allowedMonths, methodsFor, priceOf } from "@/lib/server/transfers";
import { TransferForm } from "./TransferForm";

export const dynamic = "force-dynamic";

/** «الدفع بالتحويل»: subscribe, renew or «باقة الإدارة الكاملة» by bank transfer / wallet, with a receipt. */
export default async function PayByTransfer({ searchParams }: { searchParams: Promise<{ kind?: string; plan?: string }> }) {
  const { kind: k = "renew", plan = "" } = await searchParams;
  const kind = (["subscribe", "renew", "managed"].includes(k) ? k : "renew") as "subscribe" | "renew" | "managed";
  const [profile, lang] = await Promise.all([getSessionProfile(), getLang()]);
  if (!profile) redirect("/login");
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const admin = createAdminClient();

  const { data: pending } = await admin.from("transfers").select("method_name,amount,months,created_at").eq("user_id", profile.id).eq("status", "pending").maybeSingle();
  const methods = await methodsFor(profile.country);
  const shell = (body: React.ReactNode) => (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <h1 className="text-[26px] font-bold text-navy-900">{T("الدفع بالتحويل", "Pay by transfer")}</h1>
      {body}
    </div>
  );

  if (pending) return shell(
    <div className="card flex flex-col gap-3 p-6 text-center">
      <span className="text-4xl">⏳</span>
      <p className="leading-7 text-navy-900">{T(`تحويلك (${pending.method_name} — ${Number(pending.amount)} د.ك) وصلنا وينتظر المراجعة. بيوصلك إشعار أول ما نفعّله.`, `Your transfer (${pending.method_name} — ${Number(pending.amount)} KWD) is waiting for review. You'll be notified once it's activated.`)}</p>
      <Link href="/app/account" className="btn btn-outline mx-auto px-6 py-2.5">{T("رجوع لحسابي", "Back to my account")}</Link>
    </div>,
  );

  if (!methods.length) {
    const c = countryOf(profile.country ?? "KW");
    return shell(
      <div className="card flex flex-col gap-3 p-6 text-center">
        <p className="leading-7 text-navy-900">{T(`الدفع بالتحويل مو متاح حالياً لـ${c.ar}. تقدر تدفع بالبطاقة أو كي نت من صفحة الدفع الآمنة.`, `Paying by transfer isn't available for ${c.en} yet. You can pay by card from the secure payment page.`)}</p>
        <Link href="/app/account" className="btn btn-outline mx-auto px-6 py-2.5">{T("رجوع", "Back")}</Link>
      </div>,
    );
  }

  let base;
  try { base = await priceOf(profile.id, kind, plan || null, 1); } catch { redirect("/app/account"); }
  const { money } = await getMoney();
  const months = kind === "managed" ? [1] : await allowedMonths();
  const prices = months.map((m) => {
    const kwd = Math.round(base.amount * m * 1000) / 1000;
    const mm = money(kwd);
    return { months: m, kwd: `${kwd.toLocaleString("en", { maximumFractionDigits: 3 })} ${T("د.ك", "KWD")}`, approx: mm.approx ? `${mm.number} ${mm.symbol}` : null };
  });
  const name = await localize(base.label, lang);
  const title = kind === "managed" ? name : kind === "renew" ? T(`تجديد ${name}`, `Renew ${name}`) : T(`اشتراك ${name}`, `${name} plan`);
  return shell(<TransferForm kind={kind} plan={base.planId ?? ""} title={title} methods={methods.map((m) => ({ id: m.id, name: m.name, details: m.details }))} prices={prices} />);
}
