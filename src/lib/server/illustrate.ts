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
    return await sharp(src).rotate().resize({ width: w, height: h, fit: "cover", position: "attention", withoutEnlargement: false }).jpeg({ quality: 90 }).toBuffer();
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
