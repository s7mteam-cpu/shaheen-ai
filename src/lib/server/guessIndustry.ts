import { aiJson } from "@/lib/providers/text";
import { INDUSTRIES, customField } from "@/design/industries";

const cache = new Map<string, string | undefined>(); // same text → same field, no second call (resets with the server)

/** The customer didn't pick a field, or typed his own: find the CLOSEST field of the library (cheap and quick). It never gives up: some neighbour fits. */
export async function guessIndustry(text: string): Promise<string | undefined> {
  const t = text.trim().slice(0, 1500);
  if (t.length < 3) return undefined;
  if (cache.has(t)) return cache.get(t);
  try {
    const r = await aiJson<{ id?: string }>(
      `Find the field of this library that is CLOSEST to the business or request below (a related profession counts: a trainer or lecturer is education/coach/teacher, a surgeon is clinic, a car polisher is carwash). Answer JSON {"id": "..."} using one id from: ${INDUSTRIES.filter((i) => i.id !== "other").map((i) => `${i.id} (${i.label})`).join(", ")}. Always choose the nearest one.`,
      t, 60, { provider: "claude", model: "claude-haiku-5-5" });
    const id = INDUSTRIES.some((i) => i.id === r.id) && r.id !== "other" ? r.id : undefined;
    if (cache.size > 500) cache.clear();
    cache.set(t, id);
    return id;
  } catch { return undefined; }
}

/** The customer's «مجالك»: what he typed himself is read first and alone (the closest library field), then the request text as a fallback. */
export async function guessForKit(kitIndustry: string | null | undefined, text: string): Promise<string | undefined> {
  const own = customField(kitIndustry);
  return (own ? await guessIndustry(own) : undefined) ?? guessIndustry(text);
}
