import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanInstaSession, INSTA_DAILY_CAP, INSTA_USER_CAP } from "@/lib/instaRead";
import { InstaForm } from "./InstaForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "زيارة حسابات إنستغرام" };

/** «شاهين يزور حساب العميل»: the switch and the platform's own Instagram session (a separate account, never the owner's main one). */
export default async function InstaPage() {
  await guardPage("ai");
  const { data } = await createAdminClient().from("admin_secrets").select("value").eq("key", "insta_session").maybeSingle();
  const s = cleanInstaSession(data?.value);
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">← مركز الذكاء الاصطناعي</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">زيارة حسابات إنستغرام</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">لما العميل يضغط «حلّل حسابي»، متصفح شاهين يفتح ملفه مثل أي زائر ويصوّره ويقرأ نصه، وشاهين يحلل. إذا طفّيته يرجع العميل يلصق أو يرفع لقطات بنفسه.</p>
      </div>
      <div className="card flex flex-col gap-2 p-5 text-[14px] leading-7 text-muted">
        <p className="font-bold text-navy-900">كيف تجهّزه (مرة وحدة)</p>
        <ol className="list-decimal ps-5">
          <li>سوّ حساب إنستغرام <b>منفصل</b> (مو حسابك الموثق)، لأن إنستغرام ممكن يقيّد أي حساب يتصفح آلياً.</li>
          <li>سجّل دخول فيه من متصفح كروم على الكمبيوتر.</li>
          <li>افتح أدوات المطوّر (F12) ← Application ← Cookies ← instagram.com، وانسخ قيمة <b dir="ltr">sessionid</b>.</li>
          <li>الصقها بالخانة تحت، وشغّل المفتاح، واحفظ. القيمة ما تنعرض مرة ثانية ولا تطلع للعملاء.</li>
        </ol>
        <p>الحد: {INSTA_DAILY_CAP} زيارة باليوم لكل المنصة، و{INSTA_USER_CAP} للعميل الواحد. الحسابات الخاصة ما تنفتح، والعميل يرجع يرفع لقطات.</p>
      </div>
      <p className="text-sm font-semibold">الحالة الحالية: {s.on ? "🟢 مشغّلة" : s.sessionid ? "⚪ موقوفة (الجلسة محفوظة)" : "⚪ موقوفة (ما في جلسة)"}</p>
      <InstaForm on={s.on} has={!!s.sessionid} bad={!!s.bad} />
    </div>
  );
}
