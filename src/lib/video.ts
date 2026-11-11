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
