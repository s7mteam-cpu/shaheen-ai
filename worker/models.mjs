// «النماذج»: the admin can point any built-in model name at a newer one from the admin panel (site_content key "models").
// The worker reads the same list (at most once every 30 seconds). A missing or broken list changes nothing.
import { createClient } from "@supabase/supabase-js";

const FAMILY = [
  [/^claude-/, /^claude-[a-z0-9.-]{2,60}$/],
  [/^(gemini|veo|imagen|lyria)-/, /^(gemini|veo|imagen|lyria)-[a-z0-9.-]{2,60}$/],
  [/^(eleven|scribe)_/, /^(eleven|scribe)_[a-z0-9_.]{2,60}$/],
  [/^fal-ai\//, /^fal-ai\/[a-z0-9._/-]{2,90}$/],
];
/** a replacement is used only when it is a clean model name of the SAME provider */
export function okReplacement(from, to) {
  if (typeof from !== "string" || typeof to !== "string" || !to || to === from || to.includes("..") || to.includes("//")) return false;
  const f = FAMILY.find(([head]) => head.test(from));
  return !!f && f[1].test(to);
}

let db = null, cache = { at: 0, map: {} };
async function load() {
  if (Date.now() - cache.at < 30_000) return cache.map;
  try {
    if (!db && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    if (!db) { cache = { at: Date.now(), map: {} }; return cache.map; }
    const { data } = await db.from("site_content").select("value").eq("key", "models").maybeSingle();
    const raw = data?.value?.map && typeof data.value.map === "object" ? data.value.map : {};
    cache = { at: Date.now(), map: Object.fromEntries(Object.entries(raw).filter(([k, v]) => okReplacement(k, v))) };
  } catch { cache = { at: Date.now(), map: cache.map }; }
  return cache.map;
}

/** the model to really call for a name written in the code (the same name when the admin did not change it) */
export async function modelFor(name) {
  if (!name || typeof name !== "string") return name;
  return (await load())[name] ?? name;
}
