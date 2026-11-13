/** «معرض شاهين» categories (shared by the admin and the app). */
export const SHOWCASE_CATS: [string, string, string][] = [
  ["post", "بوستات", "Posts"], ["carousel", "كاروسيل", "Carousels"], ["reel", "ريلز", "Reels"], ["video", "فيديو ومونتاج", "Video & editing"],
  ["design", "تصاميم", "Designs"], ["card", "بطاقات ودعوات", "Cards & invitations"], ["cv", "سيرة ذاتية", "CVs"], ["slides", "عروض تقديمية", "Presentations"],
  ["voice", "أصوات", "Voice"], ["other", "أخرى", "Other"],
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
