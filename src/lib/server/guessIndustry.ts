import { aiJson } from "@/lib/providers/text";
import { INDUSTRIES } from "@/design/industries";

/** The customer didn't pick a field: read it from what they wrote (cheap and quick). */
export async function guessIndustry(text: string): Promise<string | undefined> {
  const t = text.trim().slice(0, 1500);
  if (t.length < 5) return undefined;
  try {
    const r = await aiJson<{ id?: string }>(
      `Pick the business field this request belongs to. Answer JSON {"id": "..."} using one id from: ${INDUSTRIES.map((i) => `${i.id} (${i.label})`).join(", ")}. Use "other" if nothing fits.`,
      t, 60, { provider: "claude", model: "claude-haiku-5-5" });
    return INDUSTRIES.some((i) => i.id === r.id) && r.id !== "other" ? r.id : undefined;
  } catch { return undefined; }
}
