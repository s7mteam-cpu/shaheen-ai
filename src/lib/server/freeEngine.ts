import { createAdminClient } from "@/lib/supabase/admin";

/** Which engine makes the customers' «تصميم مبتكر» videos. Set by the admin (site_content key "free_engine"); until he switches it, the classic engine runs. */
export type FreeEngine = { engine: "classic" | "gemini"; model: string; plan: "full" | "scenes" | "text"; dailyCap: number; /** «مونتاج مبتكر»: the longest video a customer may upload, in minutes */ fxMaxMin: number; /** «عناصر ورا المتحدث»: offered to customers or not (it calls a paid matting service), and its extra price in feathers per minute */ fxBehind: boolean; fxBehindCost: number };
export const GEM_MODELS = ["gemini-3.8-flash", "gemini-4-neon"];
export const DEFAULT_ENGINE: FreeEngine = { engine: "classic", model: "gemini-4-neon", plan: "scenes", dailyCap: 6, fxMaxMin: 5, fxBehind: false, fxBehindCost: 10 };

export function cleanEngine(raw: unknown): FreeEngine {
  const o = (raw ?? {}) as Record<string, unknown>;
  const cap = Number(o.dailyCap), fxm = Number(o.fxMaxMin), bc = Number(o.fxBehindCost);
  return {
    engine: o.engine === "gemini" ? "gemini" : "classic",
    model: GEM_MODELS.includes(String(o.model)) ? String(o.model) : DEFAULT_ENGINE.model,
    plan: o.plan === "full" || o.plan === "text" ? o.plan : "scenes",
    dailyCap: Number.isInteger(cap) && cap >= 1 && cap <= 100 ? cap : DEFAULT_ENGINE.dailyCap,
    fxMaxMin: Number.isInteger(fxm) && fxm >= 1 && fxm <= 30 ? fxm : DEFAULT_ENGINE.fxMaxMin,
    fxBehind: o.fxBehind === true || o.fxBehind === "on" || o.fxBehind === "true",
    fxBehindCost: Number.isInteger(bc) && bc >= 0 && bc <= 1000 ? bc : DEFAULT_ENGINE.fxBehindCost,
  };
}
export async function getFreeEngine(): Promise<FreeEngine> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "free_engine").maybeSingle();
  return cleanEngine(data?.value);
}
