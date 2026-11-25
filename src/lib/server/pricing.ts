import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Extra price knobs that don't belong to one tool row (admin → الأدوات والأسعار → «أسعار إضافية»). */
/** ai_image_cost: price of ONE AI picture added inside any tool (post, ad, presentation, design studio). pres_image_cost mirrors it. */
export type ExtraPricing = { ai_clip_x: number; pres_auto_units: number; pres_image_cost: number; ai_image_cost: number };
export const EXTRA_DEFAULTS: ExtraPricing = { ai_clip_x: 2, pres_auto_units: 2, pres_image_cost: 14, ai_image_cost: 14 };

export async function extraPricing(): Promise<ExtraPricing> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "pricing_extra").maybeSingle();
  const raw = (data?.value as Partial<ExtraPricing>) ?? {};
  // one knob: before v295 only pres_image_cost existed, so it is the fallback for the new one
  const v = { ...EXTRA_DEFAULTS, ...raw, ai_image_cost: raw.ai_image_cost ?? raw.pres_image_cost ?? EXTRA_DEFAULTS.ai_image_cost };
  const n = (x: number, d: number, min: number, max: number) => { const r = Number(x); return Number.isFinite(r) ? Math.max(min, Math.min(max, r)) : d; };
  return { ai_clip_x: n(v.ai_clip_x, 2, 1, 10), pres_auto_units: Math.round(n(v.pres_auto_units, 2, 1, 20)), pres_image_cost: Math.round(n(v.ai_image_cost, 14, 0, 500)), ai_image_cost: Math.round(n(v.ai_image_cost, 14, 0, 500)) };
}
