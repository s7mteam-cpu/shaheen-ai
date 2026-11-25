/** «تكلفة كل طلب»: prices the admin can edit (site_content key "ai_prices"). Tokens are priced per 1,000,000; ElevenLabs speech per 1,000 characters.
 *  The defaults are the providers' public list prices on 22 Nov 2026 where they were found; a model with no price shows its tokens with «بدون سعر». */
/** `unit` = dollars for one picture / one second of video or music (models that are not billed by tokens) */
export type ModelPrice = { in: number; out: number; cache?: number; unit?: number };
export type AiPrices = { models: Record<string, ModelPrice>; el_per_1k: number; feather_usd: number };

export const DEFAULT_PRICES: AiPrices = {
  models: {
    "claude-opus-5-5": { in: 4, out: 20, cache: 0.2 },
    "claude-sonnet-5-5": { in: 2, out: 10, cache: 0.1 },
    "claude-haiku-5-5": { in: 0.1, out: 0.5, cache: 0.01 },
    "claude-fable-5-2": { in: 10, out: 50, cache: 0.25 },
    "gemini-3.8-flash": { in: 0.75, out: 3.75 },
    "gemini-2.5-pro": { in: 1.25, out: 10 },
    "gemini-3-pro-image-preview": { in: 0, out: 0, unit: 0.134 },
    // v295: estimates, so these calls show a dollar amount instead of «بدون سعر» (edit them in «تكلفة كل طلب» once measured)
    "music": { in: 0, out: 0, unit: 0.003 }, // ElevenLabs music, per second (≈ 900 credits per minute of the plan)
    "veed/video-background-removal/fast": { in: 0, out: 0, unit: 0.015 }, // speaker cut-out for «عناصر وراء المتحدث», per second of video (fal lists $0.008–0.015 per 30 frames: measure it)
  },
  el_per_1k: 0,
  feather_usd: 0.04, // what one feather brings in on average over the six plans (52,000 feathers = 619 KWD ≈ 0.04 USD); the old plans were 0.195
};

export function cleanPrices(v: unknown): AiPrices {
  const o = (v && typeof v === "object" ? v : {}) as { models?: unknown; el_per_1k?: unknown; feather_usd?: unknown };
  const num = (x: unknown, max: number) => { const n = Number(x); return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : NaN; };
  const models: Record<string, ModelPrice> = { ...DEFAULT_PRICES.models };
  if (o.models && typeof o.models === "object") for (const [k, x] of Object.entries(o.models as Record<string, { in?: unknown; out?: unknown; cache?: unknown; unit?: unknown }>).slice(0, 80)) {
    if (!/^[a-z0-9._/-]{2,90}$/i.test(k) || !x) continue;
    const i = num(x.in, 1000), u = num(x.out, 1000), c = num(x.cache, 1000), un = num(x.unit, 1000);
    if (Number.isNaN(i) && Number.isNaN(u) && Number.isNaN(un)) continue;
    models[k] = { in: Number.isNaN(i) ? 0 : i, out: Number.isNaN(u) ? 0 : u, ...(Number.isNaN(c) ? {} : { cache: c }), ...(Number.isNaN(un) || un === 0 ? {} : { unit: un }) };
  }
  const el = num(o.el_per_1k, 100), f = num(o.feather_usd, 100);
  return { models, el_per_1k: Number.isNaN(el) ? DEFAULT_PRICES.el_per_1k : el, feather_usd: Number.isNaN(f) || f === 0 ? DEFAULT_PRICES.feather_usd : f };
}

export type UsageRow = { provider: string; model: string; input_tokens: number; output_tokens: number; cache_read: number; cache_write: number; units: number };
/** estimated dollars of one call; `known:false` when the model has no price yet */
export function costOf(r: UsageRow, p: AiPrices): { usd: number; known: boolean } {
  if (r.provider === "elevenlabs" && r.model !== "music") return { usd: (r.units / 1000) * p.el_per_1k, known: p.el_per_1k > 0 };
  const m = p.models[r.model];
  if (!m) return { usd: 0, known: false };
  // pictures, videos, music: billed per picture / per second
  if (r.input_tokens + r.output_tokens === 0 && r.units > 0) return m.unit ? { usd: r.units * m.unit, known: true } : { usd: 0, known: false };
  // a picture model logged with a few tokens (Gemini image): one call = one picture at its per-picture price
  if (m.in === 0 && m.out === 0) return m.unit ? { usd: (r.units > 0 ? r.units : 1) * m.unit, known: true } : { usd: 0, known: false };
  // Claude reports cached tokens beside input_tokens; Gemini counts them inside promptTokenCount
  const plain = r.provider === "google" ? Math.max(0, r.input_tokens - r.cache_read) : r.input_tokens;
  const cacheRate = m.cache ?? m.in * 0.1;
  return { usd: (plain * m.in + r.output_tokens * m.out + r.cache_read * cacheRate + r.cache_write * m.in * 1.25) / 1_000_000, known: true };
}
