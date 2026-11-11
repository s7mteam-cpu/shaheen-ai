import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { saveFromUrl, saveResult } from "@/lib/providers/storage";
import { config } from "@/lib/tools/run";
import { stylePrompt } from "@/remotion/styles";

/** One AI-drawn scene for a video, in the chosen illustration style. Returns the storage path in "results". */
export async function illustrate(userId: string, jobId: string, prompt: string, style: string | undefined, aspect: string) {
  const { provider, model } = await config("image");
  const ar = aspect === "16:9" ? "16:9" : aspect === "1:1" ? "1:1" : "9:16";
  const full = `${prompt}. Style: ${stylePrompt(style)}. Composition leaves calm empty space at the top for a title. Absolutely no text, no letters, no numbers, no captions, no logos, no watermark.`;
  if (provider === "google") {
    const r = await geminiImage(model, full, [], ar);
    return saveResult(userId, jobId, r.bytes, r.type, r.type.includes("png") ? "png" : "jpg");
  }
  const data = await falRun(model.replace(/\/edit$/, ""), { prompt: full, num_images: 1, aspect_ratio: ar });
  const [url] = falImages(data);
  if (!url) throw new Error("no image");
  return (await saveFromUrl(userId, jobId, url)).path;
}

/** Draws every "scene" graphic that has a prompt but no picture yet (max `limit`). */
export async function illustrateScenes<G extends { kind: string; prompt?: string; img?: string; style?: string }>(userId: string, jobId: string, graphics: G[], style: string | undefined, aspect: string, limit = 6) {
  const todo = graphics.filter((g) => g.kind === "scene" && g.prompt && !g.img).slice(0, limit);
  await Promise.all(todo.map(async (g) => {
    try { g.img = await illustrate(userId, jobId, g.prompt!, g.style || style, aspect); } catch (e) { console.error("illustrate", e); }
  }));
  return graphics.filter((g) => g.kind !== "scene" || g.img);
}
