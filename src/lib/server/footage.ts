import "server-only";
import { saveResult } from "@/lib/providers/storage";
import sharp from "sharp";
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
  if (!r.ok) { lastErr = `Pexels ${r.status}`; console.error("pexels", lastErr); return []; }
  const d = (await r.json()) as { videos?: (PVideo & { image?: string; width?: number; height?: number })[] };
  return (d.videos ?? []).flatMap((v) => {
    const f = bestFile(v, aspect);
    return f && v.image && !BAD.test(String((v as { url?: string }).url ?? "")) ? [{ id: v.id, duration: v.duration, thumb: v.image, credit: `${v.user?.name ? `${v.user.name} · ` : ""}Pexels`, portrait: (v.height ?? 0) >= (v.width ?? 1), file: () => ({ url: f.link }) }] : [];
  });
}

/** Never-ok shots for a Gulf business ad, rejected by the provider's own tags/slug before any reviewer looks. */
const BAD = /concert|rock music|rock band|party|disco|nightclub|night club|club\b|dance|dancing|casino|festival|crowd cheering|bar\b|alcohol|beer|wine|bikini|lingerie|sexy|stage lights|dj\b/i;

type XFile = { url: string; width: number; height: number; size: number };
type XVideo = { tags?: string; id: number; duration: number; user?: string; picture_id?: string; videos: { large?: XFile; medium?: XFile; small?: XFile; tiny?: XFile } };

/** Pixabay (free for commercial use, no attribution needed): used when there is no Pexels key. */
async function pixabayCands(q: string, key: string): Promise<Cand[]> {
  const r = await fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q.slice(0, 100))}&safesearch=true&per_page=20`);
  if (!r.ok) { const t = await r.text().catch(() => ""); lastErr = `Pixabay ${r.status} ${t.slice(0, 80)}`; console.error("pixabay", lastErr); return []; }
  const d = (await r.json()) as { hits?: XVideo[] };
  return (d.hits ?? []).flatMap((v) => {
    const vf = v.videos as Record<string, (XFile & { thumbnail?: string }) | undefined>;
    const f = (vf.large?.url && (!vf.large.size || vf.large.size < 40e6) ? vf.large : vf.medium) ?? vf.large ?? vf.small;
    if (!f?.url || BAD.test(v.tags ?? "")) return [];
    const thumb = vf.medium?.thumbnail || vf.large?.thumbnail || vf.small?.thumbnail || (v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_640x360.jpg` : "");
    return [{ id: v.id, duration: v.duration, thumb, credit: `${v.user ? `${v.user} · ` : ""}Pixabay`, portrait: (f.height ?? 0) >= (f.width ?? 1), file: () => ({ url: f.url }) }];
  });
}

let lastErr = "";
const stats = { found: 0, seen: 0, noPick: 0, vetoed: 0 };
export const footageError = () => lastErr || `found ${stats.found}, loaded ${stats.seen}, rejected-by-review ${stats.noPick}, vetoed ${stats.vetoed}`;


/** Anthropic cannot always fetch a provider's thumbnail URL itself (400), so we download it, shrink it and send the picture inline. */
async function thumbData(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const buf = await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 512, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch { return null; }
}
/** Keeps only candidates whose picture we could actually load, and swaps in the inline copy. */
async function withPictures(cands: Cand[]): Promise<Cand[]> {
  const top = cands.slice(0, 6);
  const got = await Promise.all(top.map(async (c) => { const d = await thumbData(c.thumb); return d ? { ...c, thumb: d } : null; }));
  const ok = got.filter((c): c is Cand => !!c);
  if (!ok.length && top.length) lastErr = "thumbnails could not be loaded";
  return ok;
}

/** An art director looks at the candidates' pictures and picks the best fit. Returns its 1-based number, or 0 when even the best is not good enough. */
async function review(cands: Cand[], q: string, text: string, ctx: Ctx, minScore = 6): Promise<number> {
  const list = cands.slice(0, 6);
  if (!list.length) return 0;
  try {
    const r = await claudeVisionJson<{ pick?: number; score?: number }>(
      `أنت مدير فني صارم لإعلانات خليجية (الكويت) راقية تُعرض لجمهور محافظ. ترى صور معاينة لقطات فيديو جاهزة مرقمة. اختر أنسب لقطة لمعنى المشهد وأعطها درجة من 0 إلى 10. لا تعطِ فوق 6 إلا إذا كانت اللقطة: تطابق معنى الجملة فعلاً (قاعة تدريب تبان قاعة محاضرات أو مؤتمر، مدرّب يبان مدرّب...)، بيئة مهنية راقية ونظيفة ومضيئة، وكل من فيها بلباس رسمي محتشم ومحترم. أعطِ أقل من 4 لأي لقطة فيها: ملهى أو ديسكو أو كازينو أو حفلة أو رقص أو إضاءة ملونة أو دخان أو مشروبات كحولية، أو لباس كاشف أو غير رسمي أو غير لائق، أو سلوك غير مهني، أو مبنى مهجور أو متسخ أو مكان مظلم أو فوضوي، أو علاقتها بالمعنى ضعيفة، أو وجه قريب جداً، أو كتابة وشعارات واضحة، أو أشرطة سوداء أو حواف فارغة حول الصورة أو صورة لا تملأ الإطار، أو جودة سيئة. اللقطة المتوسطة المقبولة أفضل من لقطة مبهرة غير مناسبة. أعد JSON فقط يبدأ بـ { مباشرة بلا أي شرح: {"pick": رقم اللقطة, "score": الدرجة}`,
      `فكرة الفيديو: ${ctx.topic.slice(0, 300)}\n${ctx.industry ? `المجال: ${ctx.industry}\n` : ""}نص المشهد: ${text || "-"}\nبحثنا عن: ${q}`,
      list.map((c, i) => ({ url: c.thumb, label: `لقطة ${i + 1}` })), 600, "claude-sonnet-5-5");
    const n = Math.round(Number(r.pick) || 0), score = Number(r.score);
    if (n < 1 || n > list.length) return 0;
    return Number.isFinite(score) && score < minScore ? 0 : n;
  } catch (e) { lastErr = `review failed: ${(e as Error).message?.slice(0, 240)}`; console.error("clip review", e); return 0; } // never show a shot nobody checked
}


/** Plain Arabic nouns → the simple English word stock sites index best. A named place in the text wins over whatever the writer guessed. */
const WORDS: [RegExp, string][] = [
  [/مدرب|مدربة|محاضر|محاضرة|تشرح|يشرح/, "business trainer presenting meeting room"], [/قاعة|جمهور|حضور|الحضور|ورشة|ورشه|دورة تدريبية|ندوة|مؤتمر/, "business workshop training room people"],
  [/مصافحة|مصافحه|اتفاق|شراكة/, "business handshake office"], [/يفكر|حيرة|محتار|ضغط|توتر/, "businessman thinking office desk"], [/نقاش|تبادل|حوار|اجتماع/, "business meeting discussion"],
  [/فندق|فنادق|نزل|منتجع/, "hotel"], [/مطعم|مطاعم|وجبة|عشاء|غداء/, "restaurant food"], [/كافيه|مقهى|قهوة|كوفي/, "coffee shop"],
  [/برج|ابراج|أبراج|ناطحة/, "skyscraper"], [/شقة|شقق|عقار|عقارات|فيلا|منزل|بيت/, "apartment interior"], [/بحر|إطلالة|اطلالة|شاطئ|شاطيء/, "sea view"],
  [/سيارة|سيارات|معرض سيارات/, "car"], [/عيادة|طبيب|اسنان|أسنان|مستشفى/, "dentist clinic"], [/صالون|حلاقة|تجميل|مكياج/, "beauty salon"],
  [/جيم|نادي رياضي|رياضة|تمرين/, "gym workout"], [/مدرسة|تعليم|دورة|طلاب|جامعة/, "students learning"], [/سفر|رحلة|رحلات|طيران|حجز طيران/, "travel airplane"],
  [/متجر|تسوق|مول|ملابس|أزياء|ازياء/, "shopping fashion"], [/توصيل|طلبات|شحن/, "delivery"], [/شركة|مكتب|اجتماع|أعمال|اعمال/, "business office"],
  [/عائلة|اسرة|أسرة|اطفال|أطفال/, "family"], [/عطر|عطور|عود|بخور/, "perfume"], [/مجوهرات|ذهب|خاتم|الماس|ألماس/, "jewelry"],
  [/تصميم|ديكور|اثاث|أثاث/, "interior design"], [/تقسيط|تمويل|بنك|قرض/, "business finance"],
];
const wordQ = (text: string) => WORDS.find(([re]) => re.test(text))?.[1] ?? "";


/** Second, stricter look at the single chosen shot: any doubt means no. Works for any subject, no word lists needed. */
async function verify(c: Cand, text: string, ctx: Ctx): Promise<boolean> {
  try {
    const r = await claudeVisionJson<{ ok?: boolean; why?: string }>(
      `أنت مدقق جودة نهائي لإعلان خليجي (الكويت) راقٍ لجمهور محافظ. ترى لقطة واحدة. أجب ok=true فقط إذا كانت: (1) تعبّر فعلاً عن معنى جملة المشهد، (2) بيئة مهنية راقية ونظيفة ومضيئة، (3) كل من فيها بلباس رسمي محتشم وسلوك مهني، (4) ليس فيها حفلة أو رقص أو ملهى أو كحول أو إضاءة ملونة أو تجمع صاخب أو أشرطة سوداء. أي شك أو لقطة مقبولة بالكاد = ok=false. أعد JSON فقط يبدأ بـ { مباشرة بلا أي شرح: {"ok": true|false, "why": "سبب قصير"}`,
      `فكرة الفيديو: ${ctx.topic.slice(0, 300)}\nنص المشهد: ${text || "-"}`,
      [{ url: c.thumb, label: "اللقطة" }], 600, "claude-sonnet-5-5");
    return r.ok === true;
  } catch (e) { lastErr = `verify failed: ${(e as Error).message?.slice(0, 240)}`; console.error("clip verify", e); return false; }
}

/** One real stock clip for a scene: candidates → reviewed → saved in our own storage (provider links are not permanent). */
export async function findClip(q: string, text: string, minSec: number, aspect: string, userId: string, jobId: string, used: Set<number>, ctx: Ctx): Promise<Clip | null> {
  if (!q.trim()) return null;
  const px = process.env.PEXELS_API_KEY, pb = process.env.PIXABAY_API_KEY;
  const wantPortrait = aspect === "9:16" || aspect === "4:5";
  const tryOnce = async (query: string, strict: boolean) => {
    let all = px ? await pexelsCands(query, aspect, px) : [];
    if (!all.length && pb) all = await pixabayCands(query, pb);
    const pre = all.filter((c) => !used.has(c.id));
    // long enough for the scene first; then the shape of the video (a tall clip is not cropped, so a shaky hand is not magnified)
    pre.sort((x, y) => Number(y.duration >= minSec) - Number(x.duration >= minSec) || Number(y.portrait === wantPortrait) - Number(x.portrait === wantPortrait));
    const cands = await withPictures(pre);
    stats.found += all.length; stats.seen += cands.length;
    for (let k = 0; k < (strict ? 3 : 1) && cands.length; k++) { // pick → strict check → if it fails, the next best
      const n = await review(cands, query, text, ctx, strict ? 6 : 4);
      if (!n) { stats.noPick++; return null; }
      if (!strict || (await verify(cands[n - 1], text, ctx))) return cands[n - 1];
      stats.vetoed++;
      cands.splice(n - 1, 1);
    }
    return null;
  };
  const words = q.trim().split(/\s+/);
  const named = wordQ(text);
  const tries = [...new Set([named, q.trim(), words.slice(0, 3).join(" "), words.slice(0, 2).join(" "), words[0]].filter(Boolean))];
  let pick: Cand | null = null;
  for (const strict of [true, false]) { // first the strict standard on every wording; only then a looser one (still never a banned shot)
    for (const t of tries) { pick = await tryOnce(t, strict); if (pick) break; }
    if (pick) break;
  }
  if (!pick) return null;
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
  Object.assign(stats, { found: 0, seen: 0, noPick: 0, vetoed: 0 }); lastErr = "";
  const todo = graphics.filter((g) => g.kind === "clip" && g.q && !g.img);
  for (let i = 0; i < todo.length; i += 3) {
    await Promise.all(todo.slice(i, i + 3).map(async (g) => {
      try { const c = await findClip(g.q!, g.text ?? "", g.dur, aspect, userId, jobId, used, ctx); if (c) { g.img = c.img; g.credit = c.credit; g.cdur = c.cdur; } } catch (e) { console.error("findClip", e); }
    }));
  }
  // a scene with no clip of its own borrows a clip already found (not the neighbour's), so the video stays real footage instead of turning into a plain background
  const good = graphics.filter((g) => g.kind === "clip" && g.img);
  if (good.length) {
    graphics.forEach((g, i) => {
      if (g.kind !== "clip" || g.img) return;
      const near = new Set([graphics[i - 1]?.img, graphics[i + 1]?.img]);
      const pool = good.filter((x) => !near.has(x.img));
      const src = (pool.length ? pool : good)[i % (pool.length || good.length)];
      g.img = src.img; g.credit = src.credit; g.cdur = src.cdur;
    });
  }
  return graphics.map((g) => (g.kind === "clip" && !g.img ? ({ ...g, kind: g.text ? "headline" : "clip" } as G) : g)).filter((g) => g.kind !== "clip" || g.img);
}
