import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveResult } from "@/lib/providers/storage";

export type PhotoIn = { path: string; bucket?: "uploads" | "results"; label?: string };
export type PhotoOut = { img: string; label: string };

const SIZE: Record<string, [number, number]> = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080], "4:5": [1080, 1350] };

/** Cleans the customer's own photos (product, dish, property…) list from the request: max 6, only their own files. */
export function cleanPhotos(raw: unknown, userId: string): PhotoIn[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 6).flatMap((x: Record<string, unknown>) => {
    const path = typeof x?.path === "string" ? x.path : "";
    if (!path.startsWith(`${userId}/`) || path.includes("..") || !/^[\w-]+\/[\w./-]+$/.test(path)) return [];
    return [{ path, bucket: x?.bucket === "results" ? "results" as const : "uploads" as const, label: String(x?.label ?? "").replace(/\s+/g, " ").trim().slice(0, 60) }];
  });
}

/** Brings the photos into the "results" bucket in the video's exact shape (smart crop around the subject), so the studio and the export use them like any other scene picture. */
export async function importPhotos(userId: string, jobId: string, photos: PhotoIn[], aspect: string): Promise<(PhotoOut | null)[]> {
  const admin = createAdminClient();
  const [w, h] = SIZE[aspect] ?? SIZE["9:16"];
  return Promise.all(photos.map(async (p) => {
    try {
      const { data, error } = await admin.storage.from(p.bucket ?? "uploads").download(p.path);
      if (error || !data) return null;
      const sharp = (await import("sharp")).default;
      const src = await sharp(Buffer.from(await data.arrayBuffer())).rotate().toBuffer();
      const meta = await sharp(src).metadata();
      const ratio = (meta.width ?? 1) / (meta.height ?? 1), want = w / h;
      let buf: Buffer;
      if (Math.abs(ratio / want - 1) < 0.18) buf = await sharp(src).resize({ width: w, height: h, fit: "cover", position: "attention" }).jpeg({ quality: 90 }).toBuffer();
      else { // different shape: the whole photo stays visible over a blurred copy of itself (nothing of the product is cut)
        const bg = await sharp(src).resize({ width: w, height: h, fit: "cover" }).blur(28).modulate({ brightness: 0.75 }).toBuffer();
        const fg = await sharp(src).resize({ width: w, height: h, fit: "inside" }).toBuffer();
        buf = await sharp(bg).composite([{ input: fg, gravity: "centre" }]).jpeg({ quality: 90 }).toBuffer();
      }
      return { img: await saveResult(userId, jobId, buf, "image/jpeg", "jpg"), label: p.label || "" };
    } catch (e) { console.error("importPhotos", e); return null; }
  }));
}

export type ShotOut = { img: string; label: string; dev: "phone" | "desktop"; w: number; h: number };

/** Screenshots of pages inside the customer's own site (behind his login): brought into "results" whole (never cropped), with the size the scene needs to scroll through them. */
export async function importShots(userId: string, jobId: string, photos: PhotoIn[]): Promise<(ShotOut | null)[]> {
  const admin = createAdminClient();
  return Promise.all(photos.map(async (p) => {
    try {
      const { data, error } = await admin.storage.from(p.bucket ?? "uploads").download(p.path);
      if (error || !data) return null;
      const sharp = (await import("sharp")).default;
      const src = await sharp(Buffer.from(await data.arrayBuffer())).rotate().toBuffer();
      const meta = await sharp(src).metadata();
      const iw = meta.width ?? 0, ih = meta.height ?? 0;
      if (iw < 200 || ih < 200) return null;
      const phone = iw <= 900 || (iw < 1000 && iw / ih < 0.8); // phone screenshots are narrow; computer ones are wide
      let width = Math.min(iw, phone ? 780 : 1920);
      if ((ih * width) / iw > 12000) width = Math.floor((12000 * iw) / ih);
      const buf = await sharp(src).resize({ width }).jpeg({ quality: 88 }).toBuffer();
      const out = await sharp(buf).metadata();
      const cw = phone ? 390 : 1280;
      return { img: await saveResult(userId, jobId, buf, "image/jpeg", "jpg"), label: p.label || "", dev: phone ? "phone" as const : "desktop" as const, w: cw, h: Math.round(((out.height ?? ih) * cw) / (out.width ?? width)) };
    } catch (e) { console.error("importShots", e); return null; }
  }));
}
