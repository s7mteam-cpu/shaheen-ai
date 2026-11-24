// Gemini requests go through AI Studio (prepaid credit, GEMINI_API_KEY).
const STUDIO = "https://generativelanguage.googleapis.com/v1beta";

/** One Gemini request. Returns { res, via }: `res` is the fetch Response (ok or not). `body` is the JSON string. */
export async function geminiFetch({ model, method = "generateContent", sse = false, body, timeout = 240_000, studioKey }) {
  const key = studioKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY غير موجود بإعدادات Railway. أضفه هناك ثم أعد النشر.");
  const res = await fetch(`${STUDIO}/models/${encodeURIComponent(model)}:${method}${sse ? "?alt=sse" : ""}`, { method: "POST", signal: AbortSignal.timeout(timeout), headers: { "x-goog-api-key": key, "content-type": "application/json" }, body });
  return { res, via: "studio" };
}
