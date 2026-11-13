import { getMoney } from "@/lib/server/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { payNow } from "@/app/app/account/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContent, getSessionProfile } from "@/lib/data";
import { tapOpenFor, tapTestMode } from "@/lib/tap";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";
import { methodsFor } from "@/lib/server/transfers";

/** The link in the monthly reminder (KNET) and in «باقة الإدارة الكاملة»: shows what will be paid, then goes to Tap. */
export default async function Pay({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind = "renew" } = await searchParams;
  const [profile, lang] = await Promise.all([getSessionProfile(), getLang()]);
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const { money } = await getMoney();
  if (!profile) redirect("/login");
  if (!tapOpenFor(profile.role)) redirect("/app/account");
  const admin = createAdminClient();
  const transfer = await methodsFor(profile.country);

  let title: string, amount: number, note: string;
  if (kind === "managed") {
    const c = await getContent();
    title = (await localize(c.managed_service?.title || "", lang)) || T("باقة الإدارة الكاملة", "Full social media management");
    amount = Number(c.managed_service?.price_kwd || 0);
    note = T("دفعة لمرة وحدة لهذا الشهر. فريقنا يتواصل معك على الواتساب بعد الدفع.", "One-time payment for this month. Our team will contact you on WhatsApp after payment.");
  } else {
    const { data: sub } = await admin.from("subscriptions").select("*").eq("id", `tap_${profile.id}`).maybeSingle();
    if (!sub || !["active", "past_due"].includes(sub.status)) redirect("/app/account");
    const { data: plan } = await admin.from("plans").select("name,price_kwd").eq("id", sub.next_plan_id || sub.plan_id).single();
    title = T(`تجديد ${plan?.name ?? ""}`, `Renew ${await localize(plan?.name ?? "", lang)}`);
    amount = Number(plan?.price_kwd ?? 0);
    note = sub.current_period_end
      ? T(`يمتد اشتراكك شهر كامل من ${new Date(sub.current_period_end).toLocaleDateString("ar-KW")}، فما تخسر أي يوم لو دفعت قبل الموعد.`, `Your plan extends a full month from ${new Date(sub.current_period_end).toLocaleDateString("en-GB")}, so paying early never loses a day.`)
      : T("يمتد اشتراكك شهر كامل.", "Your plan extends by a full month.");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <h1 className="text-[26px] font-bold text-navy-900">{T("الدفع", "Payment")}</h1>
      <form action={payNow.bind(null, kind === "managed" ? "managed" : "renew")} className="card flex flex-col gap-3 p-6">
        <span className="text-lg font-bold">{title}</span>
        <span className="text-2xl font-bold text-navy-900">{amount} {T("د.ك", "KWD")}</span>
        {money(amount).approx && <span className="text-sm text-subtle">{T(`≈ ${money(amount).number} ${money(amount).symbol} (المبلغ يندفع بالدينار الكويتي، وبنكك يحوّله)`, `≈ ${money(amount).number} ${money(amount).symbol} (charged in Kuwaiti dinars; your bank converts it)`)}</span>}
        <p className="text-sm leading-7 text-muted">{note}</p>
        <p className="rounded-xl bg-tint p-3 text-[13px] leading-6 text-navy-900">{lang === "en" ? <>You can pay with <b>KNET</b>, <b>Visa / Mastercard</b> or <b>Apple Pay</b> on the secure payment page. Your card details stay with the payment provider and are never stored by us.</> : <>تقدر تدفع بـ<b>كي نت</b> أو <b>فيزا / ماستر كارد</b> أو <b>Apple Pay</b> من صفحة الدفع الآمنة. بيانات بطاقتك عند بوابة الدفع، وما تنحفظ عندنا.</>}</p>
        {tapTestMode() && <p className="rounded-xl bg-amber-50 p-3 text-[13px] font-semibold text-amber-900">{T("🧪 وضع التجربة: الدفع هنا تجريبي ببطاقات Tap التجريبية، وما ينخصم أي مبلغ حقيقي.", "🧪 Test mode: payments here use Tap test cards — no real money is charged.")}</p>}
        <button className="btn btn-gold py-3">{T("كمّل للدفع الآمن", "Continue to secure payment")}</button>
        {transfer.length > 0 && <Link href={`/app/pay/transfer?kind=${kind === "managed" ? "managed" : "renew"}`} className="btn btn-outline py-3">🏦 {T("أو ادفع بالتحويل", "Or pay by transfer")}</Link>}
        <Link href="/app/account" className="text-center text-sm text-subtle">{T("رجوع", "Back")}</Link>
      </form>
    </div>
  );
}
