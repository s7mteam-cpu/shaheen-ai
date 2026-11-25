"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { SECTION_IDS, cleanToolSections } from "@/lib/toolSections";
import { recordPriceChanges } from "@/lib/server/priceHistory";

type Res = { ok?: string; error?: string } | undefined;

export async function saveExtraPricing(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("tools");
  if (!me) return { error: "غير مصرّح" };
  const n = (k: string, min: number, max: number, d: number) => { const r = Number(form.get(k)); return Number.isFinite(r) && form.get(k) !== "" ? Math.max(min, Math.min(max, r)) : d; };
  const value = { ai_clip_x: n("ai_clip_x", 1, 10, 2), pres_auto_units: Math.round(n("pres_auto_units", 1, 20, 2)), pres_image_cost: Math.round(n("ai_image_cost", 0, 500, 14)), ai_image_cost: Math.round(n("ai_image_cost", 0, 500, 14)) };
  const { error } = await createAdminClient().from("site_content").upsert({ key: "pricing_extra", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "pricing_extra", undefined, `لقطات AI ×${value.ai_clip_x} · عرض تلقائي ×${value.pres_auto_units} · صورة بالذكاء الاصطناعي ${value.ai_image_cost}`);
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

/** «ملخص كل أداة»: our real dollar cost per unit, the price and the edit price of every tool, saved in one go. */
export async function savePricingSummary(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("tools");
  if (!me) return { error: "غير مصرّح" };
  const admin = createAdminClient();
  const num = (k: string) => { const raw = form.get(k); if (raw === null || raw === "") return null; const r = Number(raw); return Number.isFinite(r) && r >= 0 ? r : null; };
  const { data: tools } = await admin.from("tools").select("id,name,credit_cost,edit_cost");
  let changed = 0;
  const costs: Record<string, number> = {};
  for (const t of tools ?? []) {
    const c = num(`cost:${t.id}`); if (c !== null) costs[t.id] = Math.min(1000, c);
    const price = num(`price:${t.id}`), edit = num(`edit:${t.id}`);
    const patch: { credit_cost?: number; edit_cost?: number } = {};
    if (price !== null && Math.round(price) !== t.credit_cost) patch.credit_cost = Math.min(100000, Math.round(price));
    if (edit !== null && Math.round(edit) !== t.edit_cost) patch.edit_cost = Math.min(100000, Math.round(edit));
    if (!Object.keys(patch).length) continue;
    const { error } = await admin.from("tools").update(patch).eq("id", t.id);
    if (!error) { await recordPriceChanges("tool", t.id, t.name, t, patch, me.email); changed++; }
  }
  const rish = num("rish");
  const value = { rish: rish && rish > 0 ? Math.min(1, rish) : 0.01, costs };
  const { error } = await admin.from("site_content").upsert({ key: "tool_costs", value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت التكاليف." };
  await audit(me, "tool_costs", undefined, `ملخص التسعير: ${changed} أداة تغيّر سعرها · تكلفة الريشة ${value.rish}$`);
  revalidatePath("/admin/tools"); revalidatePath("/admin/tools/summary"); revalidatePath("/app", "layout");
  return { ok: `انحفظت ✓ (${changed} أداة تغيّرت) تطبّق على الطلبات الجديدة.` };
}
