import { getContent } from "@/lib/data";

export const metadata = { title: "شروط الاستخدام | Terms of Service" };
export const revalidate = 60;

const EMAIL = "s7m.team@gmail.com";
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 mt-10 text-[21px] font-bold text-navy-900">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4">{children}</p>;

/** Terms of service (Arabic + English). The admin can still replace it from «المحتوى» → legal.terms. */
export default async function Page() {
  const c = await getContent();
  const custom = (c.legal?.terms ?? "").trim();
  if (custom.length > 400 && !custom.startsWith("[")) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-3xl font-bold text-navy-900">شروط الاستخدام</h1>
        <div className="whitespace-pre-line text-[16px] leading-8 text-muted">{custom}</div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[16px] leading-8 text-muted">
      <h1 className="mb-2 text-3xl font-bold text-navy-900">شروط الاستخدام</h1>
      <p className="mb-8 text-[14px]">آخر تحديث: 11 نوفمبر 2026</p>
      <P>باستخدامك منصة «شاهين» (shaheen-kw.com) فإنك توافق على هذه الشروط.</P>

      <H>1. الخدمة</H>
      <P>شاهين منصة لإنشاء المحتوى بالذكاء الاصطناعي (تصاميم، منشورات، فيديوهات، مونتاج، أصوات). النتائج يولّدها الذكاء الاصطناعي وقد تحتاج مراجعتك قبل النشر.</P>

      <H>2. الحساب</H>
      <P>أنت مسؤول عن صحة بياناتك وعن سرية حسابك وعن كل ما يتم من خلاله. يجب أن يكون عمرك 18 عاماً على الأقل، أو أن تستخدم المنصة بموافقة وليّ أمرك وتحت إشرافه.</P>

      <H>3. الاشتراكات والرصيد</H>
      <P>تستخدم الأدوات رصيد «الريش» حسب الباقة. تُوضَّح تكلفة كل أداة قبل التنفيذ، وإذا فشل الطلب يُعاد الرصيد تلقائياً. تخضع المبالغ المدفوعة لـ<a className="text-navy-700 underline" href="/refund">سياسة الاسترجاع</a>.</P>

      <H>4. محتواك وحقوقك</H>
      <P>تبقى ملكية المحتوى الذي ترفعه لك، وتمنحنا إذناً محدوداً لمعالجته بالقدر اللازم لتقديم الخدمة. النتائج التي تنتجها لك المنصة يحق لك استخدامها تجارياً، مع مسؤوليتك عن مراجعتها.</P>

      <H>5. الاستخدام المقبول</H>
      <P>يُمنع استخدام المنصة في: محتوى مخالف للقانون أو للآداب العامة، انتهاك حقوق الملكية الفكرية أو صور الآخرين دون إذن، التضليل أو انتحال الشخصيات، أو أي ضرر بالآخرين. يحق لنا إيقاف الحسابات المخالفة.</P>

      <H>6. حدود المسؤولية</H>
      <P>تُقدَّم الخدمة «كما هي». لا نضمن خلوّ النتائج من الأخطاء، ولا نتحمل مسؤولية الأضرار غير المباشرة الناتجة عن استخدامها، في حدود ما يسمح به القانون.</P>

      <H>7. التعديلات والقانون</H>
      <P>قد نعدّل هذه الشروط وننشر النسخة الجديدة هنا. تخضع هذه الشروط لقوانين دولة الكويت. للتواصل: {EMAIL}</P>

      <hr className="my-12 border-line" />

      <div dir="ltr" lang="en" className="text-left">
        <h1 className="mb-2 text-3xl font-bold text-navy-900">Terms of Service</h1>
        <p className="mb-8 text-[14px]">Last updated: November 11, 2026</p>
        <P>By using Shaheen (shaheen-kw.com) you agree to these terms.</P>
        <H>1. The service</H>
        <P>Shaheen is an AI content platform (designs, posts, videos, video editing, voice). Results are AI-generated and may need your review before publishing.</P>
        <H>2. Your account</H>
        <P>You are responsible for accurate account details, keeping your account secure and all activity under it. You must be at least 18 years old, or use the platform with the consent and supervision of a parent or guardian.</P>
        <H>3. Plans and credits</H>
        <P>Tools use “feather” credits according to your plan. Each tool shows its cost before running, and credits are refunded automatically if a job fails. Payments are subject to our <a className="text-navy-700 underline" href="/refund">refund policy</a>.</P>
        <H>4. Your content</H>
        <P>You keep ownership of the content you upload and grant us a limited permission to process it only as needed to provide the service. You may use the results commercially and are responsible for reviewing them.</P>
        <H>5. Acceptable use</H>
        <P>Do not use Shaheen for unlawful content, infringing intellectual property or other people&apos;s images without permission, deception or impersonation, or harming others. We may suspend accounts that break these rules.</P>
        <H>6. Liability</H>
        <P>The service is provided “as is”. We do not guarantee error-free results and are not liable for indirect damages arising from their use, to the extent permitted by law.</P>
        <H>7. Changes and law</H>
        <P>We may update these terms and will post the new version here. These terms are governed by the laws of the State of Kuwait. Contact: {EMAIL}</P>
      </div>
    </main>
  );
}
