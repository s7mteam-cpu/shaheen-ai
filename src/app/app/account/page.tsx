import { getMoney } from "@/lib/server/money";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlans, getSessionProfile } from "@/lib/data";
import { stripe } from "@/lib/stripe";
import { PasswordForm } from "@/components/app/PasswordForm";
import { DeleteAccount } from "@/components/app/DeleteAccount";
import { CreditHistory } from "@/components/app/CreditHistory";
import { SupportAccess } from "@/components/app/SupportAccess";
import { ACCESS_HOURS, latestAccess } from "@/lib/server/supportAccess";
import { isImpersonating } from "@/lib/server/impersonation";
import { openPortal, saveProfile, setRenewal, startCheckout } from "./actions";
import { CountryOptions } from "@/components/CountryOptions";
import { RenewConsent } from "@/components/app/RenewConsent";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";

export async function generateMetadata() { return { title: (await getLang()) === "en" ? "Account & plan" : "الحساب والاشتراك" }; }
const TABS = { ar: [["sub", "الاشتراك"], ["inv", "الفواتير"], ["me", "بياناتي"]], en: [["sub", "Plan"], ["inv", "Invoices"], ["me", "My details"]] } as const;
const STATUS: Record<"ar" | "en", Record<string, string>> = {
  ar: { expired: "منتهي", active: "نشط", trialing: "تجريبي", past_due: "متأخر الدفع", canceled: "ملغي", paused: "موقوف مؤقتاً", unpaid: "غير مدفوع" },
  en: { expired: "Expired", active: "Active", trialing: "Trial", past_due: "Payment due", canceled: "Canceled", paused: "Paused", unpaid: "Unpaid" },
};

export default async function Account({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string; ok?: string; paid?: string }> }) {
  const { tab = "sub", error, ok, paid } = await searchParams;
  const imp = await isImpersonating();
  const [profile, plans0, lang] = await Promise.all([getSessionProfile(), getPlans(), getLang()]);
  const plans = await localize(plans0, lang);
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const { money } = await getMoney();
  const tabs = TABS[lang];
  const statusAr = STATUS[lang];
  const dateFmt = lang === "en" ? "en-GB" : "ar-KW";
  const align = lang === "en" ? "text-left" : "text-right";
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", profile!.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const plan = plans.find((p) => p.id === profile?.plan_id);

  let invoices: { id: string; date: number; amount: string; status: string; pdf?: string | null }[] = [];
  if (tab === "inv") {
    const { data: tapPaid } = await supabase.from("tap_charges").select("id,amount,currency,created_at,method").eq("user_id", profile!.id).eq("status", "CAPTURED").order("created_at", { ascending: false }).limit(24);
    invoices = (tapPaid ?? []).map((c) => ({ id: c.id, date: new Date(c.created_at).getTime() / 1000, amount: `${Number(c.amount).toFixed(3)} ${c.currency}`, status: "paid" }));
  }
  if (tab === "inv" && profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    const list = await stripe().invoices.list({ customer: profile.stripe_customer_id, limit: 24 });
    invoices = [...invoices, ...list.data.map((i) => ({ id: i.id!, date: i.created, amount: `${(i.amount_paid / 1000).toFixed(3)} ${i.currency.toUpperCase()}`, status: i.status ?? "", pdf: i.invoice_pdf }))];
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="text-[28px] font-bold text-navy-900">{tab === "spend" ? T("مصاريف الريش", "Credit usage") : tab === "access" ? T("صلاحية الدعم", "Support access") : T("الحساب والاشتراك", "Account & plan")}</h1>
      {imp && (tab === "sub" || tab === "inv" || tab === "me") && (
        <p className="rounded-xl bg-navy-800 px-4 py-3 text-sm text-white">{T("🔒 أنت داخل كفريق دعم: بيانات الدفع والبطاقات والفواتير وكلمة المرور وحذف الحساب محمية ومخفية عنك.", "🔒 You are in support mode: payment details, cards, invoices, password and account deletion are protected and hidden.")}</p>
      )}
      {error === "support" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{T("هذا القسم محمي، وما يقدر فريق الدعم يدخل عليه.", "This section is protected and can't be accessed by the support team.")}</p>}
      {error === "payment" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{T("ما تمّت عملية الدفع، وما انخصم منك شي. جرّب مرة ثانية أو بطريقة دفع ثانية.", "The payment didn't go through and you weren't charged. Please try again or use another payment method.")}</p>}
      {paid === "renew" && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{T("✓ وصلت دفعتك، وتجدد اشتراكك شهر كامل.", "✓ Payment received — your plan has been renewed for a full month.")}</p>}
      {ok === "plan" && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{T("✓ تمام، باقتك الجديدة تبدأ من التجديد الجاي، وما ينخصم منك شي الحين.", "✓ Done — your new plan starts at the next renewal. Nothing is charged now.")}</p>}
      {ok === "renew_off" && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{T("✓ أوقفنا التجديد. اشتراكك يظل شغّال لين نهاية الشهر المدفوع، وما ينخصم منك شي بعدها.", "✓ Renewal stopped. Your plan stays active until the end of the paid month, and you won't be charged again.")}</p>}
      {ok === "renew_on" && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{T("✓ رجّعنا التجديد الشهري.", "✓ Monthly renewal is back on.")}</p>}
      {error === "plan" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{T("هذه الباقة غير جاهزة للدفع بعد. تواصل مع الدعم.", "This plan isn't available for payment yet. Please contact support.")}</p>}
      {tab !== "spend" && tab !== "access" && <div role="tablist" aria-label={T("أقسام الحساب", "Account sections")} className="card flex w-full gap-1 overflow-x-auto rounded-2xl p-1 sm:w-auto sm:self-start">
        {tabs.map(([id, l]) => <Link key={id} role="tab" aria-selected={tab === id} href={`/app/account?tab=${id}`} className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-[15px] font-semibold sm:flex-none sm:px-5 ${tab === id ? "bg-navy-800 text-white" : "text-muted"}`}>{l}</Link>)}
      </div>}

      {tab === "sub" && !imp && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-5">
            <section className="flex min-w-0 flex-[2_1_420px] flex-col gap-3 rounded-3xl bg-navy-800 p-7 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{T("باقتك: ", "Your plan: ")}<span className="text-gold-500">{plan?.name ?? T("بدون باقة", "No plan")}</span></h2>
                {sub && <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold">{statusAr[sub.status] ?? sub.status}</span>}
              </div>
              <div className="flex flex-wrap gap-7 text-sm text-white/80">
                {plan && <span>{T("السعر: ", "Price: ")}<strong className="text-white">{Number(plan.price_kwd)} {T("د.ك / شهرياً", "KWD / month")}</strong> {money(Number(plan.price_kwd)).approx ? <span className="opacity-75">(≈ {money(Number(plan.price_kwd)).number} {money(Number(plan.price_kwd)).symbol})</span> : null}</span>}
                <span>{T("الرصيد الحالي: ", "Current balance: ")}<strong className="text-white">{profile?.credits} {T("ريشة", "credits")}</strong></span>
                {sub?.current_period_end && <span>{sub.cancel_at_period_end ? T("ينتهي في", "Ends on") : T("التجديد القادم", "Next renewal")}: <strong className="text-white">{new Date(sub.current_period_end).toLocaleDateString(dateFmt)}</strong></span>}
              </div>
              <p className="text-[13px] text-white/70">{T("ريش الباقة تتجدد كل شهر مع الدفع، والريش غير المستخدمة لا تنتقل للشهر التالي.", "Plan credits renew every month with payment. Unused credits don't roll over.")}</p>
            </section>
            <section className="card flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-7">
              <h2 className="text-lg font-bold">{T("طريقة الدفع والفواتير", "Payment & billing")}</h2>
              {sub?.provider === "tap" && ["active", "past_due"].includes(sub.status) ? (
                <>
                  {sub.pay_method === "card"
                    ? <p className="text-sm leading-7 text-muted">💳 <b className="text-navy-900" dir="ltr">{sub.card_label ?? T("بطاقة محفوظة", "Saved card")}</b><br />{sub.cancel_at_period_end ? T("التجديد موقوف.", "Renewal is off.") : T("يتجدد اشتراكك تلقائياً كل شهر من هذه البطاقة.", "Your plan renews automatically every month from this card.")}</p>
                    : <p className="text-sm leading-7 text-muted">🏦 <b className="text-navy-900">{sub.pay_method === "knet" ? T("كي نت", "KNET") : T("رابط دفع شهري", "Monthly payment link")}</b><br />{sub.cancel_at_period_end ? T("التجديد موقوف.", "Renewal is off.") : T("كي نت ما ينخصم تلقائياً، فيوصلك إشعار فيه رابط الدفع قبل نهاية الشهر بـ3 أيام.", "KNET can't be charged automatically, so you'll get a payment link 3 days before the month ends.")}</p>}
                  {sub.next_plan_id && sub.next_plan_id !== sub.plan_id && <p className="rounded-xl bg-tint px-3 py-2 text-[13px] text-navy-900">{T("من التجديد الجاي: باقة ", "From the next renewal: ")}{plans.find((p) => p.id === sub.next_plan_id)?.name ?? sub.next_plan_id}</p>}
                  {sub.status === "past_due" && <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-800">{T("ما وصلنا دفع هذا الشهر. ادفع خلال 3 أيام من انتهاء الشهر عشان ما يتوقف اشتراكك.", "We haven't received this month's payment. Pay within 3 days of the month ending to keep your plan active.")}</p>}
                  <div className="mt-auto flex flex-col gap-2">
                    {!sub.cancel_at_period_end && (sub.status === "past_due" || sub.pay_method !== "card") && <Link href="/app/pay?kind=renew" className="btn btn-gold w-full py-3">{T("ادفع الشهر الجاي الحين", "Pay next month now")}</Link>}
                    {sub.pay_method !== "card" && !sub.cancel_at_period_end && <Link href="/app/pay?kind=renew" className="text-center text-[12.5px] text-subtle">{T("تبي تجديد تلقائي؟ ادفع مرة بالبطاقة وتنحفظ عند بوابة الدفع.", "Want automatic renewal? Pay once by card and it's saved securely by the payment provider.")}</Link>}
                    <form action={setRenewal.bind(null, Boolean(sub.cancel_at_period_end))}>
                      <button className="btn btn-outline w-full py-3">{sub.cancel_at_period_end ? T("رجّع التجديد الشهري", "Turn renewal back on") : T("أوقف التجديد", "Stop renewal")}</button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">{T("تحديث البطاقة، بيانات الفوترة، أو إلغاء الاشتراك — من بوابة الدفع الآمنة.", "Update your card, billing details, or cancel — through the secure payment portal.")}</p>
                  {profile?.stripe_customer_id && <form action={openPortal} className="mt-auto"><button className="btn btn-outline w-full py-3">{T("إدارة الدفع والاشتراك", "Manage payment & plan")}</button></form>}
                  {!profile?.stripe_customer_id && <p className="mt-auto text-[13px] text-subtle">{T("بعد ما تشترك تطلع هنا طريقة دفعك وتقدر توقف التجديد بأي وقت.", "Once you subscribe, your payment method appears here and you can stop renewal anytime.")}</p>}
                </>
              )}
            </section>
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-navy-900">{plan ? T("غيّر باقتك", "Change plan") : T("اختر باقتك", "Choose a plan")}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <form key={p.id} action={startCheckout.bind(null, p.id)} className={`card flex flex-col gap-2.5 p-5 ${p.id === plan?.id ? "border-2 border-navy-800" : ""}`}>
                  <span className="font-bold">{p.name}</span>
                  <span className="text-sm text-muted">{Number(p.price_kwd)} {T("د.ك", "KWD")} {money(Number(p.price_kwd)).approx ? <span className="opacity-75">(≈ {money(Number(p.price_kwd)).number} {money(Number(p.price_kwd)).symbol})</span> : null} · {p.credits.toLocaleString("en")} {T("ريشة", "credits")}{(p.bonus_credits ?? 0) > 0 ? ` + ${p.bonus_credits!.toLocaleString("en")} ${T("هدية", "bonus")}` : ""}</span>
                  {p.id === plan?.id
                    ? <span className="mt-auto rounded-xl bg-tint py-2.5 text-center text-sm font-bold text-navy-700">{T("باقتك الحالية", "Current plan")}</span>
                    : <div className="mt-auto flex flex-col gap-2.5"><RenewConsent price={Number(p.price_kwd)} /><button className="btn btn-gold py-2.5 text-sm">{plan ? T("التبديل لهذه الباقة", "Switch to this plan") : T("اشترك", "Subscribe")}</button></div>}
                </form>
              ))}
            </div>
          </section>
          {profile?.referral_code && (
            <section className="card flex flex-col gap-2 p-6">
              <h2 className="text-lg font-bold">{T("رابط الدعوة الخاص بك", "Your referral link")}</h2>
              <p className="text-sm text-muted">{T("شارك الرابط، وكل من يشترك عن طريقه ينحسب لك.", "Share this link — everyone who subscribes through it is credited to you.")}</p>
              <code dir="ltr" className="rounded-xl bg-tint px-4 py-3 text-sm">{`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/?ref=${profile.referral_code}`}</code>
            </section>
          )}
        </div>
      )}

      {tab === "inv" && !imp && (
        <section className="card p-2">
          {invoices.length ? (
            <ul>
              {invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1F6] p-3.5 first:border-0">
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold text-navy-900" dir="ltr">{i.amount}</span>
                    <span className="text-[13px] text-subtle">{new Date(i.date * 1000).toLocaleDateString(dateFmt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-800">{i.status === "paid" ? T("مدفوعة", "Paid") : i.status}</span>
                    {i.pdf && <a href={i.pdf} className="font-semibold text-navy-700">{T("تحميل PDF", "Download PDF")}</a>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-subtle">{T("ما فيه فواتير للحين.", "No invoices yet.")}</p>
          )}
        </section>
      )}

      {tab === "spend" && <CreditHistory balance={profile?.credits ?? 0} />}
      {tab === "access" && profile && <SupportAccess access={await latestAccess(profile.id)} hours={ACCESS_HOURS} />}

      {tab === "me" && (
        <div className="grid gap-5 md:grid-cols-2">
          <form action={saveProfile} className="card flex flex-col gap-3 p-6">
            <h2 className="text-lg font-bold">{T("بياناتي", "My details")}</h2>
            <label htmlFor="full_name" className="label">{T("الاسم", "Name")}</label><input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} className="field" />
            <label htmlFor="email" className="label">{T("البريد الإلكتروني", "Email")}</label><input id="email" value={profile?.email ?? ""} readOnly dir="ltr" className={`field ${align} opacity-70`} />
            <label htmlFor="phone" className="label">{T("رقم الواتساب", "WhatsApp number")}</label><input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} dir="ltr" placeholder="+965 5000 0000" className={`field ${align}`} />
            <label htmlFor="country" className="label">{T("الدولة", "Country")}</label>
            <select id="country" name="country" defaultValue={profile?.country ?? "KW"} className="field"><CountryOptions lang={lang} /></select>
            <label htmlFor="instagram" className="label">{T("حساب إنستغرام (لاقتراح أفكار تناسبك)", "Instagram account (for tailored ideas)")}</label><input id="instagram" name="instagram" defaultValue={profile?.instagram ?? ""} dir="ltr" placeholder="@account" className={`field ${align}`} />
            <button className="btn btn-primary self-start px-6 py-2.5">{T("حفظ التغييرات", "Save changes")}</button>
          </form>
          {!imp && <PasswordForm />}
          {!imp && profile?.role !== "admin" && <DeleteAccount />}
        </div>
      )}
    </div>
  );
}
