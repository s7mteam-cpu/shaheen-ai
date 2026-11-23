import { createAdminClient } from "@/lib/supabase/admin";

/** Which engine makes the customers' «تصميم مبتكر» videos. Set by the admin (site_content key "free_engine"); until he switches it, the classic engine runs. */
export type FreeEngine = { engine: "classic" | "gemini"; model: string; plan: "full" | "scenes" | "text"; dailyCap: number; /** «مونتاج مبتكر»: the longest video a customer may upload, in minutes */ fxMaxMin: number; /** «عناصر ورا المتحدث»: offered to customers or not (it calls a paid matting service), and its extra price in feathers per minute */ fxBehind: boolean; fxBehindCost: number; /** «المراجعة النهائية بالفيديو»: a model watches the finished montage and a weak piece is made once more (more time and cost) */ fxReview: boolean; /** «صور مولّدة بالذكاء الاصطناعي» inside the montage: offered or not, and its extra price in feathers per minute */ fxImages: boolean; fxImagesCost: number; /** «مصدر Gemini»: AI Studio (prepaid credit) or Vertex AI (billed on the Google Cloud account) */ gemVia: "studio" | "vertex"; /** «موسيقى خلفية» in the montage (a paid music service): offered or not, and its extra price in feathers per minute */ fxMusic: boolean; fxMusicCost: number };
export const GEM_MODELS = ["gemini-3.8-flash", "gemini-4-neon"];
export const DEFAULT_ENGINE: FreeEngine = { engine: "classic", model: "gemini-4-neon", plan: "scenes", dailyCap: 6, fxMaxMin: 5, fxBehind: false, fxBehindCost: 10, fxReview: false, fxImages: false, fxImagesCost: 10, gemVia: "studio", fxMusic: false, fxMusicCost: 10 };

export function cleanEngine(raw: unknown): FreeEngine {
  const o = (raw ?? {}) as Record<string, unknown>;
  const cap = Number(o.dailyCap), fxm = Number(o.fxMaxMin), bc = Number(o.fxBehindCost), ic = Number(o.fxImagesCost), mc = Number(o.fxMusicCost);
  return {
    engine: o.engine === "gemini" ? "gemini" : "classic",
    model: GEM_MODELS.includes(String(o.model)) ? String(o.model) : DEFAULT_ENGINE.model,
    plan: o.plan === "full" || o.plan === "text" ? o.plan : "scenes",
    dailyCap: Number.isInteger(cap) && cap >= 1 && cap <= 100 ? cap : DEFAULT_ENGINE.dailyCap,
    fxMaxMin: Number.isInteger(fxm) && fxm >= 1 && fxm <= 30 ? fxm : DEFAULT_ENGINE.fxMaxMin,
    fxBehind: o.fxBehind === true || o.fxBehind === "on" || o.fxBehind === "true",
    fxImages: o.fxImages === true || o.fxImages === "on" || o.fxImages === "true",
    fxImagesCost: Number.isInteger(ic) && ic >= 0 && ic <= 1000 ? ic : DEFAULT_ENGINE.fxImagesCost,
    fxMusic: o.fxMusic === true || o.fxMusic === "on" || o.fxMusic === "true",
    fxMusicCost: Number.isInteger(mc) && mc >= 0 && mc <= 1000 ? mc : DEFAULT_ENGINE.fxMusicCost,
    gemVia: o.gemVia === "vertex" ? "vertex" : "studio",
    fxReview: o.fxReview === true || o.fxReview === "on" || o.fxReview === "true",
    fxBehindCost: Number.isInteger(bc) && bc >= 0 && bc <= 1000 ? bc : DEFAULT_ENGINE.fxBehindCost,
  };
}
export async function getFreeEngine(): Promise<FreeEngine> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "free_engine").maybeSingle();
  return cleanEngine(data?.value);
}
