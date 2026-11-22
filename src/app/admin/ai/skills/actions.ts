"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { SKILL_TOOLS, cleanSkills } from "@/lib/aiSkills";

type Res = { ok?: string; error?: string } | undefined;

/** saves (or clears, when the text is empty) the guidance of ONE tool */
export async function saveSkill(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai");
  if (!me) return { error: "غير مصرّح" };
  const id = String(form.get("tool") ?? "");
  if (!(SKILL_TOOLS as readonly string[]).includes(id)) return { error: "أداة غير معروفة." };
  const admin = createAdminClient();
  const { data } = await admin.from("admin_secrets").select("value").eq("key", "ai_skills").maybeSingle();
  const all = cleanSkills(data?.value);
  const next = cleanSkills({ [id]: { text: String(form.get("text") ?? ""), on: form.get("on") === "on", at: new Date().toISOString() } });
  if (next[id]) all[id] = next[id]; else delete all[id];
  const { error } = await admin.from("admin_secrets").upsert({ key: "ai_skills", value: all, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "ai_skill", undefined, `${id}: ${next[id] ? `${next[id].text.length} حرف${next[id].on ? "" : " (موقفة)"}` : "انمسحت"}`);
  revalidatePath("/admin/ai/skills");
  return { ok: next[id] ? "انحفظت ✓ تنطبق على الطلبات الجديدة خلال نص دقيقة." : "انمسحت ✓ رجعت الأداة لتعليماتها الأصلية." };
}
