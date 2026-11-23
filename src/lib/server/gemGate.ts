import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** «مصدر Gemini»: AI Studio (prepaid credit, GEMINI_API_KEY) or Vertex AI (billed on the Google Cloud account, VERTEX_API_KEY).
 *  The admin picks it in «إعدادات المحرك». Vertex is tried only when its key exists; any failure there falls back to AI Studio for the same request. */
const STUDIO = "https://generativelanguage.googleapis.com/v1beta";
let cache: { at: number; via: "studio" | "vertex" } = { at: 0, via: "studio" };
const cold = new Map<string, number>();

async function chosen() {
  if (!process.env.VERTEX_API_KEY) return "studio";
  if (Date.now() - cache.at < 30_000) return cache.via;
  try {
    const { data } = await createAdminClient().from("site_content").select("value").eq("key", "free_engine").maybeSingle();
    cache = { at: Date.now(), via: (data?.value as { gemVia?: string } | null)?.gemVia === "vertex" ? "vertex" : "studio" };
  } catch { cache = { at: Date.now(), via: cache.via }; }
  return cache.via;
}

export function vertexUrl(model: string, method: string) {
  const p = (process.env.VERTEX_PROJECT ?? "").trim(), loc = (process.env.VERTEX_LOCATION ?? "").trim() || "global";
  const scope = /^[a-z][a-z0-9-]{4,40}$/.test(p) && /^[a-z0-9-]{2,30}$/.test(loc) ? `projects/${p}/locations/${loc}/` : "";
  return `https://aiplatform.googleapis.com/v1/${scope}publishers/google/models/${encodeURIComponent(model)}:${method}`;
}

/** One Gemini request (generateContent). Returns the Response of the door that answered, and which door it was. */
export async function geminiFetch(model: string, body: string, timeout = 240_000): Promise<{ res: Response; via: "studio" | "vertex" }> {
  const send = (url: string, key: string) => fetch(url, { method: "POST", signal: AbortSignal.timeout(timeout), headers: { "x-goog-api-key": key, "content-type": "application/json" }, body });
  if ((await chosen()) === "vertex" && (cold.get(model) ?? 0) < Date.now()) {
    try {
      const res = await send(vertexUrl(model, "generateContent"), process.env.VERTEX_API_KEY!);
      if (res.ok) return { res, via: "vertex" };
      console.error("gemini via vertex", model, res.status, (await res.text()).replaceAll(process.env.VERTEX_API_KEY!, "***").slice(0, 200));
    } catch (e) { console.error("gemini via vertex", model, String((e as Error)?.message ?? e).slice(0, 120)); }
    cold.set(model, Date.now() + 10 * 60_000);
  }
  return { res: await send(`${STUDIO}/models/${encodeURIComponent(model)}:generateContent`, process.env.GEMINI_API_KEY ?? ""), via: "studio" };
}
