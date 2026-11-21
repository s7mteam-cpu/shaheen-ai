import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanModelMap } from "@/lib/models";

let cache: { at: number; map: Record<string, string> } = { at: 0, map: {} };

/** The admin's choices from «النماذج» (read at most once every 30 seconds per server). */
export async function modelMap(): Promise<Record<string, string>> {
  if (Date.now() - cache.at < 30_000) return cache.map;
  try {
    const { data } = await createAdminClient().from("site_content").select("value").eq("key", "models").maybeSingle();
    cache = { at: Date.now(), map: cleanModelMap((data?.value as { map?: unknown } | null)?.map) };
  } catch { cache = { at: Date.now(), map: cache.map }; }
  return cache.map;
}
export const forgetModelMap = () => { cache = { at: 0, map: {} }; };

/** The model to really call for a name written in the code (the same name when the admin did not change it). */
export async function modelFor(name: string): Promise<string> {
  if (!name) return name;
  return (await modelMap())[name] ?? name;
}

/** A replacement that the provider refused (unknown model…) is remembered, so «النماذج» can show it. Never throws. */
export async function noteModelFailure(from: string, to: string, why: string) {
  try {
    await createAdminClient().from("site_content").upsert({ key: "models_last_error", value: { at: new Date().toISOString(), from, to, why: why.slice(0, 200) }, updated_at: new Date().toISOString() });
  } catch { /* nothing */ }
}
export const looksLikeBadModel = (status: number, body: string) => (status === 404 || status === 400) && /model/i.test(body);
