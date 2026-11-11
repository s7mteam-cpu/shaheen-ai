import Link from "next/link";
import { getContent } from "@/lib/data";

export const metadata = { title: "سياسة الاسترجاع والإلغاء | Refund & Cancellation Policy" };
export const revalidate = 60;

const EMAIL = "s7m.team@gmail.com";
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 mt-10 text-[21px] font-bold text-navy-900">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4">{children}</p>;
const L = ({ items }: { items: React.ReactNode[] }) => <ul className="mb-4 list-disc space-y-1.5 ps-6">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => <Link className="text-navy-700 underline" href={href}>{children}</Link>;

/** Refund & cancellation policy (Arabic + English). The admin can still replace it from «المحتوى» → legal.refund. */
export default async function Page() {
  const c = await getContent();
  const custom = (c.legal?.refund ?? "").trim();
  if (custom.length > 400 && !custom.startsWith("[")) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-3xl font-bold text-navy-900">سياسة الاسترجاع والإلغاء</h1>
        <div className="whitespace-pre-line text-[16px] leading-8 text-muted">{custom}</div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[16px] leading-8 text-muted">
      <h1 className="mb-2 text-3xl font-bold text-navy-900">سياسة الاسترجاع والإلغاء</h1>
      <p className="mb-8 text-[14px]">آخر تحديث: 11 نوفمبر 2026</p>

      <div className="mb-8 rounded-2xl bg-canvas p-5 text-navy-900">
        <p className="mb-2 font-bold">باختصار</p>
        <L items={[
          "تقدر تلغي اشتراكك بأي وقت، ويظل فعّالاً لنهاية الشهر المدفوع.",
          "استرداد كامل خلال 14 يوماً من الدفع، إذا ما استخدمت أي ريشة من هذه الدفعة.",
          "إذا فشل أي عمل، ترجع ريشه لرصيدك تلقائياً وفوراً.",
          "الريش المستخدمة لا تُسترد، لأن الخدمة الرقمية تكون قد قُدّمت.",
        ]} />
      </div>

      <H>1. الاشتراكات والتجديد</H>
      <P>باقات شاهين اشتراكات شهرية تتجدد تلقائياً في نفس اليوم من كل شهر، ويُخصم سعر الباقة من طريقة الدفع المحفوظة. مع كل تجديد يُشحن رصيدك بريش الباقة، وأي ريش هدية مرتبطة بها.</P>

      <H>2. إلغاء الاشتراك</H>
      <P>تقدر تلغي التجديد بأي وقت من <A href="/app/account">الحساب والاشتراك</A>. بعد الإلغاء يظل اشتراكك ورصيدك فعّالين حتى نهاية الشهر المدفوع، ولا يُخصم منك أي مبلغ بعدها. الإلغاء وحده لا يعني استرداد مبلغ الشهر الحالي، إلا في الحالة الموضّحة في البند 3.</P>

      <H>3. حق الاسترداد خلال 14 يوماً</H>
      <P>يحق لك طلب استرداد كامل لمبلغ الاشتراك (الأول أو أي تجديد) خلال 14 يوماً من تاريخ الدفع، بشرط ألا تكون استخدمت أي ريشة من رصيد هذه الدفعة. عند قبول الطلب يُلغى الاشتراك ويُسحب رصيد تلك الدفعة.</P>

      <H>4. الريش المستخدمة</H>
      <P>عند تنفيذ أي أداة تُقدَّم لك الخدمة الرقمية فوراً (تصميم، فيديو، صوت…)، لذلك لا تُسترد قيمة الريش المستخدمة، ولا يُسترد جزء من مبلغ الاشتراك مقابل الريش المتبقية بعد بدء الاستخدام. تعرض كل أداة تكلفتها بالريش قبل التنفيذ، وتقدر تتابع كل ما صرفته من صفحة <A href="/app/account?tab=spend">مصاريف الريش</A>.</P>

      <H>5. الأعمال التي تفشل أو فيها خلل</H>
      <L items={[
        "إذا فشل تنفيذ أي عمل لأي سبب تقني، تُعاد ريشه إلى رصيدك تلقائياً ومباشرة، وتظهر في «مصاريف الريش».",
        "إذا ظهرت نتيجة فيها خلل تقني واضح من المنصة (ملف تالف، فيديو لا يعمل، أو نتيجة لا تطابق الأداة المطلوبة)، تواصل معنا خلال 7 أيام، ونعيد لك الريش أو ننفّذ العمل من جديد.",
        "اختلاف الذوق في نتيجة سليمة تقنياً لا يُعد خللاً، وتقدر تعدّل عملك بتكلفة التعديل الموضّحة في الأداة.",
      ]} />

      <H>6. رصيد الريش</H>
      <L items={[
        "ريش الباقة صالحة خلال شهر الاشتراك، ولا تنتقل للشهر التالي.",
        "الريش ليس لها قيمة نقدية، ولا تُستبدل بمال، ولا تُحوّل لحساب آخر.",
        "ريش الهدية والمكافآت مجانية، ولا تُسترد ولا تُحتسب ضمن أي مبلغ مسترد.",
      ]} />

      <H>7. تغيير الباقة</H>
      <P>تقدر ترقّي باقتك أو تخفّضها من صفحة الحساب. تُطبّق التغييرات حسب ما تعرضه بوابة الدفع وقت التغيير، بما في ذلك أي فرق في السعر للفترة المتبقية.</P>

      <H>8. حذف الحساب</H>
      <P>حذف الحساب نهائي، ويحذف رصيد الريش وجميع أعمالك وطرق الدفع المحفوظة ويلغي الاشتراك. حذف الحساب بحد ذاته لا يعني استرداد أي مبلغ؛ إذا كنت مستحقاً للاسترداد حسب البند 3، اطلبه قبل حذف حسابك.</P>

      <H>9. باقة الإدارة الكاملة للسوشال ميديا</H>
      <P>هذه الخدمة يقدّمها فريق بشري. يحق لك استرداد كامل قبل بدء العمل على حسابك. بعد بدء العمل يُلغى التجديد القادم عند طلبك، ولا يُسترد مبلغ الشهر الجاري.</P>

      <H>10. طريقة طلب الاسترداد</H>
      <P>راسلنا على {EMAIL} أو عبر «التواصل مع الدعم» داخل المنصة، واذكر البريد المسجّل في حسابك وتاريخ الدفع. نرد خلال يومي عمل، وبعد الموافقة يُعاد المبلغ بنفس طريقة الدفع خلال 7 أيام عمل. قد يختلف وقت ظهور المبلغ في حسابك حسب البنك.</P>

      <H>11. القانون المطبّق</H>
      <P>تخضع هذه السياسة لقوانين دولة الكويت، ولا تنتقص من أي حق يمنحه لك القانون كمستهلك. راجع أيضاً <A href="/terms">شروط الاستخدام</A> و<A href="/privacy">سياسة الخصوصية</A>.</P>

      <hr className="my-12 border-line" />

      <div dir="ltr" lang="en" className="text-left">
        <h1 className="mb-2 text-3xl font-bold text-navy-900">Refund &amp; Cancellation Policy</h1>
        <p className="mb-8 text-[14px]">Last updated: November 11, 2026</p>

        <div className="mb-8 rounded-2xl bg-canvas p-5 text-navy-900">
          <p className="mb-2 font-bold">In short</p>
          <L items={[
            "Cancel anytime; your plan stays active until the end of the paid month.",
            "Full refund within 14 days of a payment if no credits from that payment were used.",
            "If a job fails, its credits return to your balance automatically.",
            "Used credits are not refundable, because the digital service has been delivered.",
          ]} />
        </div>

        <H>1. Subscriptions and renewal</H>
        <P>Shaheen plans are monthly subscriptions that renew automatically on the same day each month, charged to your saved payment method. Each renewal tops up your balance with the plan’s credits plus any bonus credits.</P>
        <H>2. Cancelling</H>
        <P>You can cancel renewal at any time from <A href="/app/account">Account &amp; subscription</A>. Your plan and credits stay active until the end of the paid month and you will not be charged again. Cancelling alone does not refund the current month, except as described in section 3.</P>
        <H>3. 14-day refund right</H>
        <P>You may request a full refund of a subscription payment (first payment or any renewal) within 14 days of that payment, provided no credits from that payment have been used. Once approved, the subscription is cancelled and that payment’s credits are removed.</P>
        <H>4. Used credits</H>
        <P>Running a tool delivers the digital service immediately, so used credits are not refundable, and no partial refund is given for unused credits once usage has started. Every tool shows its cost before running, and you can review all usage under <A href="/app/account?tab=spend">Credit spending</A>.</P>
        <H>5. Failed or faulty jobs</H>
        <L items={[
          "If a job fails for any technical reason, its credits are returned to your balance automatically.",
          "If a result has a clear technical fault caused by the platform (corrupted file, video that won’t play, or a result that doesn’t match the tool), contact us within 7 days and we will restore the credits or redo the job.",
          "A technically sound result that doesn’t match your taste is not a fault; you can edit it at the edit cost shown in the tool.",
        ]} />
        <H>6. Credits</H>
        <L items={[
          "Plan credits are valid during the subscription month and do not roll over.",
          "Credits have no cash value, cannot be exchanged for money and cannot be transferred.",
          "Bonus and reward credits are free and are not refundable or counted in any refund.",
        ]} />
        <H>7. Changing plans</H>
        <P>You can upgrade or downgrade from your account page. Changes apply as shown by the payment portal at the time, including any price difference for the remaining period.</P>
        <H>8. Deleting your account</H>
        <P>Account deletion is permanent and removes your credits, all your work and saved payment methods, and cancels your subscription. Deleting your account does not by itself trigger a refund; if you qualify under section 3, request it before deleting.</P>
        <H>9. Managed social media service</H>
        <P>This service is delivered by our team. You are entitled to a full refund before work on your account starts. After work starts, we cancel the next renewal on request, but the current month is not refunded.</P>
        <H>10. How to request a refund</H>
        <P>Email {EMAIL} or use “Contact support” in the app, with your account email and payment date. We reply within 2 business days; approved refunds are returned to the original payment method within 7 business days. Your bank may take longer to show it.</P>
        <H>11. Governing law</H>
        <P>This policy is governed by the laws of the State of Kuwait and does not limit any rights you have as a consumer under the law. See also our <A href="/terms">Terms of Service</A> and <A href="/privacy">Privacy Policy</A>.</P>
      </div>
    </main>
  );
}
