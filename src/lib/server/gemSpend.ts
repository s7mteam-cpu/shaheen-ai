import type { SupabaseClient } from "@supabase/supabase-js";

/** USD per million tokens [input, output (thinking tokens count as output)]. Models without a known price are only counted in tokens. */
const PRICE: Record<string, [number, number]> = { "gemini-4-neon": [3, 15] };
type Usage = { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | null;

/** What the Gemini engine cost since `since`, from the token counts saved on every finished job (new videos and AI edits). */
export async function gemSpend(admin: SupabaseClient, since: string) {
  const { data } = await admin.from("jobs").select("input").eq("tool_id", "free-motion").eq("status", "done").gte("created_at", since).contains("input", { engine: "gemini" }).limit(2000);
  let videos = 0, edits = 0, inTok = 0, outTok = 0, thoughtTok = 0, usd = 0, unpriced = 0;
  for (const j of data ?? []) {
    const g = (j.input as { gem?: { usage?: Usage[]; model?: string | null; edited?: boolean } }).gem;
    if (!g) continue;
    const us = (g.usage ?? []).filter(Boolean) as NonNull[];
    if (g.edited) { if (us.length) edits++; } else videos++;
    let i = 0, o = 0;
    for (const u of us) { i += u.promptTokenCount ?? 0; o += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0); thoughtTok += u.thoughtsTokenCount ?? 0; }
    inTok += i; outTok += o;
    const pr = PRICE[String(g.model ?? "gemini-4-neon")];
    if (pr) usd += (i * pr[0] + o * pr[1]) / 1e6; else if (us.length) unpriced++;
  }
  return { videos, edits, inTok, outTok, thoughtTok, usd, unpriced };
}
type NonNull = NonNullable<Usage>;
