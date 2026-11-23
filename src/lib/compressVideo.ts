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
    // The shrunk copy is used ONLY when its picture is the same picture: same start, same length, nearly the same number of frames.
    // Some browsers' decoders drop the first seconds of a phone video (HEVC): the copy then plays with the picture ahead of the sound. Such a copy is thrown away and the original is kept.
    try {
      const check = new mb.Input({ source: new mb.BlobSource(new Blob([buf])), formats: mb.ALL_FORMATS });
      const out = await check.getPrimaryVideoTrack();
      if (!out) return file;
      const [d0, d1, f0, f1, n0, n1] = await Promise.all([track.computeDuration(), out.computeDuration(), track.getFirstTimestamp(), out.getFirstTimestamp(), track.computePacketStats(), out.computePacketStats()]);
      const sameStart = Math.abs(f1 - f0) <= 0.12, sameEnd = Math.abs(d1 - d0) <= 0.3, sameFrames = n1.packetCount >= n0.packetCount * 0.97;
      if (!sameStart || !sameEnd || !sameFrames) { console.warn("video compression rejected: the copy does not match the original", { d0, d1, f0, f1, n0: n0.packetCount, n1: n1.packetCount }); return file; }
      const a0 = await input.getPrimaryAudioTrack(), a1 = await check.getPrimaryAudioTrack();
      if (a0 && (!a1 || Math.abs((await a1.computeDuration()) - (await a0.computeDuration())) > 0.3)) { console.warn("video compression rejected: the sound does not match"); return file; }
    } catch (e) { console.warn("video compression could not be verified, the original is kept", e); return file; }
    return new File([buf], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });
  } catch (e) {
    console.warn("video compression skipped", e);
    return file;
  }
}
