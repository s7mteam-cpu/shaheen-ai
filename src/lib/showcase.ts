/**
 * «أعمال صُنعت بشاهين» sections: one per tool, in the order they show (shared by the admin and the app).
 * Old keys (post, carousel, reel, video, design…) are kept so works saved earlier stay in their section.
 */
export const SHOWCASE_CATS: [string, string, string][] = [
  ["post", "بوستات", "Posts"], ["carousel", "كاروسيل", "Carousels"], ["ad", "تصميم إعلانات", "Ad designs"],
  ["image", "صور بالذكاء الاصطناعي", "AI images"], ["product-photo", "تصوير منتجات", "Product photos"],
  ["reel", "ريلز", "Reels"], ["motion", "موشن جرافيك", "Motion graphics"], ["video", "مونتاج فيديو", "Video editing"],
  ["product-video", "فيديو منتج", "Product videos"], ["avatar", "فيديو بشخصية واقعية", "Avatar videos"],
  ["quran", "فيديو قرآني", "Quran videos"],
  ["voice", "أصوات", "Voice"], ["nasheed", "همهمة", "Nasheed"],
  ["design", "تصاميم", "Designs"], ["card", "بطاقات ودعوات", "Cards & invitations"], ["cv", "سيرة ذاتية", "CVs"], ["slides", "عروض تقديمية", "Presentations"],
  ["animation", "أنيميشن", "Animation"], ["creative-motion", "موشن مبتكر", "Creative motion"], ["creative-montage", "مونتاج مبتكر", "Creative montage"],
  ["real-scenes", "مشاهد واقعية", "Real scenes"], ["site-video", "فيديو موقع", "Website video"], ["creative-design", "تصميم مبتكر", "Creative design"],
  ["brand", "هوية تجارية", "Brand identity"],
  ["other", "أخرى", "Other"],
];
export type ShowcaseItem = { id: string; title: string; description: string; category: string; media_url: string; media_type: string; extra_media: string[]; sort_order: number; home_order: number | null; like_on: boolean };

/** DB row → item (the v83 columns may be missing before its SQL runs). */
export function toItem(r: Record<string, unknown>): ShowcaseItem {
  return {
    id: String(r.id), title: String(r.title ?? ""), description: String(r.description ?? ""), category: String(r.category ?? "design"),
    media_url: String(r.media_url ?? ""), media_type: String(r.media_type ?? "image"),
    extra_media: Array.isArray(r.extra_media) ? (r.extra_media as unknown[]).map(String) : [],
    sort_order: Number(r.sort_order) || 0, home_order: r.home_order == null ? null : Number(r.home_order), like_on: r.like_on !== false,
  };
}
/** The tool that makes each kind of work («سوّ مثله»). Kinds with no tool here (cards, CVs…) get no button. */
export const LIKE_TOOL: Record<string, string> = {
  post: "post", carousel: "carousel", ad: "ad-design", image: "image", "product-photo": "product-photo",
  reel: "motion-video", motion: "motion-video", video: "video-editing", "product-video": "product-video", avatar: "avatar-video",
  quran: "quran-video", voice: "voice", nasheed: "nasheed",
};
export const isVideo = (u: string) => /\.(mp4|webm|mov)(\?|$)/i.test(u);

/** Section texts (what the admin can override from «ترتيب الأقسام وشرحها»). */
export type SectionInfo = { cover_id: string; cat: string; hidden: boolean; sort_order: number; intro: string; steps: string[]; features: string[] };

export const DEFAULT_INTRO: Record<string, string> = {
  post: "بوستات جاهزة لحسابك: صورة وكلام وهاشتاقات، بهويتك وألوانك.",
  carousel: "سلايدات تتقلب بين الصور، تشرح فيها فكرتك أو منتجك خطوة خطوة.",
  ad: "تصاميم إعلانات تجذب العين وتناسب كل منصة ومقاسها.",
  image: "صور من فكرتك مباشرة، بأي أسلوب تبيه.",
  "product-photo": "صور منتجك بخلفيات وإضاءة احترافية بدون استوديو.",
  reel: "ريلز عمودي بإيقاع سريع، جاهز للنشر.",
  motion: "موشن جرافيك لأي مجال: إعلانات وشرح تعليمي، رسوم وعناوين وأرقام تتحرك بشكل أنيق.",
  video: "مونتاج فيديو من لقطاتك: قص وترجمة وموسيقى.",
  "product-video": "فيديو يعرض منتجك من كل زاوية ويحفّز على الشراء.",
  avatar: "شخصية واقعية تتكلم عن مشروعك بصوتها وحركتها.",
  quran: "فيديوهات قرآنية بخط وصوت وخلفيات هادئة.",
  voice: "أصوات طبيعية للتعليق والإعلانات.",
  nasheed: "همهمات وأناشيد بدون آلات موسيقية.",
  design: "تصاميم متنوعة بهويتك.",
  card: "بطاقات ودعوات جاهزة للمناسبات.",
  cv: "سيرة ذاتية مرتبة بتصميم احترافي.",
  slides: "عروض تقديمية كاملة من فكرتك.",
  animation: "فيديوهات أنيميشن برسوم متحركة تحكي فكرتك بأسلوب ممتع.",
  "creative-motion": "موشن مبتكر: غرافيكس وحركة مصممة خصيصاً لفكرتك.",
  "creative-montage": "مونتاج مبتكر: غرافيكس ومؤثرات فوق فيديوك وصوتك.",
  "real-scenes": "مشاهد واقعية بالذكاء الاصطناعي تجسّد فكرتك.",
  "site-video": "فيديو يعرض موقعك أو منتجك الرقمي بشكل جذاب.",
  "creative-design": "تصاميم مبتكرة تنولد من فكرتك بشكل فريد.",
  brand: "هوية تجارية كاملة: شعار وألوان وخطوط.",
  other: "أعمال أخرى من شاهين.",
};
export const DEFAULT_STEPS = ["اختر الأداة من حسابك", "اكتب فكرتك أو ارفع صورتك", "استلم النتيجة وحمّلها أو انشرها"];

/** which gallery category shows a tool's examples («أمثلة» button on the tool card) */
export const TOOL_EXAMPLE_CAT: Record<string, string> = {
  post: "post", carousel: "carousel", "ad-design": "ad", image: "image", "motion-video": "motion", "free-motion": "motion",
  "site-video": "motion", "real-scenes": "reel", "quran-video": "quran", "video-editing": "video", "product-video": "product-video",
  "avatar-video": "avatar", "anim-video": "animation", "free-montage": "creative-montage", "site-free": "site-video", "brand-identity": "brand", voice: "voice", presentations: "slides", "business-cards": "card", invitations: "card", cv: "cv",
};
/** tool id → gallery category, only for tools that already have at least one example in the gallery */
export function exampleCats(items: { category: string }[]): Record<string, string> {
  const have = new Set(items.map((i) => i.category));
  const out: Record<string, string> = {};
  for (const [tool, cat] of Object.entries(TOOL_EXAMPLE_CAT)) if (have.has(cat)) out[tool] = cat;
  return out;
}
