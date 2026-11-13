"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";

type Res = { ok?: string; error?: string } | undefined;

/** «التجربة المجانية» settings: on/off, credits, hours, trials per network a day. */
export async function saveTrial(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("plans");
  if (!me) return { error: "غير مصرّح" };
  const n = (k: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(form.get(k)) || 0)));
  const value = { enabled: form.get("enabled") === "on", credits: n("credits", 1, 1000), hours: n("hours", 1, 720), per_ip_day: n("per_ip_day", 1, 50) };
  const { error } = await createAdminClient().from("site_content").upsert({ key: "trial", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "trial_settings", undefined, `${value.enabled ? "مفعّلة" : "موقوفة"} · ${value.credits} ريشة · ${value.hours} ساعة · ${value.per_ip_day} لكل شبكة باليوم`);
  revalidatePath("/admin/plans"); revalidatePath("/app", "layout");
  return { ok: "انحفظت ✓ التغيير يطبّق على التجارب الجديدة." };
}
