import Link from "next/link";
import { redirect } from "next/navigation";
import { payNow } from "@/app/app/account/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContent, getSessionProfile } from "@/lib/data";
import { tapEnabled } from "@/lib/tap";

/** The link in the monthly reminder (KNET) and in «باقة الإدارة الكاملة»: shows what will be paid, then goes to Tap. */
export default async function Pay({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind = "renew" } = await searchParams;
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!tapEnabled()) redirect("/app/account");
  const admin = createAdminClient();

  let title: string, amount: number, note: string;
  if (kind === "managed") {
    const c = await getContent();
    title = c.managed_service?.title || "باقة الإدارة الكاملة";
    amount = Number(c.managed_service?.price_kwd || 0);
    note = "دفعة لمرة وحدة لهذا الشهر. فريقنا يتواصل معك على الواتساب بعد الدفع.";
  } else {
    const { data: sub } = await admin.from("subscriptions").select("*").eq("id", `tap_${profile.id}`).maybeSingle();
    if (!sub || !["active", "past_due"].includes(sub.status)) redirect("/app/account");
    const { data: plan } = await admin.from("plans").select("name,price_kwd").eq("id", sub.next_plan_id || sub.plan_id).single();
    title = `تجديد ${plan?.name ?? ""}`;
    amount = Number(plan?.price_kwd ?? 0);
    note = sub.current_period_end
      ? `يمتد اشتراكك شهر كامل من ${new Date(sub.current_period_end).toLocaleDateString("ar-KW")}، فما تخسر أي يوم لو دفعت قبل الموعد.`
      : "يمتد اشتراكك شهر كامل.";
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-8">
      <h1 className="text-[26px] font-bold text-navy-900">الدفع</h1>
      <form action={payNow.bind(null, kind === "managed" ? "managed" : "renew")} className="card flex flex-col gap-3 p-6">
        <span className="text-lg font-bold">{title}</span>
        <span className="text-2xl font-bold text-navy-900">{amount} د.ك</span>
        <p className="text-sm leading-7 text-muted">{note}</p>
        <p className="rounded-xl bg-tint p-3 text-[13px] leading-6 text-navy-900">تقدر تدفع بـ<b>كي نت</b> أو <b>فيزا / ماستر كارد</b> أو <b>Apple Pay</b> من صفحة الدفع الآمنة. بيانات بطاقتك عند بوابة الدفع، وما تنحفظ عندنا.</p>
        <button className="btn btn-gold py-3">كمّل للدفع الآمن</button>
        <Link href="/app/account" className="text-center text-sm text-subtle">رجوع</Link>
      </form>
    </div>
  );
}
