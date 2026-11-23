// «مصدر Gemini»: the same Gemini models can be called through two Google doors:
//   • AI Studio (generativelanguage.googleapis.com, key GEMINI_API_KEY): prepaid credit.
//   • Vertex AI (aiplatform.googleapis.com, key VERTEX_API_KEY): billed on the Google Cloud account.
// The admin picks the door in «إعدادات المحرك» (site_content "free_engine".gemVia). Vertex is only tried when its key exists,
// and any failure there falls back to AI Studio for the same request, so switching can never stop a job.
import { createClient } from "@supabase/supabase-js";

const STUDIO = "https://generativelanguage.googleapis.com/v1beta";
let db = null, cache = { at: 0, via: "studio" };
const cold = new Map(); // model → time until which Vertex is skipped after it failed (no double waiting on every request)

async function chosen() {
  if (!process.env.VERTEX_API_KEY) return "studio";
  if (Date.now() - cache.at < 30_000) return cache.via;
  try {
    if (!db && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data } = db ? await db.from("site_content").select("value").eq("key", "free_engine").maybeSingle() : { data: null };
    cache = { at: Date.now(), via: data?.value?.gemVia === "vertex" ? "vertex" : "studio" };
  } catch { cache = { at: Date.now(), via: cache.via }; }
  return cache.via;
}

export function vertexUrl(model, method, sse) {
  const p = String(process.env.VERTEX_PROJECT ?? "").trim(), loc = String(process.env.VERTEX_LOCATION ?? "").trim() || "global";
  const scope = /^[a-z][a-z0-9-]{4,40}$/.test(p) && /^[a-z0-9-]{2,30}$/.test(loc) ? `projects/${p}/locations/${loc}/` : "";
  return `https://aiplatform.googleapis.com/v1/${scope}publishers/google/models/${encodeURIComponent(model)}:${method}${sse ? "?alt=sse" : ""}`;
}

/** One Gemini request. Returns { res, via }: `res` is the fetch Response (ok or not) from the door that answered. `body` is the JSON string, the same for both doors. */
export async function geminiFetch({ model, method = "generateContent", sse = false, body, timeout = 240_000, studioKey }) {
  const send = (url, key) => fetch(url, { method: "POST", signal: AbortSignal.timeout(timeout), headers: { "x-goog-api-key": key, "content-type": "application/json" }, body });
  if ((await chosen()) === "vertex" && (cold.get(model) ?? 0) < Date.now()) {
    try {
      const res = await send(vertexUrl(model, method, sse), process.env.VERTEX_API_KEY);
      if (res.ok) return { res, via: "vertex" };
      console.error("gemini via vertex", model, res.status, (await res.text()).replaceAll(process.env.VERTEX_API_KEY, "***").slice(0, 200));
    } catch (e) { console.error("gemini via vertex", model, String(e?.cause?.code ?? e?.message ?? e).slice(0, 120)); }
    cold.set(model, Date.now() + 10 * 60_000);
  }
  const key = studioKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY غير موجود بإعدادات Railway. أضفه هناك ثم أعد النشر.");
  return { res: await send(`${STUDIO}/models/${encodeURIComponent(model)}:${method}${sse ? "?alt=sse" : ""}`, key), via: "studio" };
}
