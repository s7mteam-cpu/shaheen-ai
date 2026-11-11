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
import { openPortal, saveProfile, startCheckout } from "./actions";

export const metadata = { title: "الحساب والاشتراك" };
const tabs = [["sub", "الاشتراك"], ["inv", "الفواتير"], ["me", "بياناتي"]] as const;
const statusAr: Record<string, string> = { active: "نشط", trialing: "تجريبي", past_due: "متأخر الدفع", canceled: "ملغي", paused: "موقوف مؤقتاً", unpaid: "غير مدفوع" };

export default async function Account({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  const { tab = "sub", error } = await searchParams;
  const imp = await isImpersonating();
  const [profile, plans] = await Promise.all([getSessionProfile(), getPlans()]);
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", profile!.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const plan = plans.find((p) => p.id === profile?.plan_id);

  let invoices: { id: string; date: number; amount: string; status: string; pdf?: string | null }[] = [];
  if (tab === "inv" && profile?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    const list = await stripe().invoices.list({ customer: profile.stripe_customer_id, limit: 24 });
    invoices = list.data.map((i) => ({ id: i.id!, date: i.created, amount: `${(i.amount_paid / 1000).toFixed(3)} ${i.currency.toUpperCase()}`, status: i.status ?? "", pdf: i.invoice_pdf }));
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <h1 className="text-[28px] font-bold text-navy-900">{tab === "spend" ? "مصاريف الريش" : tab === "access" ? "صلاحية الدعم" : "الحساب والاشتراك"}</h1>
      {imp && (tab === "sub" || tab === "inv" || tab === "me") && (
        <p className="rounded-xl bg-navy-800 px-4 py-3 text-sm text-white">🔒 أنت داخل كفريق دعم: بيانات الدفع والبطاقات والفواتير وكلمة المرور وحذف الحساب محمية ومخفية عنك.</p>
      )}
      {error === "support" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">هذا القسم محمي، وما يقدر فريق الدعم يدخل عليه.</p>}
      {error === "plan" && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">هذه الباقة غير جاهزة للدفع بعد. تواصل مع الدعم.</p>}
      {tab !== "spend" && tab !== "access" && <div role="tablist" aria-label="أقسام الحساب" className="card flex w-full gap-1 overflow-x-auto rounded-2xl p-1 sm:w-auto sm:self-start">
        {tabs.map(([id, l]) => <Link key={id} role="tab" aria-selected={tab === id} href={`/app/account?tab=${id}`} className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-[15px] font-semibold sm:flex-none sm:px-5 ${tab === id ? "bg-navy-800 text-white" : "text-muted"}`}>{l}</Link>)}
      </div>}

      {tab === "sub" && !imp && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-5">
            <section className="flex min-w-0 flex-[2_1_420px] flex-col gap-3 rounded-3xl bg-navy-800 p-7 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">باقتك: <span className="text-gold-500">{plan?.name ?? "بدون باقة"}</span></h2>
                {sub && <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold">{statusAr[sub.status] ?? sub.status}</span>}
              </div>
              <div className="flex flex-wrap gap-7 text-sm text-white/80">
                {plan && <span>السعر: <strong className="text-white">{Number(plan.price_kwd)} د.ك / شهرياً</strong></span>}
                <span>الرصيد الحالي: <strong className="text-white">{profile?.credits} ريشة</strong></span>
                {sub?.current_period_end && <span>{sub.cancel_at_period_end ? "ينتهي في" : "التجديد القادم"}: <strong className="text-white">{new Date(sub.current_period_end).toLocaleDateString("ar-KW")}</strong></span>}
              </div>
              <p className="text-[13px] text-white/70">ريش الباقة تتجدد كل شهر مع الدفع، والريش غير المستخدمة لا تنتقل للشهر التالي.</p>
            </section>
            <section className="card flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-7">
              <h2 className="text-lg font-bold">طريقة الدفع والفواتير</h2>
              <p className="text-sm text-muted">تحديث البطاقة، بيانات الفوترة، أو إلغاء الاشتراك — من بوابة الدفع الآمنة.</p>
              <form action={openPortal} className="mt-auto"><button className="btn btn-outline w-full py-3">إدارة الدفع والاشتراك</button></form>
            </section>
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-navy-900">{plan ? "غيّر باقتك" : "اختر باقتك"}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((p) => (
                <form key={p.id} action={startCheckout.bind(null, p.id)} className={`card flex flex-col gap-2.5 p-5 ${p.id === plan?.id ? "border-2 border-navy-800" : ""}`}>
                  <span className="font-bold">{p.name}</span>
                  <span className="text-sm text-muted">{Number(p.price_kwd)} د.ك · {p.credits.toLocaleString("en")} ريشة{(p.bonus_credits ?? 0) > 0 ? ` + ${p.bonus_credits!.toLocaleString("en")} هدية` : ""}</span>
                  {p.id === plan?.id
                    ? <span className="mt-auto rounded-xl bg-tint py-2.5 text-center text-sm font-bold text-navy-700">باقتك الحالية</span>
                    : <button className="btn btn-gold mt-auto py-2.5 text-sm">{plan ? "التبديل لهذه الباقة" : "اشترك"}</button>}
                </form>
              ))}
            </div>
          </section>
          {profile?.referral_code && (
            <section className="card flex flex-col gap-2 p-6">
              <h2 className="text-lg font-bold">رابط الدعوة الخاص بك</h2>
              <p className="text-sm text-muted">شارك الرابط، وكل من يشترك عن طريقه ينحسب لك.</p>
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
                    <span className="text-[13px] text-subtle">{new Date(i.date * 1000).toLocaleDateString("ar-KW")}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-bold text-emerald-800">{i.status === "paid" ? "مدفوعة" : i.status}</span>
                    {i.pdf && <a href={i.pdf} className="font-semibold text-navy-700">تحميل PDF</a>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-subtle">ما فيه فواتير للحين.</p>
          )}
        </section>
      )}

      {tab === "spend" && <CreditHistory balance={profile?.credits ?? 0} />}
      {tab === "access" && profile && <SupportAccess access={await latestAccess(profile.id)} hours={ACCESS_HOURS} />}

      {tab === "me" && (
        <div className="grid gap-5 md:grid-cols-2">
          <form action={saveProfile} className="card flex flex-col gap-3 p-6">
            <h2 className="text-lg font-bold">بياناتي</h2>
            <label htmlFor="full_name" className="label">الاسم</label><input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} className="field" />
            <label htmlFor="email" className="label">البريد الإلكتروني</label><input id="email" value={profile?.email ?? ""} readOnly dir="ltr" className="field text-right opacity-70" />
            <label htmlFor="phone" className="label">رقم الواتساب</label><input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} dir="ltr" placeholder="+965 5000 0000" className="field text-right" />
            <label htmlFor="instagram" className="label">حساب إنستغرام (لاقتراح أفكار تناسبك)</label><input id="instagram" name="instagram" defaultValue={profile?.instagram ?? ""} dir="ltr" placeholder="@account" className="field text-right" />
            <button className="btn btn-primary self-start px-6 py-2.5">حفظ التغييرات</button>
          </form>
          {!imp && <PasswordForm />}
          {!imp && profile?.role !== "admin" && <DeleteAccount />}
        </div>
      )}
    </div>
  );
}
