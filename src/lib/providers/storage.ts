import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Save bytes into the private "results" bucket under the user's folder. Returns the storage path. */
export async function saveResult(userId: string, jobId: string, data: ArrayBuffer | Blob | Buffer, contentType: string, ext: string) {
  const admin = createAdminClient();
  const path = `${userId}/${jobId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("results").upload(path, data, { contentType, upsert: false });
  if (error) throw new Error(`storage: ${error.message}`);
  return path;
}

/** Download a provider URL and keep our own copy (provider links expire). */
export async function saveFromUrl(userId: string, jobId: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const type = res.headers.get("content-type") || "application/octet-stream";
  const ext = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : type.includes("webp") ? "webp"
    : type.includes("mp4") ? "mp4" : type.includes("mpeg") ? "mp3" : type.includes("wav") ? "wav" : url.split("?")[0].split(".").pop() || "bin";
  return { path: await saveResult(userId, jobId, await res.blob(), type, ext), type };
}

/** Short-lived links so the provider can read the user's uploads. */
export async function signedUploadUrls(paths: string[], seconds = 3600) {
  if (!paths.length) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("uploads").createSignedUrls(paths, seconds);
  if (error) throw new Error(`storage: ${error.message}`);
  return data.map((d) => d.signedUrl ?? "").filter(Boolean);
}

export async function signedResultUrls(paths: string[], seconds = 60 * 60 * 6) {
  if (!paths.length) return [] as string[];
  const admin = createAdminClient();
  const { data } = await admin.storage.from("results").createSignedUrls(paths, seconds);
  return (data ?? []).map((d) => d.signedUrl ?? "");
}
