/**
 * «أعمال صُنعت بشاهين» sections: one per tool, in the order they show (shared by the admin and the app).
 * Old keys (post, carousel, reel, video, design…) are kept so works saved earlier stay in their section.
 */
export const SHOWCASE_CATS: [string, string, string][] = [
  ["post", "بوستات", "Posts"], ["carousel", "كاروسيل", "Carousels"], ["ad", "تصميم إعلانات", "Ad designs"],
  ["image", "صور بالذكاء الاصطناعي", "AI images"], ["product-photo", "تصوير منتجات", "Product photos"],
  ["reel", "ريلز", "Reels"], ["motion", "موشن جرافيك", "Motion graphics"], ["video", "مونتاج فيديو", "Video editing"],
  ["product-video", "فيديو منتج", "Product videos"], ["avatar", "فيديو بشخصية واقعية", "Avatar videos"],
  ["lesson", "فيديو تعليمي", "Lesson videos"], ["quran", "فيديو قرآني", "Quran videos"],
  ["voice", "أصوات", "Voice"], ["nasheed", "همهمة", "Nasheed"],
  ["design", "تصاميم", "Designs"], ["card", "بطاقات ودعوات", "Cards & invitations"], ["cv", "سيرة ذاتية", "CVs"], ["slides", "عروض تقديمية", "Presentations"],
  ["other", "أخرى", "Other"],
];
export type ShowcaseItem = { id: string; title: string; description: string; category: string; media_url: string; media_type: string; extra_media: string[] };

/** DB row → item (the v83 columns may be missing before its SQL runs). */
export function toItem(r: Record<string, unknown>): ShowcaseItem {
  return {
    id: String(r.id), title: String(r.title ?? ""), description: String(r.description ?? ""), category: String(r.category ?? "design"),
    media_url: String(r.media_url ?? ""), media_type: String(r.media_type ?? "image"),
    extra_media: Array.isArray(r.extra_media) ? (r.extra_media as unknown[]).map(String) : [],
  };
}
export const isVideo = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/** Section texts (what the admin can override from «ترتيب الأقسام وشرحها»). */
export type SectionInfo = { cat: string; hidden: boolean; sort_order: number; intro: string; steps: string[]; features: string[] };

export const DEFAULT_INTRO: Record<string, string> = {
  post: "بوستات جاهزة لحسابك: صورة وكلام وهاشتاقات، بهويتك وألوانك.",
  carousel: "سلايدات تتقلب بين الصور، تشرح فيها فكرتك أو منتجك خطوة خطوة.",
  ad: "تصاميم إعلانات تجذب العين وتناسب كل منصة ومقاسها.",
  image: "صور من فكرتك مباشرة، بأي أسلوب تبيه.",
  "product-photo": "صور منتجك بخلفيات وإضاءة احترافية بدون استوديو.",
  reel: "ريلز عمودي بإيقاع سريع، جاهز للنشر.",
  motion: "موشن جرافيك: عناوين وأرقام وشعارات تتحرك بشكل أنيق.",
  video: "مونتاج فيديو من لقطاتك: قص وترجمة وموسيقى.",
  "product-video": "فيديو يعرض منتجك من كل زاوية ويحفّز على الشراء.",
  avatar: "شخصية واقعية تتكلم عن مشروعك بصوتها وحركتها.",
  lesson: "فيديوهات تعليمية مرتبة وواضحة.",
  quran: "فيديوهات قرآنية بخط وصوت وخلفيات هادئة.",
  voice: "أصوات طبيعية للتعليق والإعلانات.",
  nasheed: "همهمات وأناشيد بدون آلات موسيقية.",
  design: "تصاميم متنوعة بهويتك.",
  card: "بطاقات ودعوات جاهزة للمناسبات.",
  cv: "سيرة ذاتية مرتبة بتصميم احترافي.",
  slides: "عروض تقديمية كاملة من فكرتك.",
  other: "أعمال أخرى من شاهين.",
};
export const DEFAULT_STEPS = ["اختر الأداة من حسابك", "اكتب فكرتك أو ارفع صورتك", "استلم النتيجة وحمّلها أو انشرها"];
