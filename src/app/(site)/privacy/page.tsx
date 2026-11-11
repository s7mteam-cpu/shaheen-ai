import { getContent } from "@/lib/data";

export const metadata = { title: "سياسة الخصوصية | Privacy Policy" };
export const revalidate = 60;

const UPDATED = "11 نوفمبر 2026";
const EMAIL = "s7m.team@gmail.com";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 mt-10 text-[21px] font-bold text-navy-900">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4">{children}</p>;
const L = ({ items }: { items: React.ReactNode[] }) => <ul className="mb-4 list-disc space-y-2 ps-6">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

/** Full privacy policy (Arabic + English). The admin can still replace it from «المحتوى» → legal.privacy. */
export default async function Page() {
  const c = await getContent();
  const custom = (c.legal?.privacy ?? "").trim();
  if (custom.length > 400 && !custom.startsWith("[")) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-3xl font-bold text-navy-900">سياسة الخصوصية</h1>
        <div className="whitespace-pre-line text-[16px] leading-8 text-muted">{custom}</div>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-[16px] leading-8 text-muted">
      <h1 className="mb-2 text-3xl font-bold text-navy-900">سياسة الخصوصية</h1>
      <p className="mb-8 text-[14px]">آخر تحديث: {UPDATED}</p>

      <P>منصة «شاهين» (shaheen-kw.com) منصة كويتية لإنشاء المحتوى بالذكاء الاصطناعي: تصاميم ومنشورات، فيديوهات، مونتاج، وأصوات. تشرح هذه السياسة البيانات التي نجمعها، وكيف نستخدمها ونحميها، وحقوقك فيها.</P>

      <H>1. البيانات التي نجمعها</H>
      <L items={[
        <><b>بيانات الحساب:</b> الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة)، أو عند الدخول بحساب Google: اسمك وبريدك الإلكتروني وصورة ملفك الشخصي فقط.</>,
        <><b>رقم الواتساب:</b> نطلبه عند التسجيل لنتواصل معك بخصوص حسابك وأعمالك والدعم فقط، ولا نشاركه مع أحد ولا نرسل عليه إعلانات مزعجة.</>,
        <><b>محتواك:</b> الصور والفيديوهات والملفات الصوتية والنصوص التي ترفعها أو تكتبها لاستخدام الأدوات، والنتائج التي تنتجها المنصة لك.</>,
        <><b>هويتك التجارية (اختياري):</b> اسم النشاط والشعار والألوان والخط والحساب ورابط الموقع وحساب إنستغرام وصور مرجعية للأسلوب.</>,
        <><b>بيانات الاستخدام والاشتراك:</b> رصيد «الريش»، والعمليات المنفذة، والفواتير، ورمز الإحالة.</>,
        <><b>بيانات تقنية:</b> ملفات تعريف الارتباط الضرورية لتسجيل الدخول، وسجلات تقنية لحماية الخدمة وإصلاح الأخطاء.</>,
        <><b>الدفع:</b> تتم المدفوعات عبر مزوّد دفع مرخّص، ولا نخزّن بيانات بطاقتك على خوادمنا.</>,
      ]} />

      <H>2. كيف نستخدم البيانات</H>
      <L items={[
        "تشغيل حسابك وتسجيل دخولك، وتقديم الأدوات التي تطلبها وحفظ أعمالك لتعود إليها.",
        "معالجة المحتوى الذي ترسله لإنتاج النتيجة المطلوبة (تصميم، فيديو، صوت…).",
        "إدارة الرصيد والاشتراك والفواتير، والتواصل معك بخصوص حسابك والدعم.",
        "حماية المنصة ومنع إساءة الاستخدام وتحسين جودة الخدمة.",
      ]} />
      <P>لا نبيع بياناتك، ولا نستخدمها للإعلانات، ولا نشاركها إلا بالقدر اللازم لتقديم الخدمة كما هو موضح أدناه.</P>

      <H>3. بيانات حساب Google</H>
      <P>عند الدخول بحساب Google نستلم فقط اسمك وبريدك الإلكتروني وصورة ملفك الشخصي، ونستخدمها حصراً لإنشاء حسابك وتسجيل دخولك وعرض اسمك داخل المنصة. لا نصل إلى بريدك أو ملفاتك أو أي بيانات أخرى في حسابك، ولا ننقل بيانات Google لأي طرف ثالث لأغراض إعلانية. يلتزم استخدامنا للمعلومات المستلمة من واجهات Google بـ<a className="text-navy-700 underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">سياسة بيانات مستخدمي خدمات Google API</a>، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).</P>

      <H>4. مزوّدو الخدمة</H>
      <P>نستعين بمزوّدين موثوقين لتشغيل المنصة، ويعالجون البيانات نيابةً عنا ووفق شروطهم:</P>
      <L items={[
        "الاستضافة وقاعدة البيانات وتخزين الملفات: Vercel و Supabase و Railway.",
        "الذكاء الاصطناعي لمعالجة طلباتك: Anthropic (Claude) لكتابة النصوص والتصاميم، و Google (Gemini) للصور والفيديو، و ElevenLabs للأصوات.",
        "مزوّد الدفع لمعالجة المدفوعات.",
      ]} />
      <P>يُرسل لهؤلاء المزوّدين فقط ما يلزم لتنفيذ طلبك (مثل النص أو الصورة التي ترفعها).</P>

      <H>5. مدة الاحتفاظ والحذف</H>
      <P>نحتفظ ببياناتك وأعمالك طالما حسابك فعّال لتتمكن من الرجوع إليها. يمكنك حذف أي عمل من «أعمالي» في أي وقت، ويمكنك حذف حسابك وكل بياناتك بنفسك من «الحساب والاشتراك» ← «بياناتي» ← «حذف الحساب»، أو بمراسلتنا على {EMAIL} وننفّذ الطلب خلال 30 يوماً، إلا ما يلزمنا القانون بالاحتفاظ به (مثل سجلات الفواتير).</P>

      <H>6. حماية البيانات</H>
      <P>نستخدم اتصالاً مشفّراً (HTTPS)، وتخزيناً خاصاً لا يصل إليه إلا صاحب الحساب عبر روابط مؤقتة، وصلاحيات وصول محدودة. لا يوجد نظام آمن بنسبة 100٪، لكننا نتخذ إجراءات معقولة لحماية بياناتك.</P>
      <P><strong>دخول فريق الدعم:</strong> لا يدخل فريق المنصة على حسابك إلا بعد أن يطلب ذلك وتوافق أنت بتفويض مكتوب من داخل حسابك، ولحل المشكلة المذكورة فقط. ينتهي التفويض تلقائياً بعد 24 ساعة، ويمكنك إلغاؤه في أي وقت، ويُسجَّل كل دخول باسم من دخل وسببه ووقته. هذه الصلاحية لا تشمل بيانات الدفع والبطاقات الائتمانية (محفوظة مشفّرة لدى بوابة الدفع ولا نطّلع عليها) ولا الفواتير ولا كلمة المرور ولا حذف الحساب.</P>

      <H>7. حقوقك</H>
      <P>يحق لك الاطلاع على بياناتك وتصحيحها وتنزيل أعمالك وطلب حذفها، والاعتراض على أي استخدام لا ترغب به. تواصل معنا وسنرد خلال مدة معقولة.</P>

      <H>8. الأطفال</H>
      <P>المنصة موجّهة لمن هم 18 عاماً فأكثر. من هم دون ذلك يستخدمونها فقط بموافقة وليّ الأمر، ولا نجمع عن قصد بيانات من هم دون 13 عاماً.</P>

      <H>9. التعديلات</H>
      <P>قد نحدّث هذه السياسة، وسننشر النسخة الجديدة هنا مع تاريخ التحديث، ونبلغك بالتغييرات الجوهرية.</P>

      <H>10. التواصل</H>
      <P>لأي سؤال عن الخصوصية: {EMAIL} · shaheen-kw.com</P>

      <hr className="my-12 border-line" />

      <div dir="ltr" lang="en" className="text-left">
        <h1 className="mb-2 text-3xl font-bold text-navy-900">Privacy Policy</h1>
        <p className="mb-8 text-[14px]">Last updated: November 11, 2026</p>
        <P>Shaheen (shaheen-kw.com) is a Kuwaiti AI content platform for designs, posts, videos, video editing and voice. This policy explains what data we collect, how we use and protect it, and your rights.</P>

        <H>1. Data we collect</H>
        <L items={[
          <><b>Account data:</b> name, email and password (hashed), or, when you sign in with Google, only your name, email address and profile picture.</>,
          <><b>WhatsApp number:</b> requested at sign-up so we can contact you about your account, your work and support only. We never share it or send spam to it.</>,
          <><b>Your content:</b> images, videos, audio and text you upload or write to use our tools, and the results we generate for you.</>,
          <><b>Brand kit (optional):</b> business name, logo, colours, font, handle, website, Instagram account and style reference images.</>,
          <><b>Usage and billing:</b> credit balance, jobs you run, invoices and referral code.</>,
          <><b>Technical data:</b> essential sign-in cookies and technical logs used to secure the service and fix errors.</>,
          <><b>Payments:</b> processed by a licensed payment provider; we do not store your card details.</>,
        ]} />

        <H>2. How we use data</H>
        <L items={[
          "To run your account, sign you in, provide the tools you request and keep your work so you can return to it.",
          "To process the content you send in order to produce the requested result (design, video, voice…).",
          "To manage credits, subscriptions and invoices, and to contact you about your account and support.",
          "To protect the platform, prevent abuse and improve service quality.",
        ]} />
        <P>We do not sell your data, do not use it for advertising, and only share it as needed to provide the service, as described below.</P>

        <H>3. Google user data</H>
        <P>When you sign in with Google we receive only your name, email address and profile picture, and we use them solely to create your account, sign you in and show your name inside the platform. We do not access your Gmail, Drive or any other Google data, and we do not transfer Google user data to third parties for advertising. Shaheen&apos;s use and transfer of information received from Google APIs adheres to the <a className="text-navy-700 underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</P>

        <H>4. Service providers</H>
        <L items={[
          "Hosting, database and file storage: Vercel, Supabase and Railway.",
          "AI processing of your requests: Anthropic (Claude) for text and design, Google (Gemini) for images and video, ElevenLabs for voice.",
          "A payment provider for processing payments.",
        ]} />
        <P>These providers only receive what is needed to fulfil your request (for example the text or image you upload) and process it on our behalf under their own terms.</P>

        <H>5. Retention and deletion</H>
        <P>We keep your data and work while your account is active. You can delete any item from “My works” at any time, and you can request deletion of your account and all your data by emailing {EMAIL}; we complete it within 30 days, except records we must keep by law (such as invoices).</P>

        <H>6. Security</H>
        <P>We use encrypted connections (HTTPS), private storage reachable only by the account owner through short-lived links, and limited access permissions. No system is 100% secure, but we take reasonable measures to protect your data.</P>
        <P><strong>Support access:</strong> our team accesses your account only after asking and receiving your written approval inside your account, and only to fix the stated problem. The approval expires automatically after 24 hours and you can withdraw it at any time. Every access is logged with who, why and when. This access never covers payment or card details (held encrypted by the payment provider, never by us), invoices, your password or account deletion.</P>

        <H>7. Your rights</H>
        <P>You can access, correct, download and request deletion of your data, and object to any use you do not want. Contact us and we will respond within a reasonable time.</P>

        <H>8. Children</H>
        <P>The platform is intended for users aged 18 or over. Younger users may use it only with a parent’s or guardian’s consent, and we do not knowingly collect data from children under 13.</P>

        <H>9. Changes</H>
        <P>We may update this policy; the new version will be posted here with its date, and we will notify you of material changes.</P>

        <H>10. Contact</H>
        <P>Privacy questions: {EMAIL} · shaheen-kw.com</P>
      </div>
    </main>
  );
}
