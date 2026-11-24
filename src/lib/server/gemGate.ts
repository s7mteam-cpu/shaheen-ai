import "server-only";

/** Gemini requests go through AI Studio (prepaid credit, GEMINI_API_KEY). */
const STUDIO = "https://generativelanguage.googleapis.com/v1beta";

/** One Gemini request (generateContent). */
export async function geminiFetch(model: string, body: string, timeout = 240_000): Promise<{ res: Response; via: "studio" }> {
  const res = await fetch(`${STUDIO}/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", signal: AbortSignal.timeout(timeout), headers: { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "", "content-type": "application/json" }, body });
  return { res, via: "studio" };
}
