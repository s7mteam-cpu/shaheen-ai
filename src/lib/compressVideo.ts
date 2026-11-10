// Shrinks big phone videos in the browser before upload: 1080p H.264, high quality.
// Faster uploads on mobile data and under the storage file limit. Falls back to the original on any problem.
"use client";

const BIG = 40 * 1024 * 1024; // only touch files above 40 MB, or above 1080p

export async function compressVideo(file: File, onProgress?: (p: number) => void): Promise<File> {
  if (typeof window === "undefined" || typeof VideoEncoder === "undefined") return file;
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return file;
    const w = track.displayWidth, h = track.displayHeight;
    if (file.size <= BIG && Math.min(w, h) <= 1080) return file;
    const portrait = h >= w;
    const short = Math.min(1080, Math.min(w, h));
    const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input, output, showWarnings: false,
      video: { ...(portrait ? { width: even(short) } : { height: even(short) }), codec: "avc", quality: mb.QUALITY_HIGH, forceTranscode: true },
      audio: { codec: "aac", quality: mb.QUALITY_HIGH },
    });
    if (!conversion.isValid) return file;
    conversion.onProgress = (p) => onProgress?.(Math.round(p * 100));
    await conversion.execute();
    const buf = output.target.buffer;
    if (!buf || buf.byteLength >= file.size) return file;
    return new File([buf], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });
  } catch (e) {
    console.warn("video compression skipped", e);
    return file;
  }
}
