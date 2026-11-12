/**
 * The legal pages (terms / privacy / refund), in Arabic and English.
 * These are only the starting texts: the admin edits them from «نصوص وصور الموقع ← الصفحات القانونية»,
 * and the public pages always show whatever is saved there.
 *
 * Simple writing rules (the same ones shown to the admin):
 *   ## عنوان          → a section heading
 *   - نقطة            → a bullet point
 *   > سطر             → a highlighted box (e.g. «باختصار»)
 *   **كلمة**          → bold
 *   [نص](/رابط)       → a link
 *   {email} {whatsapp} {refund_days} {managed_price} {site} → filled in automatically from the other settings,
 *   so changing a number in one place changes it on every page.
 */

export const TERMS_AR = `باستخدامك منصة «شاهين» ({site}) فإنك توافق على هذه الشروط.

## 1. الخدمة
شاهين منصة لإنشاء المحتوى بالذكاء الاصطناعي (تصاميم، منشورات، فيديوهات، مونتاج، أصوات). النتائج يولّدها الذكاء الاصطناعي وقد تحتاج مراجعتك قبل النشر.

## 2. الحساب
أنت مسؤول عن صحة بياناتك وعن سرية حسابك وعن كل ما يتم من خلاله. يجب أن يكون عمرك 18 عاماً على الأقل، أو أن تستخدم المنصة بموافقة وليّ أمرك وتحت إشرافه. لا تدخل إدارة المنصة على حسابك إلا بموافقتك المكتوبة من داخل حسابك، لمدة محدودة، ويُسجَّل كل دخول.

## 3. الاشتراكات والرصيد
الاشتراك شهري، وتوافق على طريقة التجديد بعلامة صح قبل الدفع: إذا دفعت بالبطاقة أو Apple Pay تُحفظ بطاقتك لدى بوابة الدفع (لا لدينا) وتُخصم قيمة الباقة منها تلقائياً كل شهر في نفس تاريخ الاشتراك. وإذا دفعت بكي نت، لأن كي نت لا يسمح بالخصم التلقائي، يصلك إشعار فيه رابط الدفع قبل نهاية الشهر بثلاثة أيام. إذا لم يُدفع الشهر الجديد يتوقف الاشتراك بعد مهلة ثلاثة أيام، ويبقى حسابك وأعمالك محفوظة. تقدر توقف التجديد بأي وقت من صفحة الحساب، ويبقى اشتراكك فعّالاً حتى نهاية الشهر المدفوع.

تستخدم الأدوات رصيد «الريش» حسب الباقة. تُوضَّح تكلفة كل أداة قبل التنفيذ، وإذا فشل الطلب يُعاد الرصيد تلقائياً. تخضع المبالغ المدفوعة لـ[سياسة الاسترجاع](/refund).

## 4. محتواك وحقوقك
تبقى ملكية المحتوى الذي ترفعه لك، وتمنحنا إذناً محدوداً لمعالجته بالقدر اللازم لتقديم الخدمة. النتائج التي تنتجها لك المنصة يحق لك استخدامها تجارياً، مع مسؤوليتك عن مراجعتها.

## 5. الاستخدام المقبول
يُمنع استخدام المنصة في: محتوى مخالف للقانون أو للآداب العامة، انتهاك حقوق الملكية الفكرية أو صور الآخرين دون إذن، التضليل أو انتحال الشخصيات، أو أي ضرر بالآخرين. يحق لنا إيقاف الحسابات المخالفة أو حذفها، ومنع بريدها من التسجيل مرة ثانية.

## 6. حدود المسؤولية
تُقدَّم الخدمة «كما هي». لا نضمن خلوّ النتائج من الأخطاء، ولا نتحمل مسؤولية الأضرار غير المباشرة الناتجة عن استخدامها، في حدود ما يسمح به القانون.

## 7. التعديلات والقانون
قد نعدّل هذه الشروط وننشر النسخة الجديدة هنا. تخضع هذه الشروط لقوانين دولة الكويت. للتواصل: {email}`;

export const TERMS_EN = `By using Shaheen ({site}) you agree to these terms.

## 1. The service
Shaheen is an AI content platform (designs, posts, videos, video editing, voice). Results are AI-generated and may need your review before publishing.

## 2. Your account
You are responsible for accurate account details, keeping your account secure and all activity under it. You must be at least 18 years old, or use the platform with the consent and supervision of a parent or guardian. Platform administrators access your account only with your written approval given inside your account, for a limited time, and every access is logged.

## 3. Plans and credits
Plans are monthly, and you agree to how renewal works with a checkbox before paying. If you pay by card or Apple Pay, your card is saved by the payment provider (not by us) and the plan price is charged to it automatically every month on your subscription date. If you pay with KNET, which does not allow automatic charges, you receive a payment link three days before the month ends. If a new month is not paid, the plan stops after a three-day grace period; your account and work are kept. You can stop renewal at any time from your account page, and your plan stays active until the end of the paid month.

Tools use “feather” credits according to your plan. Each tool shows its cost before running, and credits are refunded automatically if a job fails. Payments are subject to our [refund policy](/refund).

## 4. Your content
You keep ownership of the content you upload and grant us a limited permission to process it only as needed to provide the service. You may use the results commercially and are responsible for reviewing them.

## 5. Acceptable use
Do not use Shaheen for unlawful content, infringing intellectual property or other people's images without permission, deception or impersonation, or harming others. We may suspend or delete accounts that break these rules and block their email from signing up again.

## 6. Liability
The service is provided “as is”. We do not guarantee error-free results and are not liable for indirect damages arising from their use, to the extent permitted by law.

## 7. Changes and law
We may update these terms and will post the new version here. These terms are governed by the laws of the State of Kuwait. Contact: {email}`;

export const PRIVACY_AR = `منصة «شاهين» ({site}) منصة كويتية لإنشاء المحتوى بالذكاء الاصطناعي: تصاميم ومنشورات، فيديوهات، مونتاج، وأصوات. تشرح هذه السياسة البيانات التي نجمعها، وكيف نستخدمها ونحميها، وحقوقك فيها.

## 1. البيانات التي نجمعها
- **بيانات الحساب:** الاسم والبريد الإلكتروني وكلمة المرور (مشفّرة)، أو عند الدخول بحساب Google: اسمك وبريدك الإلكتروني وصورة ملفك الشخصي فقط.
- **رقم الواتساب:** نطلبه عند التسجيل لنتواصل معك بخصوص حسابك وأعمالك والدعم فقط، ولا نشاركه مع أحد ولا نرسل عليه إعلانات مزعجة.
- **محتواك:** الصور والفيديوهات والملفات الصوتية والنصوص التي ترفعها أو تكتبها لاستخدام الأدوات، والنتائج التي تنتجها المنصة لك.
- **هويتك التجارية (اختياري):** اسم النشاط والشعار والألوان والخط والحساب ورابط الموقع وحساب إنستغرام وصور مرجعية للأسلوب.
- **بيانات الاستخدام والاشتراك:** رصيد «الريش»، والعمليات المنفذة، والفواتير، ورمز الإحالة.
- **بيانات تقنية:** ملفات تعريف الارتباط الضرورية لتسجيل الدخول، وسجلات تقنية لحماية الخدمة وإصلاح الأخطاء.
- **الدفع:** تتم المدفوعات عبر مزوّد دفع مرخّص، ولا نخزّن بيانات بطاقتك على خوادمنا.

## 2. كيف نستخدم البيانات
- تشغيل حسابك وتسجيل دخولك، وتقديم الأدوات التي تطلبها وحفظ أعمالك لتعود إليها.
- معالجة المحتوى الذي ترسله لإنتاج النتيجة المطلوبة (تصميم، فيديو، صوت…).
- إدارة الرصيد والاشتراك والفواتير، والتواصل معك بخصوص حسابك والدعم.
- حماية المنصة ومنع إساءة الاستخدام وتحسين جودة الخدمة.

لا نبيع بياناتك، ولا نستخدمها للإعلانات، ولا نشاركها إلا بالقدر اللازم لتقديم الخدمة كما هو موضح أدناه.

## 3. بيانات حساب Google
عند الدخول بحساب Google نستلم فقط اسمك وبريدك الإلكتروني وصورة ملفك الشخصي، ونستخدمها حصراً لإنشاء حسابك وتسجيل دخولك وعرض اسمك داخل المنصة. لا نصل إلى بريدك أو ملفاتك أو أي بيانات أخرى في حسابك، ولا ننقل بيانات Google لأي طرف ثالث لأغراض إعلانية. يلتزم استخدامنا للمعلومات المستلمة من واجهات Google بـ[سياسة بيانات مستخدمي خدمات Google API](https://developers.google.com/terms/api-services-user-data-policy)، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).

## 4. مزوّدو الخدمة
نستعين بمزوّدين موثوقين لتشغيل المنصة، ويعالجون البيانات نيابةً عنا ووفق شروطهم:
- الاستضافة وقاعدة البيانات وتخزين الملفات: Vercel و Supabase و Railway.
- الذكاء الاصطناعي لمعالجة طلباتك: Anthropic (Claude) لكتابة النصوص والتصاميم، و Google (Gemini) للصور والفيديو، و ElevenLabs للأصوات.
- مزوّد الدفع لمعالجة المدفوعات.

يُرسل لهؤلاء المزوّدين فقط ما يلزم لتنفيذ طلبك (مثل النص أو الصورة التي ترفعها).

## 5. مدة الاحتفاظ والحذف
نحتفظ ببياناتك وأعمالك طالما حسابك فعّال لتتمكن من الرجوع إليها. يمكنك حذف أي عمل من «أعمالي» في أي وقت، ويمكنك حذف حسابك وكل بياناتك بنفسك من «الحساب والاشتراك» ← «بياناتي» ← «حذف الحساب»، أو بمراسلتنا على {email} وننفّذ الطلب خلال 30 يوماً، إلا ما يلزمنا القانون بالاحتفاظ به (مثل سجلات الفواتير).

## 6. حماية البيانات
نستخدم اتصالاً مشفّراً (HTTPS)، وتخزيناً خاصاً لا يصل إليه إلا صاحب الحساب عبر روابط مؤقتة، وصلاحيات وصول محدودة. لا يوجد نظام آمن بنسبة 100٪، لكننا نتخذ إجراءات معقولة لحماية بياناتك.

**دخول فريق الدعم:** لا يدخل فريق المنصة على حسابك إلا بعد أن يطلب ذلك وتوافق أنت بتفويض مكتوب من داخل حسابك، ولحل المشكلة المذكورة فقط. ينتهي التفويض تلقائياً بعد 24 ساعة، ويمكنك إلغاؤه في أي وقت، ويُسجَّل كل دخول باسم من دخل وسببه ووقته. هذه الصلاحية لا تشمل بيانات الدفع والبطاقات الائتمانية (محفوظة مشفّرة لدى بوابة الدفع ولا نطّلع عليها) ولا الفواتير ولا كلمة المرور ولا حذف الحساب.

## 7. حقوقك
يحق لك الاطلاع على بياناتك وتصحيحها وتنزيل أعمالك وطلب حذفها، والاعتراض على أي استخدام لا ترغب به. تواصل معنا وسنرد خلال مدة معقولة.

## 8. الأطفال
المنصة موجّهة لمن هم 18 عاماً فأكثر. من هم دون ذلك يستخدمونها فقط بموافقة وليّ الأمر، ولا نجمع عن قصد بيانات من هم دون 13 عاماً.

## 9. التعديلات
قد نحدّث هذه السياسة، وسننشر النسخة الجديدة هنا مع تاريخ التحديث، ونبلغك بالتغييرات الجوهرية.

## 10. التواصل
لأي سؤال عن الخصوصية: {email} · واتساب {whatsapp} · {site}`;

export const PRIVACY_EN = `Shaheen ({site}) is a Kuwaiti AI content platform for designs, posts, videos, video editing and voice. This policy explains what data we collect, how we use and protect it, and your rights.

## 1. Data we collect
- **Account data:** name, email and password (hashed), or, when you sign in with Google, only your name, email address and profile picture.
- **WhatsApp number:** requested at sign-up so we can contact you about your account, your work and support only. We never share it or send spam to it.
- **Your content:** images, videos, audio and text you upload or write to use our tools, and the results we generate for you.
- **Brand kit (optional):** business name, logo, colours, font, handle, website, Instagram account and style reference images.
- **Usage and billing:** credit balance, jobs you run, invoices and referral code.
- **Technical data:** essential sign-in cookies and technical logs used to secure the service and fix errors.
- **Payments:** processed by a licensed payment provider; we do not store your card details.

## 2. How we use data
- To run your account, sign you in, provide the tools you request and keep your work so you can return to it.
- To process the content you send in order to produce the requested result (design, video, voice…).
- To manage credits, subscriptions and invoices, and to contact you about your account and support.
- To protect the platform, prevent abuse and improve service quality.

We do not sell your data, do not use it for advertising, and only share it as needed to provide the service, as described below.

## 3. Google user data
When you sign in with Google we receive only your name, email address and profile picture, and we use them solely to create your account, sign you in and show your name inside the platform. We do not access your Gmail, Drive or any other Google data, and we do not transfer Google user data to third parties for advertising. Shaheen's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## 4. Service providers
- Hosting, database and file storage: Vercel, Supabase and Railway.
- AI processing of your requests: Anthropic (Claude) for text and design, Google (Gemini) for images and video, ElevenLabs for voice.
- A payment provider for processing payments.

These providers only receive what is needed to fulfil your request (for example the text or image you upload) and process it on our behalf under their own terms.

## 5. Retention and deletion
We keep your data and work while your account is active. You can delete any item from “My works” at any time, and you can delete your account and all your data yourself from Account → My details → Delete account, or by emailing {email}; we complete it within 30 days, except records we must keep by law (such as invoices).

## 6. Security
We use encrypted connections (HTTPS), private storage reachable only by the account owner through short-lived links, and limited access permissions. No system is 100% secure, but we take reasonable measures to protect your data.

**Support access:** our team accesses your account only after asking and receiving your written approval inside your account, and only to fix the stated problem. The approval expires automatically after 24 hours and you can withdraw it at any time. Every access is logged with who, why and when. This access never covers payment or card details (held encrypted by the payment provider, never by us), invoices, your password or account deletion.

## 7. Your rights
You can access, correct, download and request deletion of your data, and object to any use you do not want. Contact us and we will respond within a reasonable time.

## 8. Children
The platform is intended for users aged 18 or over. Younger users may use it only with a parent's or guardian's consent, and we do not knowingly collect data from children under 13.

## 9. Changes
We may update this policy; the new version will be posted here with its date, and we will notify you of material changes.

## 10. Contact
Privacy questions: {email} · WhatsApp {whatsapp} · {site}`;

export const REFUND_AR = `> **باختصار**
> - تقدر تلغي اشتراكك بأي وقت، ويظل فعّالاً لنهاية الشهر المدفوع.
> - استرداد كامل خلال {refund_days} يوماً من الدفع، إذا ما استخدمت أي ريشة من هذه الدفعة.
> - إذا فشل أي عمل، ترجع ريشه لرصيدك تلقائياً وفوراً.
> - الريش المستخدمة لا تُسترد، لأن الخدمة الرقمية تكون قد قُدّمت.

## 1. الاشتراكات والتجديد
باقات شاهين اشتراكات شهرية. عند الدفع بالبطاقة أو Apple Pay يتجدد الاشتراك تلقائياً في نفس اليوم من كل شهر ويُخصم سعر الباقة من البطاقة المحفوظة لدى بوابة الدفع، وعند الدفع بكي نت يصلك رابط دفع قبل نهاية الشهر. توافق على ذلك بعلامة صح قبل الدفع. مع كل تجديد يُشحن رصيدك بريش الباقة، وأي ريش هدية مرتبطة بها.

## 2. إلغاء الاشتراك
تقدر تلغي التجديد بأي وقت من [الحساب والاشتراك](/app/account). بعد الإلغاء يظل اشتراكك ورصيدك فعّالين حتى نهاية الشهر المدفوع، ولا يُخصم منك أي مبلغ بعدها. الإلغاء وحده لا يعني استرداد مبلغ الشهر الحالي، إلا في الحالة الموضّحة في البند 3.

## 3. حق الاسترداد خلال {refund_days} يوماً
يحق لك طلب استرداد كامل لمبلغ الاشتراك (الأول أو أي تجديد) خلال {refund_days} يوماً من تاريخ الدفع، بشرط ألا تكون استخدمت أي ريشة من رصيد هذه الدفعة. عند قبول الطلب يُلغى الاشتراك ويُسحب رصيد تلك الدفعة.

## 4. الريش المستخدمة
عند تنفيذ أي أداة تُقدَّم لك الخدمة الرقمية فوراً (تصميم، فيديو، صوت…)، لذلك لا تُسترد قيمة الريش المستخدمة، ولا يُسترد جزء من مبلغ الاشتراك مقابل الريش المتبقية بعد بدء الاستخدام. تعرض كل أداة تكلفتها بالريش قبل التنفيذ، وتقدر تتابع كل ما صرفته من صفحة [مصاريف الريش](/app/account?tab=spend).

## 5. الأعمال التي تفشل أو فيها خلل
- إذا فشل تنفيذ أي عمل لأي سبب تقني، تُعاد ريشه إلى رصيدك تلقائياً ومباشرة، وتظهر في «مصاريف الريش».
- إذا ظهرت نتيجة فيها خلل تقني واضح من المنصة (ملف تالف، فيديو لا يعمل، أو نتيجة لا تطابق الأداة المطلوبة)، تواصل معنا خلال 7 أيام، ونعيد لك الريش أو ننفّذ العمل من جديد.
- اختلاف الذوق في نتيجة سليمة تقنياً لا يُعد خللاً، وتقدر تعدّل عملك بتكلفة التعديل الموضّحة في الأداة.

## 6. رصيد الريش
- ريش الباقة صالحة خلال شهر الاشتراك، ولا تنتقل للشهر التالي.
- الريش ليس لها قيمة نقدية، ولا تُستبدل بمال، ولا تُحوّل لحساب آخر.
- ريش الهدية والمكافآت مجانية، ولا تُسترد ولا تُحتسب ضمن أي مبلغ مسترد.

## 7. تغيير الباقة
تقدر ترقّي باقتك أو تخفّضها من صفحة الحساب. تُطبّق التغييرات حسب ما تعرضه بوابة الدفع وقت التغيير، بما في ذلك أي فرق في السعر للفترة المتبقية.

## 8. حذف الحساب
حذف الحساب نهائي، ويحذف رصيد الريش وجميع أعمالك وطرق الدفع المحفوظة ويلغي الاشتراك. حذف الحساب بحد ذاته لا يعني استرداد أي مبلغ؛ إذا كنت مستحقاً للاسترداد حسب البند 3، اطلبه قبل حذف حسابك.

## 9. باقة الإدارة الكاملة للسوشال ميديا
هذه الخدمة يقدّمها فريق بشري. يحق لك استرداد كامل قبل بدء العمل على حسابك. بعد بدء العمل يُلغى التجديد القادم عند طلبك، ولا يُسترد مبلغ الشهر الجاري.

## 10. طريقة طلب الاسترداد
راسلنا على {email} أو واتساب {whatsapp}، أو عبر «التواصل مع الدعم» داخل المنصة، واذكر البريد المسجّل في حسابك وتاريخ الدفع. نرد خلال يومي عمل، وبعد الموافقة يُعاد المبلغ بنفس طريقة الدفع خلال 7 أيام عمل. قد يختلف وقت ظهور المبلغ في حسابك حسب البنك.

## 11. القانون المطبّق
تخضع هذه السياسة لقوانين دولة الكويت، ولا تنتقص من أي حق يمنحه لك القانون كمستهلك. راجع أيضاً [شروط الاستخدام](/terms) و[سياسة الخصوصية](/privacy).`;

export const REFUND_EN = `> **In short**
> - Cancel anytime; your plan stays active until the end of the paid month.
> - Full refund within {refund_days} days of a payment if no credits from that payment were used.
> - If a job fails, its credits return to your balance automatically.
> - Used credits are not refundable, because the digital service has been delivered.

## 1. Subscriptions and renewal
Shaheen plans are monthly subscriptions. Paid by card or Apple Pay, they renew automatically on the same day each month from the card saved by the payment provider; paid with KNET, you receive a payment link before the month ends. You agree to this with a checkbox before paying. Each renewal tops up your balance with the plan's credits plus any bonus credits.

## 2. Cancelling
You can cancel renewal at any time from [Account & subscription](/app/account). Your plan and credits stay active until the end of the paid month and you will not be charged again. Cancelling alone does not refund the current month, except as described in section 3.

## 3. {refund_days}-day refund right
You may request a full refund of a subscription payment (first payment or any renewal) within {refund_days} days of that payment, provided no credits from that payment have been used. Once approved, the subscription is cancelled and that payment's credits are removed.

## 4. Used credits
Running a tool delivers the digital service immediately, so used credits are not refundable, and no partial refund is given for unused credits once usage has started. Every tool shows its cost before running, and you can review all usage under [Credit spending](/app/account?tab=spend).

## 5. Failed or faulty jobs
- If a job fails for any technical reason, its credits are returned to your balance automatically.
- If a result has a clear technical fault caused by the platform (corrupted file, video that won't play, or a result that doesn't match the tool), contact us within 7 days and we will restore the credits or redo the job.
- A technically sound result that doesn't match your taste is not a fault; you can edit it at the edit cost shown in the tool.

## 6. Credits
- Plan credits are valid during the subscription month and do not roll over.
- Credits have no cash value, cannot be exchanged for money and cannot be transferred.
- Bonus and reward credits are free and are not refundable or counted in any refund.

## 7. Changing plans
You can upgrade or downgrade from your account page. Changes apply as shown by the payment portal at the time, including any price difference for the remaining period.

## 8. Deleting your account
Account deletion is permanent and removes your credits, all your work and saved payment methods, and cancels your subscription. Deleting your account does not by itself trigger a refund; if you qualify under section 3, request it before deleting.

## 9. Managed social media service
This service is delivered by our team. You are entitled to a full refund before work on your account starts. After work starts, we cancel the next renewal on request, but the current month is not refunded.

## 10. How to request a refund
Email {email}, WhatsApp {whatsapp}, or use “Contact support” in the app, with your account email and payment date. We reply within 2 business days; approved refunds are returned to the original payment method within 7 business days. Your bank may take longer to show it.

## 11. Governing law
This policy is governed by the laws of the State of Kuwait and does not limit any rights you have as a consumer under the law. See also our [Terms of Service](/terms) and [Privacy Policy](/privacy).`;

export const CONTENT_AR = `منصة «شاهين» ({site}) منصة كويتية محترمة لصناعة محتوى الأعمال بالذكاء الاصطناعي، وتلتزم بقوانين دولة الكويت وبالآداب العامة والقيم الإسلامية. هذه السياسة جزء لا يتجزأ من [شروط الاستخدام](/terms)، وتنطبق على كل ما تكتبه أو ترفعه أو تطلب إنشاءه أو تنشره من نتائج المنصة. استخدامك لأي أداة يعني موافقتك عليها.

> **باختصار:** أي محتوى غير أخلاقي أو مسيء أو مخالف للقانون ممنوع منعاً باتاً، وما يجوز تستخدم صورة أو صوت أو اسم أي شخص بدون إذنه. المخالف يتوقف حسابه، وقد نبلّغ الجهات المختصة.

## 1. المحتوى الممنوع نهائياً
**أ) الآداب العامة**
- العري الكامل أو الجزئي، والمحتوى الجنسي أو الإباحي أو الإيحائي، والصور أو الفيديوهات أو الإعلانات المثيرة أو الخادشة للحياء.
- أي محتوى يمس الأطفال أو يظهرهم بشكل غير لائق بأي صورة، وأي استغلال لهم.
- الترويج للخدمات الجنسية أو العلاقات أو المواعدة غير الأخلاقية.

**ب) الدين والمجتمع**
- الإساءة للذات الإلهية أو الأنبياء أو الصحابة أو الأديان أو المقدسات، أو السخرية منها.
- استخدام آيات القرآن الكريم أو الأحاديث بشكل محرّف أو مقرون بموسيقى أو محتوى غير لائق.
- إثارة النعرات الطائفية أو القبلية أو العنصرية، والتحريض على الكراهية أو العنف أو التمييز.

**ج) الأشخاص وحقوقهم**
- **انتحال الشخصية والتزييف العميق (Deepfake):** استخدام وجه أو صورة أو صوت أو اسم أي شخص حقيقي (شخص عادي أو مشهور أو مسؤول) بدون موافقته الصريحة المكتوبة، أو تقليده ليبين كأنه قال أو سوّى شي ما سواه.
- **استنساخ الأصوات:** مسموح فقط لصوتك أنت، أو لصوت شخص عندك إذن مكتوب منه. ممنوع استنساخ صوت أي شخص بدون إذنه، ومنهم المشاهير والقرّاء والمسؤولين.
- السب والقذف والتشهير والإهانة والسخرية من أي شخص أو جهة، ونشر ما يمس سمعتهم أو كرامتهم.
- نشر البيانات أو الصور أو المعلومات الشخصية لأي شخص بدون إذنه، أو أي محتوى ينتهك خصوصيته.
- التحرش أو التهديد أو الابتزاز أو التنمّر بأي شكل.

**د) الدولة والنظام العام**
- المساس بالذات الأميرية، أو الإساءة للدولة أو مؤسساتها أو رموزها، أو للدول الشقيقة والصديقة.
- الأخبار الكاذبة والشائعات والمحتوى المضلّل، وتزوير المستندات أو الشعارات أو الأختام الرسمية.

**هـ) التجارة والقانون**
- الترويج للمخدرات أو المسكرات أو القمار أو الأسلحة أو البضائع المقلّدة أو أي نشاط غير مرخّص أو ممنوع في الكويت.
- الاحتيال والنصب والإعلانات الكاذبة أو المضلّلة للمستهلك، والادعاءات الطبية أو العلاجية بدون ترخيص.
- انتهاك حقوق الملكية الفكرية: استخدام شعارات أو علامات تجارية أو شخصيات أو موسيقى أو صور أو أعمال لغيرك بدون إذن.
- البريد المزعج والرسائل الجماعية غير المرغوب فيها.
- العنف المفرط والدموي، ومحتوى إيذاء النفس.

## 2. حقوق وموافقات تتعهد فيها
- إنك تملك كل محتوى ترفعه (صور، فيديوهات، أصوات، شعارات)، أو عندك إذن مكتوب باستخدامه.
- إن أي شخص يظهر بصورته أو صوته بمحتواك وافق صراحة، وإنك تقدر تثبت هالموافقة لو طلبناها.
- إنك ما تقدّم المحتوى المنشأ بالذكاء الاصطناعي (أشخاص أو أصوات مولّدة) كأنه حقيقي بهدف خداع الناس.
- إنك تراجع أي نتيجة قبل نشرها، وتتحمل مسؤولية نشرها.

## 3. كيف نطبّق السياسة
- نفحص الطلبات تلقائياً قبل التنفيذ، ونرفض أي طلب مخالف بدون خصم ريش.
- مزوّدو الذكاء الاصطناعي اللي نستخدمهم عندهم فلاتر أمان إضافية.
- يصل لفريق الإدارة تنبيه عند أي محاولة مخالفة، ويحق لنا مراجعة المحتوى المخالف وحذفه في أي وقت.

## 4. العقوبات
- أول مخالفة بسيطة: رفض الطلب وتنبيه.
- تكرار المحاولة أو المخالفة الجسيمة: **إيقاف الحساب أو حذفه نهائياً بدون استرجاع للمبالغ أو الريش**، وحظر البريد من التسجيل مرة ثانية.
- المحتوى المخالف للقانون، خصوصاً ما يمس الأطفال أو انتحال الشخصيات أو الابتزاز: نحتفظ بالسجلات اللازمة، ونبلّغ عنه الجهات المختصة في دولة الكويت، ونتعاون معها ونسلّمها البيانات عند الطلب الرسمي.

## 5. مسؤوليتك القانونية
أنت المسؤول وحدك قانونياً عن المحتوى اللي تطلب إنشاءه أو تنشره، وتتعهد بتعويض شاهين عن أي ضرر أو مطالبة أو غرامة تنتج عن مخالفتك لهذه السياسة أو للقوانين. شاهين أداة لإنشاء المحتوى، ولا تتحمل مسؤولية أي استخدام مخالف للنتائج بعد تحميلها.

## 6. البلاغات وإزالة المحتوى
إذا شفت محتوى مخالف أُنشئ بالمنصة، أو استُخدمت صورتك أو صوتك أو عملك بدون إذنك، راسلنا على {email} أو واتساب {whatsapp} مع التفاصيل. نراجع البلاغ بأسرع وقت، ونوقف المحتوى أو الحساب المخالف إذا ثبتت المخالفة.

## 7. القوانين المرجعية
تخضع هذه السياسة لقوانين دولة الكويت، ومنها: قانون مكافحة جرائم تقنية المعلومات رقم 63 لسنة 2015، وقانون الجزاء، وقانون حقوق المؤلف والحقوق المجاورة، وتنظيمات حماية البيانات الشخصية الصادرة عن هيئة الاتصالات وتقنية المعلومات، وقانون المطبوعات والنشر، وأي قانون آخر نافذ.

## 8. التعديلات
قد نحدّث هذه السياسة، وننشر النسخة الجديدة هنا مع تاريخ آخر تحديث. استمرارك باستخدام المنصة بعد التحديث يعني موافقتك عليه.`;

export const CONTENT_EN = `Shaheen ({site}) is a respectful Kuwaiti platform for AI business content. It follows the laws of the State of Kuwait, public morals and Islamic values. This policy is an integral part of the [Terms of Service](/terms) and applies to everything you write, upload, ask the platform to create, or publish from its results. Using any tool means you accept it.

> **In short:** any immoral, abusive or illegal content is strictly forbidden, and you may not use anyone's image, voice or name without their permission. Violating accounts are suspended, and we may report them to the authorities.

## 1. Strictly forbidden
**a) Public morals**
- Full or partial nudity, sexual, pornographic or suggestive content, and indecent or provocative images, videos or ads.
- Any content involving children in an inappropriate way, in any form, and any exploitation of them.
- Promoting sexual services or immoral relationships or dating.

**b) Religion and society**
- Insulting or mocking God, the prophets, the companions, religions or sacred things.
- Using verses of the Holy Quran or hadith in an altered way, with music, or alongside inappropriate content.
- Stirring sectarian, tribal or racial strife, and inciting hatred, violence or discrimination.

**c) People and their rights**
- **Impersonation and deepfakes:** using the face, image, voice or name of any real person (private, famous or official) without their explicit written consent, or imitating them so they appear to say or do something they did not.
- **Voice cloning:** allowed only for your own voice, or the voice of someone who gave you written permission. Cloning anyone's voice without permission is forbidden, including celebrities, Quran reciters and officials.
- Insult, slander, defamation, humiliation or mockery of any person or organization, and publishing anything that harms their reputation or dignity.
- Publishing anyone's personal data, images or information without permission, or any content that violates their privacy.
- Harassment, threats, blackmail or bullying in any form.

**d) The state and public order**
- Offending the Amir, insulting the state, its institutions or symbols, or brotherly and friendly countries.
- Fake news, rumours and misleading content, and forging official documents, logos or seals.

**e) Trade and the law**
- Promoting drugs, alcohol, gambling, weapons, counterfeit goods, or any unlicensed or prohibited activity in Kuwait.
- Fraud, scams, false or misleading advertising, and medical or therapeutic claims without a licence.
- Infringing intellectual property: using others' logos, trademarks, characters, music, images or works without permission.
- Spam and unsolicited bulk messages.
- Graphic or gory violence, and self-harm content.

## 2. Rights and consents you guarantee
- You own all content you upload (images, videos, voices, logos), or have written permission to use it.
- Anyone who appears with their image or voice in your content has explicitly agreed, and you can prove that consent if we ask.
- You will not present AI-generated content (generated people or voices) as real in order to deceive people.
- You review every result before publishing it and are responsible for publishing it.

## 3. How we enforce it
- Requests are checked automatically before they run; forbidden requests are refused without using credits.
- The AI providers we use apply their own additional safety filters.
- The admin team is alerted to every violating attempt, and we may review and delete violating content at any time.

## 4. Penalties
- A first minor violation: the request is refused with a warning.
- Repeated attempts or a serious violation: **the account is suspended or permanently deleted without any refund of payments or credits**, and the email is blocked from signing up again.
- Illegal content, especially anything involving children, impersonation or blackmail: we keep the necessary records, report it to the competent authorities in the State of Kuwait, cooperate with them and hand over data upon an official request.

## 5. Your legal responsibility
You alone are legally responsible for the content you ask to create or publish, and you undertake to compensate Shaheen for any damage, claim or fine resulting from your breach of this policy or the law. Shaheen is a content-creation tool and is not responsible for any misuse of results after they are downloaded.

## 6. Reports and takedowns
If you see violating content made with the platform, or your image, voice or work was used without your permission, contact us at {email} or WhatsApp {whatsapp} with the details. We review reports as quickly as possible and stop the violating content or account when the violation is confirmed.

## 7. Governing laws
This policy is governed by the laws of the State of Kuwait, including the Law on Combating Information Technology Crimes No. 63 of 2015, the Penal Code, the Copyright and Related Rights Law, the personal data protection regulations issued by the Communication and Information Technology Regulatory Authority, the Press and Publications Law, and any other law in force.

## 8. Changes
We may update this policy and will publish the new version here with the date of the last update. Continuing to use the platform after an update means you accept it.`;
