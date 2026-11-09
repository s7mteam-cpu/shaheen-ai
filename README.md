# شاهين (S7M) — منصة صناعة المحتوى بالذكاء الاصطناعي

منصة عربية (RTL) بالاشتراك الشهري ونظام رصيد «الريشة»، مبنية بـ **Next.js 15 + Supabase + Stripe**، ومزودي الذكاء الاصطناعي **fal.ai** و**ElevenLabs** و**Claude**.

## ما الموجود في المشروع

| الجزء | المسار |
|---|---|
| صفحة الهبوط + باقة إدارة السوشال ميديا + الصفحات القانونية | `src/app/(site)` |
| الدخول، التسجيل، Google، استعادة كلمة المرور | `src/app/(auth)`, `src/app/auth/callback` |
| لوحة التحكم، الأدوات الثماني، أعمالي، الهوية التجارية، الحساب والاشتراك | `src/app/app` |
| «كلّم شاهين» — المساعد الذكي الجانبي | `src/components/ShaheenChat.tsx`, `src/app/api/assistant` |
| لوحة الإدارة (النصوص والصور، الأدوات والأسعار، الباقات، العملاء، الطلبات، طلبات الإدارة، المعرض) | `src/app/admin` |
| تنفيذ الأدوات ومزوديها | `src/lib/tools`, `src/lib/providers` |
| الدفع والاشتراكات | `src/app/app/account/actions.ts`, `src/app/api/stripe/webhook` |
| قاعدة البيانات (الجداول، الحماية، دوال الرصيد) | `supabase/migrations`, `supabase/seed.sql` |
| عامل مونتاج الفيديو (FFmpeg) | `worker/` |

## التشغيل خطوة بخطوة

### 1) Supabase (قاعدة البيانات وتسجيل الدخول)
1. أنشئ مشروع على supabase.com (اختر منطقة قريبة، مثل Frankfurt).
2. من **SQL Editor** شغّل الملفات بالترتيب: `0001_init.sql` ← `0002_leads.sql` ← `0003_providers.sql` ← `0004_edits.sql` ← `seed.sql`.
3. **Authentication → URL Configuration**: ضع رابط موقعك في Site URL، وأضف `https://موقعك/auth/callback` في Redirect URLs.
4. **Authentication → Providers → Google**: فعّله وضع Client ID و Secret من Google Cloud Console.
5. **Authentication → Email Templates**: عرّب رسائل التأكيد واستعادة كلمة المرور.

### 2) Stripe (الدفع بالدينار الكويتي)
1. أنشئ 3 منتجات بأسعار **شهرية متكررة بعملة KWD** (30 / 60 / 90).
2. انسخ كل `price_...` وضعه في **لوحة الإدارة ← الباقات**.
3. **Developers → Webhooks**: أضف `https://موقعك/api/stripe/webhook` مع الأحداث:
   `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. **Settings → Billing → Customer portal**: فعّل تحديث البطاقة، والإلغاء، وتبديل الباقات (أضف المنتجات الثلاثة).

> إذا تبي KNET لاحقاً: Tap Payments تدعمه، ويُضاف كبوابة ثانية.

### 3) مفاتيح الذكاء الاصطناعي
- **fal.ai** → `FAL_KEY` (الصور والفيديو)
- **ElevenLabs** → `ELEVENLABS_API_KEY` (الأصوات، الاستنساخ، الأناشيد، ترجمة المونتاج) — يحتاج خطة تشمل الاستخدام التجاري
- **Anthropic** → `ANTHROPIC_API_KEY` (نصوص الإعلانات، «ألهمني»، «كلّم شاهين»)
- **Google Gemini** → `GEMINI_API_KEY` (اختياري: Gemini للمحادثة والكتابة، Nano Banana للصور، Veo للفيديو، صوت Gemini، ترجمة المونتاج)

### اختيار المزوّد لكل خدمة
- **لوحة الإدارة ← الأدوات والأسعار:** لكل أداة تختار المزوّد (fal / Google / ElevenLabs) والنموذج، وسعر الأداة، وسعر «التعديل».
- **لوحة الإدارة ← الذكاء الاصطناعي:** تختار Claude أو Gemini لـ«كلّم شاهين» وللكتابة، وتشوف أي المفاتيح موجودة.
- القائمة تعرض لكل أداة المزودين القادرين عليها فقط (مثلاً Claude ما يولّد صور).
- إضافة مزوّد جديد (مثل OpenAI أو Runway) = ملف صغير في `src/lib/providers/` وسطر في `registry.ts`.

### «تعديل» النتيجة
تحت كل نتيجة زر **تحميل** وزر **تعديل**. العميل يكتب التعديل (أو يغيّر إعدادات المونتاج)، ويُخصم سعر التعديل الخاص بالأداة، ويطلع عمل جديد مربوط بالأصلي في «أعمالي».
- الصور: تعديل حقيقي على الصورة الناتجة.
- الفيديو والنشيد: إعادة إنتاج بنفس الإعدادات مع التعديل المطلوب.
- الصوت والشخصية: نص جديد بنفس الصوت/الصورة.

### 4) النشر على Vercel
1. ارفع المشروع على GitHub، ثم استورده في vercel.com.
2. ضع كل المتغيرات من `.env.example` في **Settings → Environment Variables**.
3. `WORKER_SECRET`: اكتب أي كلمة سر طويلة.
4. اربط الدومين.

### 5) عامل المونتاج
أداة «مونتاج الفيديو» تحتاج FFmpeg، فتشتغل كخدمة صغيرة منفصلة:
```bash
cd worker
docker build -t shaheen-worker .
docker run -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -e ELEVENLABS_API_KEY=... -e GEMINI_API_KEY=... shaheen-worker
```
(تقدر ترفعه على Railway أو Fly.io أو أي سيرفر صغير.)

### 6) اجعل نفسك مديراً
سجّل في الموقع بحسابك، ثم في Supabase SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'بريدك';
```
بعدها يظهر لك رابط «لوحة الإدارة» في القائمة.

## قبل الإطلاق — راجع هذي النقاط
- **معرّفات النماذج في fal** تتغير مع الوقت. من لوحة الإدارة ← الأدوات تقدر تغيّر النموذج. تأكد من أسماء النماذج في fal.ai/models، خصوصاً «فيديو بشخصية واقعية».
- **الأصوات:** المعرّفات الافتراضية أصوات عامة. اختر أصواتاً خليجية من مكتبة ElevenLabs وضع معرّفاتها في لوحة الإدارة ← نصوص الموقع ← الأصوات.
- **الصفحات القانونية:** اكتب الشروط والخصوصية والاسترجاع من لوحة الإدارة (يُفضّل مراجعتها مع محامٍ).
- **جرّب كل أداة بحساب تجريبي** وراقب التكلفة الفعلية في لوحات المزودين، ثم عدّل أسعار الريش.

## التطوير محلياً
```bash
cp .env.example .env.local   # واملأ المفاتيح
npm install
npm run dev                  # http://localhost:3000
```
