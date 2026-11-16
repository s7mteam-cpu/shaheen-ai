import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVideo } from "@/lib/showcase";

export type LikeWork = { id: string; title: string; category: string; image: string | null; images: string[]; recipe: string };

/** A published showcase work used as the style of a new one («سوّ مثله»). Videos have no still image yet, so `image` is null for them. */
export async function loadLike(id: unknown): Promise<LikeWork | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("gallery_items").select("id,title,category,media_url,media_type,extra_media,recipe").eq("id", id).eq("is_published", true).maybeSingle();
  if (!data) return null;
  const all = [data.media_url, ...((data.extra_media as string[] | null) ?? [])].filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u) && !isVideo(u));
  return { id: data.id, title: data.title ?? "", category: data.category ?? "design", image: all[0] ?? null, images: all.slice(0, 3), recipe: String(data.recipe ?? "") };
}

export const likeText = (w: LikeWork) =>
  `هذا العميل اختار العمل «${w.title}» وطلب عملاً بنفس الأسلوب. قلّد أسلوبه: التخطيط، التكوين، الألوان، الإحساس والعناصر، لكن المحتوى والنصوص والمنتج كلها من معلومات العميل (لا تنسخ نصوص العمل المرجعي).` +
  (w.recipe.trim() ? `\nملاحظات عن أسلوب العمل: ${w.recipe.trim()}` : "");
