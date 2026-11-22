import "server-only";
import { noteUsage } from "@/lib/server/usageCtx";
import { modelFor } from "@/lib/server/models";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

type FalImage = { url: string };

/** Wait for the result (used for images, ~5–40 s). */
export async function falRun<T = Record<string, unknown>>(model: string, input: Record<string, unknown>) {
  model = await modelFor(model);
  const r = await fal.subscribe(model, { input, logs: false });
  noteUsage({ provider: "fal", model, source: "صور وفيديو fal", units: Math.max(1, Number(input.num_images) || 1) });
  return r.data as T;
}

/** Queue a long job (videos); fal calls our webhook when it finishes. */
export async function falQueue(model: string, input: Record<string, unknown>, webhookUrl: string) {
  model = await modelFor(model);
  const { request_id } = await fal.queue.submit(model, { input, webhookUrl });
  noteUsage({ provider: "fal", model, source: "فيديو fal", units: 1 });
  return request_id;
}

export function falImages(data: unknown): string[] {
  const d = data as { images?: FalImage[]; image?: FalImage };
  return (d.images ?? (d.image ? [d.image] : [])).map((i) => i.url);
}

export function falVideo(data: unknown): string | null {
  const d = data as { video?: { url: string }; videos?: { url: string }[] };
  return d.video?.url ?? d.videos?.[0]?.url ?? null;
}
