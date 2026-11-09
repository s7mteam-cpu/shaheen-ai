// Fallback content used until the database is connected.
// The live values come from Supabase and are edited from /admin.

export type Plan = {
  id: string;
  name: string;
  subtitle: string | null;
  price_kwd: number;
  credits: number;
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
  category: "image" | "video" | "audio";
  icon: string;
  credit_cost: number;
  edit_cost: number;
  cost_unit: string;
  provider: string | null;
  provider_model: string | null;
  is_enabled: boolean;
  sort_order: number;
};

export type SiteContent = {
  hero: { badge: string; title: string; highlight: string; subtitle: string; cta_primary: string; cta_secondary: string; points: string[]; image: string };
  steps: { title: string; subtitle: string; items: { title: string; body: string }[] };
  tools_section: { eyebrow: string; title: string };
  gallery: { title: string; subtitle: string };
  pricing: { title: string; subtitle: string };
  faq: { items: { q: string; a: string }[] };
  final_cta: { title: string; subtitle: string; cta: string };
  footer: { tagline: string; company: string; whatsapp: string; email: string; instagram: string };
  legal: { terms: string; privacy: string; refund: string };
  voices: { items: { id: string; name: string; note: string; google_voice?: string }[] };
  ai: { copy_provider: string; copy_model: string; chat_provider: string; chat_model: string };
  managed_service: { enabled: boolean; title: string; price_kwd: string; period: string; features: string[]; cta: string; whatsapp: string; whatsapp_message: string; thanks: string };
};

export const defaultPlans: Plan[] = [
  { id: "starter", name: "البداية", subtitle: "لأصحاب المشاريع الصغيرة", price_kwd: 30, credits: 500, features: ["كل الأدوات", "هويتك التجارية على كل تصميم", "دعم فني بالعربي"], stripe_price_id: null, is_featured: false, is_active: true, sort_order: 1 },
  { id: "shaheen", name: "الشاهين", subtitle: "للمتاجر والمشاريع النشطة", price_kwd: 60, credits: 1000, features: ["كل الأدوات", "هويتك التجارية على كل تصميم", "دعم فني بالعربي"], stripe_price_id: null, is_featured: true, is_active: true, sort_order: 2 },
  { id: "golden", name: "الصقر الذهبي", subtitle: "للوكالات وصنّاع المحتوى", price_kwd: 90, credits: 1500, features: ["كل الأدوات", "أولوية في التنفيذ", "أولوية في الدعم الفني"], stripe_price_id: null, is_featured: false, is_active: true, sort_order: 3 },
];

export const defaultTools: Tool[] = [
  { id: "image", provider: "fal", name: "إنشاء الصور وتعديلها", description: "اكتب ما تتخيله، أو ارفع صورتك واطلب التعديل: خلفية جديدة، إزالة عنصر، تحسين جودة.", category: "image", icon: "sparkles", credit_cost: 2, edit_cost: 2, cost_unit: "صورة", provider_model: "fal-ai/nano-banana-2", is_enabled: true, sort_order: 1 },
  { id: "product-photo", provider: "fal", name: "تصوير المنتجات", description: "صوّر منتجك بالجوال، ونحوّله لصور استوديو احترافية بخلفيات وإضاءة فاخرة.", category: "image", icon: "camera", credit_cost: 2, edit_cost: 2, cost_unit: "صورة", provider_model: "fal-ai/nano-banana-pro/edit", is_enabled: true, sort_order: 2 },
  { id: "ad-design", provider: "fal", name: "تصميم الإعلانات", description: "زاوية تسويقية ونص إعلاني وصورة لكل إعلان، جاهزة للنشر على السوشال ميديا.", category: "image", icon: "megaphone", credit_cost: 3, edit_cost: 2, cost_unit: "إعلان", provider_model: "fal-ai/nano-banana-pro", is_enabled: true, sort_order: 3 },
  { id: "motion-video", provider: "fal", name: "فيديو موشن جرافيك", description: "ريلز بحركة سينمائية ونصوص وموسيقى خلفية، بهويتك وألوانك.", category: "video", icon: "film", credit_cost: 9, edit_cost: 5, cost_unit: "10 ثوانٍ", provider_model: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video", is_enabled: true, sort_order: 4 },
  { id: "avatar-video", provider: "fal", name: "فيديو بشخصية واقعية", description: "شخصية تقدّم منتجك وتتكلم بلهجة جمهورك، بدون تصوير ولا ممثلين.", category: "video", icon: "user", credit_cost: 15, edit_cost: 5, cost_unit: "فيديو", provider_model: "fal-ai/kling-video/ai-avatar/v2/standard", is_enabled: true, sort_order: 5 },
  { id: "video-editing", provider: "elevenlabs", name: "مونتاج الفيديو", description: "ارفع فيديوك الخام، ونقصّ الأجزاء الفاضية ونضيف ترجمة عربية ونجهّزه لكل منصة.", category: "video", icon: "scissors", credit_cost: 4, edit_cost: 3, cost_unit: "دقيقة", provider_model: null, is_enabled: true, sort_order: 6 },
  { id: "voice", provider: "elevenlabs", name: "إنشاء أصوات حقيقية", description: "أصوات طبيعية بأكثر من 20 لهجة، واستنساخ صوتك بموافقتك.", category: "audio", icon: "mic", credit_cost: 1, edit_cost: 1, cost_unit: "500 حرف", provider_model: null, is_enabled: true, sort_order: 7 },
  { id: "nasheed", provider: "elevenlabs", name: "أناشيد وهمهمات", description: "أناشيد بأصوات بشرية وهمهمات خلفية بدون آلات موسيقية، للمحتوى الديني والمحافظ.", category: "audio", icon: "waves", credit_cost: 3, edit_cost: 3, cost_unit: "30 ثانية", provider_model: null, is_enabled: true, sort_order: 8 },
];

export const defaultContent: SiteContent = {
  hero: {
    badge: "منصة عربية لصناعة المحتوى بالذكاء الاصطناعي",
    title: "حوّل فكرتك إلى محتوى",
    highlight: "يبيع",
    subtitle: "شاهين استوديو المحتوى العربي لمشروعك: صور منتجات، فيديوهات، إعلانات وتعليق صوتي بلهجة جمهورك — كلها من مكان واحد، وبهويتك أنت.",
    cta_primary: "اشترك الآن",
    cta_secondary: "استكشف الأدوات",
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
  gallery: { title: "أعمال صُنعت بشاهين", subtitle: "نماذج حقيقية من المنصة." },
  pricing: { title: "اختر باقتك الشهرية", subtitle: "كل أداة تعرض تكلفتها بالريشة قبل التنفيذ. ألغِ أو غيّر باقتك في أي وقت." },
  faq: {
    items: [
      { q: "ما هي «الريشة»؟", a: "هي رصيدك داخل شاهين. كل أداة تعرض عدد الريش التي تحتاجها قبل التنفيذ، وإذا فشل الطلب ترجع لك تلقائياً." },
      { q: "هل أحتاج خبرة في التصميم؟", a: "لا. تكتب فكرتك بالعربي وتختار الأداة، والتعديلات بضغطة زر." },
      { q: "هل أقدر ألغي اشتراكي؟", a: "نعم، من صفحة الحساب في أي وقت بضغطة واحدة، وتبقى أعمالك محفوظة." },
      { q: "هل الأعمال ملكي؟", a: "[اكتب هنا شروط الاستخدام التجاري]" },
    ],
  },
  final_cta: { title: "جاهز تحلّق بمحتواك؟", subtitle: "اختر باقتك واصنع أول إعلان لمشروعك اليوم.", cta: "اختر باقتك" },
  footer: { tagline: "أدوات الذكاء الاصطناعي لصناعة المحتوى، بالعربي.", company: "[اسم الشركة والسجل التجاري]", whatsapp: "+96550993895", email: "", instagram: "" },
  legal: {
    terms: "[اكتب شروط الاستخدام هنا من لوحة الإدارة]",
    privacy: "[اكتب سياسة الخصوصية هنا من لوحة الإدارة]",
    refund: "[اكتب سياسة الاسترجاع والإلغاء هنا من لوحة الإدارة]",
  },
  ai: { copy_provider: "claude", copy_model: "claude-haiku-5-5", chat_provider: "claude", chat_model: "claude-haiku-5-5" },
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
  // ElevenLabs voice ids. Replace with Gulf-dialect voices from the ElevenLabs voice library via /admin.
  voices: {
    items: [
      { id: "pNInz6obpgDQGcFmaJgB", name: "صوت رجالي — هادئ", note: "افتراضي", google_voice: "Charon" },
      { id: "21m00Tcm4TlvDq8ikWAM", name: "صوت نسائي — واضح", note: "افتراضي", google_voice: "Kore" },
    ],
  },
};
