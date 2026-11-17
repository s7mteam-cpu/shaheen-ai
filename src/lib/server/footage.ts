import "server-only";
import { saveResult } from "@/lib/providers/storage";
import { claudeVisionJson } from "@/lib/providers/text";

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

type Cand = { id: number; duration: number; thumb: string; credit: string; portrait: boolean; file: () => { url: string } | null };
type Ctx = { topic: string; industry?: string };

async function pexelsCands(q: string, aspect: string, key: string): Promise<Cand[]> {
  const need = NEED[aspect] ?? NEED["9:16"];
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=${need.orient}&size=medium&per_page=10`, { headers: { Authorization: key } });
  if (!r.ok) return [];
  const d = (await r.json()) as { videos?: (PVideo & { image?: string; width?: number; height?: number })[] };
  return (d.videos ?? []).flatMap((v) => {
    const f = bestFile(v, aspect);
    return f && v.image ? [{ id: v.id, duration: v.duration, thumb: v.image, credit: `${v.user?.name ? `${v.user.name} · ` : ""}Pexels`, portrait: (v.height ?? 0) >= (v.width ?? 1), file: () => ({ url: f.link }) }] : [];
  });
}

type XFile = { url: string; width: number; height: number; size: number };
type XVideo = { id: number; duration: number; user?: string; picture_id?: string; videos: { large?: XFile; medium?: XFile; small?: XFile; tiny?: XFile } };

/** Pixabay (free for commercial use, no attribution needed): used when there is no Pexels key. */
async function pixabayCands(q: string, key: string): Promise<Cand[]> {
  const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&video_type=film&safesearch=true&per_page=16`);
  if (!r.ok) return [];
  const d = (await r.json()) as { hits?: XVideo[] };
  return (d.hits ?? []).flatMap((v) => {
    const f = (v.videos.large?.url && (!v.videos.large.size || v.videos.large.size < 40e6) ? v.videos.large : v.videos.medium) ?? v.videos.large;
    if (!f?.url || !v.picture_id) return [];
    return [{ id: v.id, duration: v.duration, thumb: `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg`, credit: `${v.user ? `${v.user} · ` : ""}Pixabay`, portrait: (f.height ?? 0) >= (f.width ?? 1), file: () => ({ url: f.url }) }];
  });
}

/** An art director looks at the candidates' pictures and keeps only a clip that really fits the scene (0 = none is good enough). */
async function review(cands: Cand[], q: string, text: string, ctx: Ctx): Promise<number> {
  try {
    const ok: Cand[] = [];
    await Promise.all(cands.map(async (c) => { try { const h = await fetch(c.thumb, { method: "HEAD" }); if (h.ok) ok.push(c); } catch { /* skip */ } }));
    const list = cands.filter((c) => ok.includes(c)).slice(0, 6);
    if (list.length < 2) return list.length ? 1 : 0;
    const r = await claudeVisionJson<{ pick?: number }>(
      `أنت مدير فني صارم لإعلانات خليجية احترافية. ترى صور معاينة لقطات فيديو جاهزة مرقمة. اختر رقم اللقطة الأنسب للمشهد، أو 0 إذا ما فيه واحدة مناسبة فعلاً. ارفض أي لقطة: غير مرتبطة بمعنى المشهد، مبنى مهجور أو متهدم أو متسخ، مكان فوضوي أو قديم أو مظلم، جودة سيئة، وجوه قريبة لأشخاص، كتابة أو شعارات ظاهرة، أو شكلها غير فاخر وغير مناسب لإعلان تجاري. فضّل اللقطات النظيفة والمرتبة والمضيئة والمستقرة. أعد JSON: {"pick": رقم}`,
      `فكرة الفيديو: ${ctx.topic.slice(0, 300)}\n${ctx.industry ? `المجال: ${ctx.industry}\n` : ""}نص المشهد: ${text || "-"}\nبحثنا عن: ${q}`,
      list.map((c, i) => ({ url: c.thumb, label: `لقطة ${i + 1}` })), 200, "claude-haiku-5-5");
    const n = Math.round(Number(r.pick) || 0);
    return n >= 1 && n <= list.length ? cands.indexOf(list[n - 1]) + 1 : 0;
  } catch (e) { console.error("clip review", e); return 1; } // reviewer unavailable: take the first (already sorted)
}

/** One real stock clip for a scene: candidates → reviewed → saved in our own storage (provider links are not permanent). */
export async function findClip(q: string, text: string, minSec: number, aspect: string, userId: string, jobId: string, used: Set<number>, ctx: Ctx): Promise<Clip | null> {
  if (!q.trim()) return null;
  const px = process.env.PEXELS_API_KEY, pb = process.env.PIXABAY_API_KEY;
  let cands = px ? await pexelsCands(q, aspect, px) : pb ? await pixabayCands(q, pb) : [];
  cands = cands.filter((c) => !used.has(c.id));
  const wantPortrait = aspect === "9:16" || aspect === "4:5";
  // long enough for the scene first; then the shape of the video (a tall clip is not cropped, so a shaky hand is not magnified)
  cands.sort((a, b) => Number(b.duration >= minSec) - Number(a.duration >= minSec) || Number(b.portrait === wantPortrait) - Number(a.portrait === wantPortrait));
  const n = await review(cands, q, text, ctx);
  if (!n) return null;
  const pick = cands[n - 1] ?? cands[0];
  const f = pick.file();
  if (!f) return null;
  const res = await fetch(f.url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 60 * 1024 * 1024) return null;
  used.add(pick.id);
  return { img: await saveResult(userId, jobId, buf, "video/mp4", "mp4"), credit: pick.credit, cdur: Math.max(1, pick.duration) };
}

/** Fills every "clip" scene with a real, reviewed clip. A scene with no good clip becomes a plain headline (or is dropped), so the video never shows a bad shot. */
export async function fillClips<G extends { kind: string; q?: string; img?: string; credit?: string; cdur?: number; dur: number; text?: string }>(graphics: G[], aspect: string, userId: string, jobId: string, ctx: Ctx): Promise<G[]> {
  const used = new Set<number>();
  const todo = graphics.filter((g) => g.kind === "clip" && g.q && !g.img);
  for (let i = 0; i < todo.length; i += 3) {
    await Promise.all(todo.slice(i, i + 3).map(async (g) => {
      try { const c = await findClip(g.q!, g.text ?? "", g.dur, aspect, userId, jobId, used, ctx); if (c) { g.img = c.img; g.credit = c.credit; g.cdur = c.cdur; } } catch (e) { console.error("findClip", e); }
    }));
  }
  return graphics.map((g) => (g.kind === "clip" && !g.img ? ({ ...g, kind: g.text ? "headline" : "clip" } as G) : g)).filter((g) => g.kind !== "clip" || g.img);
}
