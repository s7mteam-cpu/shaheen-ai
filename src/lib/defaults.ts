import { DEFAULT_RECITERS } from "@/remotion/quran";
import { TERMS_AR, TERMS_EN, PRIVACY_AR, PRIVACY_EN, REFUND_AR, REFUND_EN, CONTENT_AR, CONTENT_EN } from "./legalTexts";
// Fallback content used until the database is connected.
// The live values come from Supabase and are edited from /admin.

export type Plan = {
  id: string;
  name: string;
  subtitle: string | null;
  price_kwd: number;
  credits: number;
  bonus_credits?: number;
  features: string[];
  stripe_price_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  category: "image" | "video" | "audio" | "docs";
  icon: string;
  credit_cost: number;
  edit_cost: number;
  cost_unit: string;
  provider: string | null;
  provider_model: string | null;
  is_enabled: boolean;
  sort_order: number;
  demo_url?: string | null;     // YouTube link or an uploaded clip
  demo_thumb?: string | null;   // 9:16 picture shown on the card
  tutorial_url?: string | null; // «علّمني الطريقة»: YouTube link or an uploaded clip
  cover_url?: string | null;    // picture on the tool's card in «الأدوات»
};

export type SiteContent = {
  hero: { badge: string; title: string; highlight: string; subtitle: string; cta_primary: string; cta_secondary: string; points: string[]; image: string };
  steps: { title: string; subtitle: string; items: { title: string; body: string }[] };
  tools_section: { eyebrow: string; title: string };
  plan_intro: { title: string; subtitle: string; points: string[]; button: string };
  gallery: { title: string; subtitle: string; button: string; templates_button: string; like_enabled: boolean };
  pricing: { title: string; subtitle: string };
  faq: { items: { q: string; a: string }[] };
  final_cta: { title: string; subtitle: string; cta: string };
  footer: { tagline: string; company: string; whatsapp: string; email: string; instagram: string };
  legal: { updated: string; updated_en: string; refund_days: string; terms: string; terms_en: string; privacy: string; privacy_en: string; refund: string; refund_en: string; content: string; content_en: string };
  voices: { items: { id: string; name: string; note: string; google_voice?: string; gender?: string; age?: string; dialects?: string[]; model?: string }[] };
  /** Background-music library for the motion studio (royalty-free tracks you uploaded). */
  motion_music: { items: { name: string; mood?: string; url: string }[] };
  quran_reciters: { items: { id: string; name: string; folder: string }[] };
  ai: { copy_provider: string; copy_model: string; chat_provider: string; chat_model: string };
  managed_service: { enabled: boolean; title: string; price_kwd: string; period: string; features: string[]; cta: string; whatsapp: string; whatsapp_message: string; thanks: string };
};

export const defaultPlans: Plan[] = [
  { id: "starter", name: "البداية", subtitle: "لأصحاب المشاريع الصغيرة", price_kwd: 40, credits: 500, features: ["كل الأدوات", "هويتك التجارية على كل تصميم", "دعم فني بالعربي"], stripe_price_id: null, is_featured: false, is_active: true, sort_order: 1 },
  { id: "shaheen", name: "الشاهين", subtitle: "للمتاجر والمشاريع النشطة", price_kwd: 60, credits: 800, bonus_credits: 100, features: ["كل الأدوات", "هويتك التجارية على كل تصميم", "دعم فني بالعربي"], stripe_price_id: null, is_featured: true, is_active: true, sort_order: 2 },
  { id: "golden", name: "الصقر الذهبي", subtitle: "للوكالات وصنّاع المحتوى", price_kwd: 90, credits: 1300, bonus_credits: 500, features: ["كل الأدوات", "أولوية في التنفيذ", "أولوية في الدعم الفني"], stripe_price_id: null, is_featured: false, is_active: true, sort_order: 3 },
];

export const defaultTools: Tool[] = [
  { id: "presentations", provider: "claude", name: "عروض PowerPoint", description: "اكتب فكرتك أو موضوعك أو الصق نصاً كاملاً أو ارفع ملفك (Word, PDF…)، وشاهين يكتب لك عرضاً احترافياً كاملاً بملف PowerPoint قابل للتعديل: شرائح مرتبة، ملاحظات للمتحدث، وألوان هويتك.", category: "docs", icon: "layers", credit_cost: 15, edit_cost: 0, cost_unit: "عرض (حتى 10 شرائح)", provider_model: null, is_enabled: true, sort_order: 20 },
  { id: "business-cards", provider: "claude", name: "بطاقات العمل", description: "بطاقة عمل احترافية لك أو لشركتك أو براندك: اكتب معلوماتك، وشاهين يصمم وجه وظهر بأسلوب يناسب مجالك، وتعدّل كل شي وتنزّلها بجودة الطباعة.", category: "docs", icon: "card", credit_cost: 8, edit_cost: 2, cost_unit: "بطاقة", provider_model: null, is_enabled: true, sort_order: 21 },
  { id: "invitations", provider: "claude", name: "دعوات الزفاف والمناسبات", description: "دعوة أنيقة لزفافك أو خطوبتك أو مولودك أو تخرجك: اكتب الأسماء والتاريخ والمكان، وشاهين يصمم دعوة بوجه وصفحة تفاصيل بأسلوب يناسب مناسبتك، وتعدّل كل شي وتنزّلها صورة جاهزة للإرسال والطباعة.", category: "docs", icon: "calendar", credit_cost: 8, edit_cost: 2, cost_unit: "دعوة", provider_model: null, is_enabled: true, sort_order: 22 },
  { id: "cv", provider: "claude", name: "السيرة الذاتية الاحترافية", description: "اكتب خبراتك أو ارفع سيرتك القديمة، وشاهين يرتّبها ويصيغها بشكل احترافي في تصميم فخم من 50 ستايل، وتعدّل كل شي وتنزّلها PDF وWord.", category: "docs", icon: "card", credit_cost: 10, edit_cost: 2, cost_unit: "سيرة", provider_model: null, is_enabled: true, sort_order: 23 },
  { id: "post", provider: "fal", name: "إنشاء بوست", description: "تصميم بوست احترافي من معلوماتك: نصوص عربية مظبوطة، أيقونات، صورك أو صور بالذكاء الاصطناعي، وتعدّل كل شي مباشرة.", category: "image", icon: "palette", credit_cost: 5, edit_cost: 2, cost_unit: "تصميم", provider_model: "fal-ai/nano-banana-pro", is_enabled: true, sort_order: 1 },
  { id: "image", provider: "fal", name: "إنشاء صورة بالذكاء الاصطناعي", description: "اكتب ما تتخيله، أو ارفع صورتك واطلب التعديل: خلفية جديدة، إزالة عنصر، تحسين جودة.", category: "image", icon: "sparkles", credit_cost: 4, edit_cost: 2, cost_unit: "صورة", provider_model: "fal-ai/nano-banana-2", is_enabled: true, sort_order: 1 },
  { id: "carousel", provider: "fal", name: "كاروسيل إنستغرام", description: "سلسلة شرائح متناسقة بعناوين عربية، تشرح فكرة أو منتج خطوة بخطوة.", category: "image", icon: "layers", credit_cost: 3, edit_cost: 2, cost_unit: "شريحة", provider_model: "fal-ai/nano-banana-pro", is_enabled: true, sort_order: 2 },
  { id: "motion-video", provider: "claude", name: "إنشاء فيديو موشن جرافيك", description: "فيديو موشن جرافيك لأي مجال: إعلان أو شرح تعليمي، رسوم تنرسم باليد أو كرتون خليجي يتكلم، بنصوص عربية صحيحة وتعدّلها بنفسك مع موسيقى وتعليق صوتي.", category: "video", icon: "film", credit_cost: 10, edit_cost: 5, cost_unit: "15 ثانية", provider_model: null, is_enabled: true, sort_order: 3 },
  { id: "site-video", provider: "claude", name: "فيديو من موقعك", description: "ألصق رابط موقعك، وشاهين يفتحه ويقرأه ويسوي لك فيديو احترافي يتصفّح الموقع (تمرير وتقريب بين أقسامه داخل إطار جوال أو متصفح) مع تعليق صوتي يشرح الموقع وخدماته. يناسب أي موقع: مطعم، عقارات، مدرّب، متجر، شركة. 50 ستايل جاهز أو تلقائي.", category: "video", icon: "film", credit_cost: 10, edit_cost: 5, cost_unit: "15 ثانية", provider_model: null, is_enabled: true, sort_order: 4 },
  { id: "free-motion", provider: "claude", name: "تصميم موشن جرافيك مبتكر ✨", description: "اكتب فكرتك، وشاهين يصمّم لك موشن جرافيك خاص من الصفر بالكود (حركات وانتقالات وأيقونات منصات حقيقية بألوان هويتك) بدل القوالب الجاهزة. تعدّل النصوص والألوان بعد التصميم، وتقدر تسوّي نفس التصميم بكلام جديد. تجريبي.", category: "video", icon: "film", credit_cost: 25, edit_cost: 8, cost_unit: "15 ثانية", provider_model: null, is_enabled: true, sort_order: 5 },
  { id: "real-scenes", provider: "claude", name: "مشاهد واقعية", description: "فيديو بلقطات حقيقية بدون ظهور متحدث: اكتب نص الإعلان أو الكلام، وشاهين يقرأه بصوت ولهجة تختارها ويركّب فوقه لقطات واقعية تناسب كل جملة، بالمقاس اللي تبيه (ريلز، يوتيوب، مربع، 4:5).", category: "video", icon: "film", credit_cost: 10, edit_cost: 5, cost_unit: "15 ثانية", provider_model: null, is_enabled: true, sort_order: 3 },
  { id: "quran-video", provider: "claude", name: "فيديو قرآني", description: "اختر السورة والآيات والقارئ (مثل ياسر الدوسري)، وشاهين يسوي فيديو بخلفية متحركة هادئة ونص الآيات بالرسم العثماني مع التلاوة، بدون موسيقى.", category: "video", icon: "film", credit_cost: 3, edit_cost: 0, cost_unit: "30 ثانية", provider_model: null, is_enabled: true, sort_order: 6 },
  { id: "video-editing", provider: "elevenlabs", name: "مونتاج الفيديو", description: "ارفع فيديوك الخام، ونقصّ الأجزاء الفاضية ونضيف ترجمة عربية ونجهّزه لكل منصة.", category: "video", icon: "scissors", credit_cost: 10, edit_cost: 5, cost_unit: "دقيقة", provider_model: null, is_enabled: true, sort_order: 4 },
  { id: "product-video", provider: "google", name: "فيديو المنتج", description: "ارفع صورة منتجك، ونحوّلها لفيديو إعلاني واقعي: إضاءة سينمائية، حركة كاميرا، وموسيقى.", category: "video", icon: "film", credit_cost: 15, edit_cost: 5, cost_unit: "5 ثواني", provider_model: "gemini-omni-1.2-flash", is_enabled: true, sort_order: 6 },
  { id: "avatar-video", provider: "fal", name: "فيديو بشخصية واقعية", description: "شخصية تقدّم منتجك وتتكلم بلهجة جمهورك، بدون تصوير ولا ممثلين.", category: "video", icon: "user", credit_cost: 30, edit_cost: 5, cost_unit: "فيديو", provider_model: "fal-ai/kling-video/ai-avatar/v2/standard", is_enabled: true, sort_order: 5 },
  { id: "ad-design", provider: "fal", name: "تصميم الإعلانات", description: "زاوية تسويقية ونص إعلاني وصورة لكل إعلان، جاهزة للنشر على السوشال ميديا.", category: "image", icon: "megaphone", credit_cost: 5, edit_cost: 2, cost_unit: "إعلان", provider_model: "fal-ai/nano-banana-pro", is_enabled: true, sort_order: 6 },
  { id: "voice", provider: "elevenlabs", name: "تحويل النص إلى أصوات عربية", description: "أصوات طبيعية بأكثر من 20 لهجة، واستنساخ صوتك بموافقتك.", category: "audio", icon: "mic", credit_cost: 3, edit_cost: 1, cost_unit: "500 حرف", provider_model: null, is_enabled: true, sort_order: 7 },
  { id: "nasheed", provider: "elevenlabs", name: "إنشاء همهمة إسلامية", description: "أناشيد بأصوات بشرية وهمهمات خلفية بدون آلات موسيقية، للمحتوى الديني والمحافظ.", category: "audio", icon: "waves", credit_cost: 10, edit_cost: 3, cost_unit: "30 ثانية", provider_model: null, is_enabled: true, sort_order: 8 },
  { id: "product-photo", provider: "fal", name: "تصوير المنتجات", description: "صوّر منتجك بالجوال، ونحوّله لصور استوديو احترافية بخلفيات وإضاءة فاخرة.", category: "image", icon: "camera", credit_cost: 6, edit_cost: 2, cost_unit: "صورة", provider_model: "fal-ai/nano-banana-pro/edit", is_enabled: true, sort_order: 9 },
];

export const defaultContent: SiteContent = {
  hero: {
    badge: "منصة عربية لصناعة المحتوى بالذكاء الاصطناعي",
    title: "حوّل فكرتك إلى محتوى",
    highlight: "يبيع",
    subtitle: "شاهين استوديو المحتوى العربي لمشروعك: صور منتجات، فيديوهات، إعلانات وتعليق صوتي بلهجة جمهورك — كلها من مكان واحد، وبهويتك أنت.",
    cta_primary: "اشترك الآن",
    cta_secondary: "استكشف الأدوات وطريقة استخدامها",
    points: ["بدون كاميرا أو فريق إنتاج", "أكثر من 20 لهجة عربية", "إلغاء في أي وقت"],
    image: "",
  },
  steps: {
    title: "ثلاث خطوات فقط",
    subtitle: "من الفكرة إلى منشور جاهز بدون أي خبرة تقنية.",
    items: [
      { title: "اكتب فكرتك", body: "بالعربي أو باللهجة، أو اضغط «ألهمني» ويعطيك شاهين أفكاراً تناسب نشاطك." },
      { title: "اختر الأداة", body: "صورة، فيديو، إعلان، أو صوت — وتعرف تكلفتها بالريشة قبل ما تبدأ." },
      { title: "حمّل وانشر", body: "عدّل بأمر نصي، ثم حمّل بجودة عالية أو انشر مباشرة." },
    ],
  },
  tools_section: { eyebrow: "أدوات شاهين", title: "كل ما يحتاجه مشروعك في مكان واحد" },
  gallery: { title: "أعمال صُنعت بشاهين", subtitle: "نماذج حقيقية من المنصة.", button: "أعمال صُنعت بشاهين", templates_button: "مكتبة القوالب", like_enabled: true },
  pricing: { title: "اختر باقتك الشهرية", subtitle: "كل أداة تعرض تكلفتها بالريشة قبل التنفيذ. ألغِ أو غيّر باقتك في أي وقت." },
  faq: {
    items: [
      { q: "ما هي «الريشة»؟", a: "هي رصيدك داخل شاهين. كل أداة تعرض عدد الريش التي تحتاجها قبل التنفيذ، وإذا فشل الطلب ترجع لك تلقائياً." },
      { q: "هل أحتاج خبرة في التصميم؟", a: "لا. تكتب فكرتك بالعربي وتختار الأداة، والتعديلات بضغطة زر." },
      { q: "هل أقدر ألغي اشتراكي؟", a: "نعم، من صفحة الحساب في أي وقت بضغطة واحدة، وتبقى أعمالك محفوظة." },
      { q: "هل الأعمال ملكي؟", a: "نعم. كل تصميم وفيديو وصوت تعمله بشاهين ملكك، وتقدر تستخدمه تجارياً بإعلاناتك وحساباتك بدون أي رسوم إضافية. بس راجع النتيجة قبل النشر، ولا تستخدم صور أو علامات تجارية لغيرك بدون إذن." },
    ],
  },
  final_cta: { title: "جاهز تحلّق بمحتواك؟", subtitle: "اختر باقتك واصنع أول إعلان لمشروعك اليوم.", cta: "اختر باقتك" },
  footer: { tagline: "أدوات الذكاء الاصطناعي لصناعة المحتوى، بالعربي.", company: "[اسم الشركة والسجل التجاري]", whatsapp: "+96550993895", email: "", instagram: "" },
  legal: {
    updated: "13 نوفمبر 2026", updated_en: "November 13, 2026", refund_days: "14",
    terms: TERMS_AR, terms_en: TERMS_EN, privacy: PRIVACY_AR, privacy_en: PRIVACY_EN, refund: REFUND_AR, refund_en: REFUND_EN, content: CONTENT_AR, content_en: CONTENT_EN,
  },

  ai: { copy_provider: "claude", copy_model: "claude-haiku-5-5", chat_provider: "claude", chat_model: "claude-haiku-5-5" },
  plan_intro: {
    title: "خطة المحتوى",
    subtitle: "خلّ شاهين يخطط لك النشر ويجهّز منشوراتك لحاله.",
    points: [
      "شاهين يحلل نشاطك ويكتب لك خطة نشر جاهزة: سبت واثنين وأربعاء، بوست وريلز وكاروسيل.",
      "تحت كل منشور تلقى الموضوع والافتتاحية والكابشن ووقت النشر المناسب (ظهراً أو عصراً أو 11 بالليل).",
      "اختر خطة هذا الأسبوع أو خطة الشهر كامل.",
      "اضغط «جهّز» وشاهين ينشئ المنشورات لحاله، وتلقاها جاهزة بأعمالي تراجعها وتعدلها وتنشرها.",
      "تبي كل سبت تنجهز لك لحالها؟ فعّل التجهيز التلقائي (للخطة الشهرية).",
    ],
    button: "ابدأ",
  },
  managed_service: {
    enabled: true,
    title: "باقة الإدارة الكاملة للسوشال ميديا",
    price_kwd: "150",
    period: "شهرياً",
    features: [
      "كل أدوات شاهين لإنتاج المحتوى",
      "خطة تسويقية متكاملة ومدروسة",
      "تصميم، إشراف وتفاعل دائم مع الجمهور",
      "إدارة شاملة ومستمرة لحساباتك",
      "تقارير أداء دورية ومتابعة مستمرة",
    ],
    cta: "اشترك الآن",
    whatsapp: "+96550993895",
    whatsapp_message: "السلام عليكم، أبي أشترك في باقة الإدارة الكاملة للسوشال ميديا من شاهين.",
    thanks: "وصلنا طلبك ✓ سيتم التواصل معكم في أسرع وقت.",
  },
  motion_music: { items: [] },
  quran_reciters: { items: DEFAULT_RECITERS },
  // ElevenLabs voice ids. Replace with Gulf-dialect voices from the ElevenLabs voice library via /admin.
  voices: {
    items: [
      { id: "pNInz6obpgDQGcFmaJgB", name: "صوت رجالي — هادئ", note: "افتراضي", google_voice: "Charon" },
      { id: "21m00Tcm4TlvDq8ikWAM", name: "صوت نسائي — واضح", note: "افتراضي", google_voice: "Kore" },
    ],
  },
};
