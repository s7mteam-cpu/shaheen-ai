import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { saveFromUrl, saveResult } from "@/lib/providers/storage";
import { config } from "@/lib/tools/run";
import { stylePrompt } from "@/remotion/styles";

/** One AI-drawn scene for a video, in the chosen illustration style. Returns the storage path in "results". */
export async function illustrate(userId: string, jobId: string, prompt: string, style: string | undefined, aspect: string) {
  const { provider, model } = await config("image");
  const ar = aspect === "16:9" ? "16:9" : aspect === "1:1" ? "1:1" : "9:16";
  const full = `${prompt}. Style: ${stylePrompt(style)}. Full-bleed artwork that fills the entire ${ar} frame edge to edge: no border, no frame, no white margins, no letterbox bars, no collage or split panels. Keep the main subject well inside the frame, not cut off by the edges. Composition leaves calm empty space at the top for a title. Absolutely no text, no letters, no numbers, no captions, no logos, no watermark.`;
  if (provider === "google") {
    const r = await geminiImage(model, full, [], ar);
    const f = await fitToAspect(r.bytes, ar);
    return f ? saveResult(userId, jobId, f, "image/jpeg", "jpg") : saveResult(userId, jobId, r.bytes, r.type, r.type.includes("png") ? "png" : "jpg");
  }
  const data = await falRun(model.replace(/\/edit$/, ""), { prompt: full, num_images: 1, aspect_ratio: ar });
  const [url] = falImages(data);
  if (!url) throw new Error("no image");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const f = await fitToAspect(Buffer.from(await res.arrayBuffer()), ar);
  return f ? saveResult(userId, jobId, f, "image/jpeg", "jpg") : (await saveFromUrl(userId, jobId, url)).path;
}

const SIZE: Record<string, [number, number]> = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };

/** Some models ignore the aspect ratio. This makes every drawing exactly the video's shape (smart crop around the subject), so it fills the whole frame. */
async function fitToAspect(bytes: ArrayBuffer | Buffer | Uint8Array | Blob, ar: string): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    const src = bytes instanceof Blob ? Buffer.from(await bytes.arrayBuffer()) : Buffer.from(bytes as ArrayBuffer);
    const [w, h] = SIZE[ar] ?? SIZE["9:16"];
    // a model sometimes draws a square picture inside a tall canvas with flat (even gradient) bars above/below and a hard edge: cut them off first
    let img = sharp(src).rotate();
    try {
      const base = await sharp(src).rotate().toBuffer();
      const bm = await sharp(base).metadata();
      const W = 96, H = Math.max(40, Math.round((W * (bm.height ?? 1)) / (bm.width ?? 1)));
      const raw = await sharp(base).resize(W, H, { fit: "fill" }).greyscale().raw().toBuffer();
      const mean: number[] = [], sd: number[] = [];
      for (let y = 0; y < H; y++) {
        let sum = 0, sq = 0;
        for (let x = 0; x < W; x++) { const v = raw[y * W + x]; sum += v; sq += v * v; }
        const m = sum / W; mean.push(m); sd.push(Math.sqrt(Math.max(0, sq / W - m * m)));
      }
      const flat = (y: number) => sd[y] < 9;
      let top = 0; while (top < H * 0.45 && flat(top)) top++;
      let bot = H; while (bot > H * 0.55 && flat(bot - 1)) bot--;
      // only trust a bar that ends in a hard edge (a real jump in brightness), not a plain sky
      const edgeTop = top > 2 && top < H && Math.abs(mean[Math.min(H - 1, top + 1)] - mean[top - 1]) > 14 ? top : 0;
      const edgeBot = bot < H - 2 && bot > 0 && Math.abs(mean[bot] - mean[Math.max(0, bot - 2)]) > 14 ? bot : H;
      if (edgeTop > 0 || edgeBot < H) {
        const k = (bm.height ?? H) / H;
        const y0 = Math.round(edgeTop * k), y1 = Math.round(edgeBot * k);
        if (y1 - y0 > (bm.height ?? 1) * 0.4) img = sharp(base).extract({ left: 0, top: y0, width: bm.width ?? 1, height: y1 - y0 });
      }
      if (edgeTop === 0 && edgeBot === H) {
        const t = await sharp(base).trim({ threshold: 22 }).toBuffer({ resolveWithObject: true });
        const keep = (t.info.width * t.info.height) / ((bm.width ?? 1) * (bm.height ?? 1));
        if (keep < 0.93 && keep > 0.35) img = sharp(t.data);
      }
    } catch { /* nothing to trim */ }
    return await img.resize({ width: w, height: h, fit: "cover", position: "attention", withoutEnlargement: false }).jpeg({ quality: 90 }).toBuffer();
  } catch (e) { console.error("fitToAspect", e); return null; }
}

/** Draws every "scene" graphic that has a prompt but no picture yet (max `limit`). */
export async function illustrateScenes<G extends { kind: string; prompt?: string; img?: string; style?: string }>(userId: string, jobId: string, graphics: G[], style: string | undefined, aspect: string, limit = 6) {
  const todo = graphics.filter((g) => g.kind === "scene" && g.prompt && !g.img).slice(0, limit);
  await Promise.all(todo.map(async (g) => {
    try { g.img = await illustrate(userId, jobId, g.prompt!, g.style || style, aspect); } catch (e) { console.error("illustrate", e); }
  }));
  return graphics.filter((g) => g.kind !== "scene" || g.img);
}
