"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";

type Res = { ok?: string; error?: string } | undefined;

export async function saveExtraPricing(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("tools");
  if (!me) return { error: "غير مصرّح" };
  const n = (k: string, min: number, max: number, d: number) => { const r = Number(form.get(k)); return Number.isFinite(r) && form.get(k) !== "" ? Math.max(min, Math.min(max, r)) : d; };
  const value = { ai_clip_x: n("ai_clip_x", 1, 10, 2), pres_auto_units: Math.round(n("pres_auto_units", 1, 20, 2)), pres_image_cost: Math.round(n("pres_image_cost", 0, 500, 8)) };
  const { error } = await createAdminClient().from("site_content").upsert({ key: "pricing_extra", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "pricing_extra", undefined, `لقطات AI ×${value.ai_clip_x} · عرض تلقائي ×${value.pres_auto_units} · صور العرض ${value.pres_image_cost}`);
  revalidatePath("/admin/tools"); revalidatePath("/app", "layout");
  return { ok: "انحفظت ✓ تطبّق على الطلبات الجديدة." };
}
