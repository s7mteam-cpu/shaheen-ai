/** YouTube helpers for the tool demo videos (watch, youtu.be, shorts and embed links all work). */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
export const isShorts = (url?: string | null) => Boolean(url && /youtube\.com\/shorts\//.test(url));
/** The picture on the card: the one the admin uploaded, otherwise YouTube's own thumbnail. */
export function demoThumb(t: { demo_url?: string | null; demo_thumb?: string | null }): string | null {
  if (t.demo_thumb) return t.demo_thumb;
  const id = youtubeId(t.demo_url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** Ready illustrations in /public/covers (the admin's own picture always wins). */
const COVERS = ["post", "image", "carousel", "motion-video", "lesson-video", "quran-video", "video-editing", "product-video", "avatar-video", "ad-design", "voice", "nasheed", "product-photo"];
/** The picture on a tool card: the admin's upload → our ready illustration → the demo video's thumbnail. */
export function toolCover(t: { id: string; cover_url?: string | null; demo_url?: string | null; demo_thumb?: string | null }): string | null {
  return t.cover_url || (COVERS.includes(t.id) ? `/covers/${t.id}.svg` : null) || demoThumb(t);
}
