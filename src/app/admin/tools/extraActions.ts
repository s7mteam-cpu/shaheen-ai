"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { SECTION_IDS, cleanToolSections } from "@/lib/toolSections";

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

/** «أقسام صفحة الأدوات»: which section every tool is shown in, and the two-line text of each section */
export async function saveToolSections(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("tools");
  if (!me) return { error: "غير مصرّح" };
  const map: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("sec:")) map[k.slice(4)] = String(v);
  const texts = Object.fromEntries(SECTION_IDS.map((id) => [id, { title: form.get(`title:${id}`), desc: form.get(`desc:${id}`) }]));
  const value = cleanToolSections({ map, texts });
  const { error } = await createAdminClient().from("site_content").upsert({ key: "tool_sections", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "tool_sections", undefined, SECTION_IDS.map((id) => `${value.texts[id].title}: ${Object.values(value.map).filter((x) => x === id).length}`).join(" · "));
  revalidatePath("/admin/tools"); revalidatePath("/app", "layout");
  return { ok: "انحفظت ✓" };
}
