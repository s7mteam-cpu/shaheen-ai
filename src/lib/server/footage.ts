import "server-only";
import { saveResult } from "@/lib/providers/storage";

type PFile = { quality: string; file_type: string; width: number | null; height: number | null; link: string };
type PVideo = { id: number; duration: number; url: string; user?: { name?: string }; video_files: PFile[] };
type Clip = { img: string; credit: string; cdur: number };

const NEED: Record<string, { w: number; h: number; orient: string }> = {
  "9:16": { w: 720, h: 1280, orient: "portrait" },
  "16:9": { w: 1280, h: 720, orient: "landscape" },
  "1:1": { w: 720, h: 720, orient: "square" },
  "4:5": { w: 720, h: 900, orient: "portrait" },
};

export const footageReady = () => !!(process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY);

/** The smallest mp4 that is still sharp enough for the video's shape (keeps the download light). */
function bestFile(v: PVideo, aspect: string): PFile | null {
  const need = NEED[aspect] ?? NEED["9:16"];
  const mp4 = v.video_files.filter((f) => f.file_type === "video/mp4" && f.width && f.height && f.link);
  const ok = mp4.filter((f) => (f.width as number) >= need.w && (f.height as number) >= need.h).sort((a, b) => (a.width as number) * (a.height as number) - (b.width as number) * (b.height as number));
  return ok[0] ?? mp4.sort((a, b) => (b.width as number) * (b.height as number) - (a.width as number) * (a.height as number))[0] ?? null;
}

/** One real stock clip for a search phrase: saved in our own storage (the provider's links are not permanent). Free for commercial use (Pexels). */
export async function findClip(q: string, minSec: number, aspect: string, userId: string, jobId: string, used: Set<number>): Promise<Clip | null> {
  if (!q.trim()) return null;
  const key = process.env.PEXELS_API_KEY;
  if (!key) return findPixabay(q, minSec, userId, jobId, used);
  const need = NEED[aspect] ?? NEED["9:16"];
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=${need.orient}&size=medium&per_page=12`, { headers: { Authorization: key } });
  if (!r.ok) return null;
  const d = (await r.json()) as { videos?: PVideo[] };
  const list = (d.videos ?? []).filter((v) => !used.has(v.id));
  // clips long enough for the scene first, then the rest; short and calm clips are cheaper and fit the voice better
  const pick = [...list.filter((v) => v.duration >= minSec), ...list.filter((v) => v.duration < minSec)].find((v) => bestFile(v, aspect));
  if (!pick) return null;
  const f = bestFile(pick, aspect)!;
  const res = await fetch(f.link);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 60 * 1024 * 1024) return null;
  used.add(pick.id);
  return { img: await saveResult(userId, jobId, buf, "video/mp4", "mp4"), credit: `${pick.user?.name ? `${pick.user.name} · ` : ""}Pexels`, cdur: Math.max(1, pick.duration) };
}

/** Fills every "clip" scene with a real clip. A scene that finds nothing becomes a plain headline so the video never has a hole. */
export async function fillClips<G extends { kind: string; q?: string; img?: string; credit?: string; cdur?: number; dur: number; text?: string }>(graphics: G[], aspect: string, userId: string, jobId: string): Promise<G[]> {
  const used = new Set<number>();
  const todo = graphics.filter((g) => g.kind === "clip" && g.q && !g.img);
  for (let i = 0; i < todo.length; i += 4) { // 4 at a time: friendly to the free plan's rate limit
    await Promise.all(todo.slice(i, i + 4).map(async (g) => {
      try { const c = await findClip(g.q!, g.dur, aspect, userId, jobId, used); if (c) { g.img = c.img; g.credit = c.credit; g.cdur = c.cdur; } } catch (e) { console.error("findClip", e); }
    }));
  }
  return graphics.map((g) => (g.kind === "clip" && !g.img ? ({ ...g, kind: g.text ? "headline" : "clip" } as G) : g)).filter((g) => g.kind !== "clip" || g.img);
}

type XFile = { url: string; width: number; height: number; size: number };
type XVideo = { id: number; duration: number; user?: string; videos: { large?: XFile; medium?: XFile; small?: XFile; tiny?: XFile } };

/** Pixabay (free for commercial use, no attribution needed): used when there is no Pexels key. Same job: one real clip, saved in our storage. */
async function findPixabay(q: string, minSec: number, userId: string, jobId: string, used: Set<number>): Promise<Clip | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&video_type=film&safesearch=true&per_page=12`);
  if (!r.ok) return null;
  const d = (await r.json()) as { hits?: XVideo[] };
  const list = (d.hits ?? []).filter((v) => !used.has(v.id));
  const pick = [...list.filter((v) => v.duration >= minSec), ...list.filter((v) => v.duration < minSec)].find((v) => v.videos.large?.url || v.videos.medium?.url);
  if (!pick) return null;
  const f = (pick.videos.large?.url && (!pick.videos.large.size || pick.videos.large.size < 40e6) ? pick.videos.large : pick.videos.medium) ?? pick.videos.large!;
  const res = await fetch(f.url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 60 * 1024 * 1024) return null;
  used.add(pick.id);
  return { img: await saveResult(userId, jobId, buf, "video/mp4", "mp4"), credit: `${pick.user ? `${pick.user} · ` : ""}Pixabay`, cdur: Math.max(1, pick.duration) };
}
