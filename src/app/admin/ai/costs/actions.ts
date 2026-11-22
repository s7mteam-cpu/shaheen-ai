"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { cleanPrices } from "@/lib/aiPrices";

type Res = { ok?: string; error?: string } | undefined;

export async function savePrices(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai");
  if (!me) return { error: "غير مصرّح" };
  const models: Record<string, { in: unknown; out: unknown; unit: unknown }> = {};
  for (const [k, v] of form.entries()) {
    const m = /^(in|out|unit):(.+)$/.exec(k); if (!m || v === "") continue;
    (models[m[2]] ??= { in: "x", out: "x", unit: "x" })[m[1] as "in" | "out" | "unit"] = v;
  }
  const value = cleanPrices({ models, el_per_1k: form.get("el_per_1k"), feather_usd: form.get("feather_usd") });
  const { error } = await createAdminClient().from("site_content").upsert({ key: "ai_prices", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "ai_prices", undefined, `${Object.keys(value.models).length} نموذج`);
  revalidatePath("/admin/ai/costs");
  return { ok: "انحفظت ✓" };
}
