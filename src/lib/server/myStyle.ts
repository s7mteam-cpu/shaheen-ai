import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** «أسلوبي» (هويتي): the customer's taste in words, up to 3 of his reference pictures and one reference video. All paths are his own files in "uploads".
 *  Read by the server for the innovative tools, never taken from the request. */
export type MyStyle = { note: string; refs: string[]; video: string | null };
export async function loadStyle(userId: string): Promise<MyStyle | null> {
  const admin = createAdminClient();
  const own = (p: unknown): p is string => typeof p === "string" && p.startsWith(`${userId}/`) && !p.includes("..");
  let row: { style_note?: string | null; style_refs?: string[] | null; style_video?: string | null } | null = null;
  const full = await admin.from("brand_kits").select("style_note,style_refs,style_video").eq("user_id", userId).maybeSingle();
  if (!full.error) row = full.data;
  else row = (await admin.from("brand_kits").select("style_refs").eq("user_id", userId).maybeSingle()).data; // before SQL 0067
  if (!row) return null;
  const note = String(row.style_note ?? "").replace(/[<>]/g, "").trim().slice(0, 500);
  const refs = ((row.style_refs ?? []) as unknown[]).filter(own).slice(0, 3);
  const video = own(row.style_video) ? row.style_video : null;
  return note || refs.length || video ? { note, refs, video } : null;
}
